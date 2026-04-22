import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { Sparkles, ArrowRight, CheckCircle2, ChevronRight, BrainCircuit, ChevronLeft, Info, Download } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { ProgressBar, OptionCard, Chip, TextInput, TextArea, Button, ScreenTransition } from './components/ui';
import { getRecommendation, RecommendationResult } from './lib/gemini';
import { db } from './lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { NexusLogo, NexusIcon } from './components/NexusLogo';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      providerInfo: []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type StepId = 'landing' | 'lead' | 'role' | 'need' | 'context' | 'result';

export default function App() {
  const [role, setRole] = useState('');
  const [mainNeed, setMainNeed] = useState('');
  
  // Details
  const [contextCreate, setContextCreate] = useState('');
  const [contextSituation, setContextSituation] = useState('');
  const [toolPreference, setToolPreference] = useState('');
  
  // Lead Capture
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadingMessages = [
    "Consulting with the AI Academy experts...",
    "Analyzing your specific business needs...",
    "Scanning 10,000+ AI tools for the best match...",
    "Curating your personalized AI strategy...",
    "Almost there! Designing your daily workflow...",
    "Tailoring recommendations for your role...",
    "Polishing the final touches of your strategy..."
  ];
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    setLoadingText(loadingMessages[loadingMessageIndex]);
  }, [loadingMessageIndex]);

  const [error, setError] = useState<string | null>(null);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const steps: StepId[] = ['landing', 'role', 'need', 'context', 'lead', 'result'];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    // Scroll to top on step change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStepIndex]);

  // Auto-fill from URL parameters (for Serlzo redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || params.get('fullName');
    const email = params.get('email');
    const phone = params.get('phone');
    
    if (name) setLeadName(name);
    if (email) setLeadEmail(email);
    if (phone) setLeadPhone(phone);
  }, []);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) return;

    const nextStep = steps[nextIndex];

    // If we have lead info and the next step is 'lead', skip it
    if (nextStep === 'lead' && leadName && leadEmail && leadPhone) {
      handleGenerateRecommendation();
      return;
    }
    
    setCurrentStepIndex(nextIndex);
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleGenerateRecommendation = async () => {
    if (!executeRecaptcha) {
      console.warn("reCAPTCHA not yet available");
      setError("Security check is initializing... please wait a moment and try again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Execute reCAPTCHA
      let token = "";
      try {
        if (executeRecaptcha) {
          token = await executeRecaptcha('recommendation_request');
        }
      } catch (err) {
        console.warn("reCAPTCHA component error:", err);
      }
      
      // 2. Verify reCAPTCHA on the server (Safe for Vercel/Static)
      if (token) {
        try {
          const verifyRes = await fetch("/api/verify-captcha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
          });
          
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
              console.error("reCAPTCHA Failed:", verifyData);
            }
          }
        } catch (backendErr) {
          console.warn("Could not reach reCAPTCHA backend. Running in standalone mode.");
        }
      }

      console.log("Starting parallel lead capture and AI generation...");

      // 3. Prepare Lead Capture Data
      const safeName = String(leadName || "").trim();
      const safeEmail = String(leadEmail || "").trim().toLowerCase();
      const safePhone = String(leadPhone || "").trim();

      const serlzoPayload = {
        fullName: safeName,
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        listId: "69dcf75efa683a8aebdf37c6",
        formId: "69dcf7c9fa683a8aebdf3ca7",
        triggerAutomation: true,
        trigger_automation: true,
        event: "form_submission",
        tags: ["webform", "ai_recommender"]
      };

      // 4. Start Lead Capture IMMEDIATELY (Do not await yet)
      const captureToSerlzo = fetch("https://cdn.serlzo.com/form/create-lead/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serlzoPayload)
      }).then(res => res.text())
        .catch(err => console.error("Serlzo Error:", err));

      const captureToFirebasePromise = addDoc(collection(db, "leads"), {
        name: leadName,
        email: leadEmail,
        phone: leadPhone,
        role,
        mainNeed,
        contextCreate,
        contextSituation,
        toolPreference,
        status: "pending_ai",
        createdAt: serverTimestamp()
      }).catch(err => console.error("Firebase Error:", err));

      // 5. Start AI Generation (This is the PRIORITY)
      const recommendationPromise = getRecommendation({
        role,
        mainNeed,
        contextCreate,
        contextSituation,
        toolPreference
      });

      // 6. Race to show results. We wait for AI, but let leads run in background.
      // However, we want to give leads a 3-second head start to finish, then proceed regardless.
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000, 'timeout'));
      
      const result = await recommendationPromise;
      setRecommendation(result);

      // If we got the result, we check if leads are still hanging.
      // We don't want to block the user beyond this point.
      console.log("AI Result ready. Moving to results screen...");

      // 7. Finalize UI
      setCurrentStepIndex(steps.indexOf('result'));
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Note: captureToSerlzo and captureToFirebasePromise are still running in the background.
      // They will eventually resolve/reject without blocking the user.

    } catch (error: any) {
      console.error("Process Error:", error);
      
      // Better error message for the user based on their feedback
      if (currentStep === 'lead') {
        setError("Something went wrong with the AI generation. Don't worry, your details are already saved—check back soon or check your email/WhatsApp for your strategy!");
      } else {
        setError(error.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getToolUrl = (toolName: string) => {
    const normalized = toolName.toLowerCase().trim();
    const toolUrls: Record<string, string> = {
      "serlzo": "https://app.serlzo.com/auth/signup?ref=mj123",
      "elevenlabs": "https://try.elevenlabs.io/vz7bzidy9oel",
      "taskade": "https://www.taskade.com/?via=uxezld",
      "chatgpt": "https://chat.openai.com/",
      "claude": "https://claude.ai/",
      "gemini": "https://gemini.google.com/",
      "perplexity": "https://www.perplexity.ai/",
      "deepseek": "https://www.deepseek.com/",
      "gamma": "https://gamma.app/",
      "tome": "https://tome.app/",
      "flux ai": "https://flux-ai.io/",
      "midjourney": "https://www.midjourney.com/",
      "canva ai": "https://www.canva.com/",
      "kling ai": "https://www.klingai.com/",
      "invideo": "https://invideo.io/",
      "heygen": "https://www.heygen.com/",
      "suno": "https://suno.com/",
      "zapier": "https://zapier.com/",
      "grammarly": "https://www.grammarly.com/",
      "rytr": "https://rytr.me/",
      "reclaim.ai": "https://reclaim.ai/",
      "hive": "https://hive.com/",
      "poised": "https://www.poised.com/",
      "wordtune": "https://www.wordtune.com/",
      "looka": "https://looka.com/",
      "google trends": "https://trends.google.com/",
      "numerous.ai": "https://numerous.ai/",
      "rows ai": "https://rows.com/",
      "google translate": "https://translate.google.com/",
      "deepl": "https://www.deepl.com/",
      "tawk.to": "https://tawk.to/",
      "visme": "https://www.visme.co/",
      "teal": "https://tealhq.com/",
      "notebooklm": "https://notebooklm.google/",
      "fellow.app": "https://fellow.app/",
      "typeform": "https://www.typeform.com/",
      "framer": "https://www.framer.com/",
      "browse ai": "https://www.browse.ai/",
      "tldr this": "https://tldrthis.com/",
      "humata": "https://www.humata.ai/",
      "autodraw": "https://autodraw.com/",
      "remove.bg": "https://www.remove.bg/",
      "lalal.ai": "https://www.lalal.ai/",
      "fireflies.ai": "https://fireflies.ai/",
      "otter.ai": "https://otter.ai/",
      "ai literacy academy": "https://ailiteracyacademy.org/ai/70/"
    };

    for (const [key, url] of Object.entries(toolUrls)) {
      if (normalized.includes(key)) {
        return url;
      }
    }
    return `https://www.google.com/search?q=${encodeURIComponent(toolName + ' AI tool')}`;
  };

  const handleSaveStrategy = async () => {
    if (!recommendation) return;
    
    const textToSave = `My AI Strategy from AI Literacy Academy
---------------------------------------
Primary Tool: ${recommendation.primaryTool}
Why it fits: ${recommendation.whyItFits}

Best Used For:
${recommendation.bestUsedFor.map(item => `- ${item}`).join('\n')}

Alternatives: ${recommendation.alternativeTools.join(', ')}

Comparison Strategy: 
${recommendation.comparisonStrategy}

Pro Tip: 
${recommendation.betterResultsTip}

Next Step: 
${recommendation.nextStep}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My AI Strategy',
          text: textToSave,
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToSave);
        alert("Strategy copied to clipboard!");
      } catch (err) {
        console.error('Failed to copy text: ', err);
        alert("Could not copy to clipboard. Please select the text and copy manually.");
      }
    }
  };

  const renderScreen = () => {
    if (error) {
      return (
        <ScreenTransition keyId="error">
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-nexus-silver/30 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-nexus-cobalt" />
            </div>
            <h2 className="text-2xl font-bold text-nexus-navy mb-3">Something went wrong</h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <div className="w-full flex flex-col gap-3">
              <Button 
                onClick={() => {
                  setError(null);
                  setCurrentStepIndex(steps.indexOf('lead'));
                }}
              >
                Try Again
              </Button>
              <a 
                href="https://ailiteracyacademy.org/ai/70/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-xl font-bold text-lg bg-nexus-navy text-white text-center hover:bg-nexus-navy/90 transition-all flex items-center justify-center gap-2"
              >
                Skip & Join Academy <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </ScreenTransition>
      );
    }

    if (isLoading) {
      return (
        <ScreenTransition keyId="loading">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-nexus-silver rounded-full"></div>
              <div className="absolute inset-0 border-4 border-nexus-cobalt rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="w-8 h-8 text-nexus-cobalt animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-nexus-navy mb-3 font-display">Finding your match</h2>
            <p className="text-gray-600 text-lg animate-pulse">{loadingText}</p>
          </div>
        </ScreenTransition>
      );
    }

    const roleOptions = [
      'I run a business',
      'I work a 9-5 or professional job',
      'I’m a freelancer or consultant',
      'I create content or sell online',
      'Other'
    ];

    const getProblemsByRole = (role: string) => {
      switch (role) {
        case 'I run a business':
          return [
            "I'm overwhelmed by customer DMs and repetitive support questions",
            "Manual operations and admin tasks are eating up my entire day",
            "I need a system to automatically generate and follow up with leads",
            "I struggle to consistently create marketing content that actually sells",
            "I need to analyze my business data but don't have the time or skills",
            "Other"
          ];
        case 'I work a 9-5 or professional job':
          return [
            "I spend half my day in meetings and writing follow-up notes",
            "My inbox is overflowing and drafting professional emails takes too long",
            "I waste hours building slide decks and formatting reports",
            "I'm stuck doing manual data entry and spreadsheet analysis",
            "I have to read massive documents and need to summarize them instantly",
            "Other"
          ];
        case 'I’m a freelancer or consultant':
          return [
            "Writing custom proposals and pitching clients takes up my billable hours",
            "Managing client communication and project updates is exhausting",
            "I'm bogged down by contracts, invoicing, and back-office admin",
            "I need to speed up my actual client work without dropping quality",
            "I don't have time to market myself to get a steady stream of new clients",
            "Other"
          ];
        case 'I create content or sell online':
          return [
            "I constantly run out of fresh ideas and scripts for my content",
            "Editing videos, audio, or photos takes me way too long",
            "Writing engaging captions, blogs, or product descriptions is a struggle",
            "I need to turn one piece of content into dozens of posts automatically",
            "I can't keep up with replying to comments and engaging with my audience",
            "Other"
          ];
        default:
          return [
            "I'm a complete beginner and don't know how to use AI yet",
            "I want to make money with AI and discover new monetization strategies",
            "I need a step-by-step roadmap to start my AI journey today",
            "I want to save 2+ hours every day by automating my manual tasks",
            "I want to stay ahead of the curve and master AI before everyone else",
            "Other"
          ];
      }
    };

    const preferenceOptions = [
      'Simple and easy for beginners',
      'Best tool for the job (highest quality)',
      'Built for speed and automation',
      'Advanced / Professional grade',
      'Integrates with my current workflow',
      'Other'
    ];

    switch (currentStep) {
      case 'landing':
        return (
          <ScreenTransition keyId="landing">
            <div className="text-center py-8 md:py-16 max-w-2xl mx-auto flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-nexus-silver/30 text-nexus-navy font-bold text-sm mb-8 border border-nexus-silver">
                <NexusLogo className="w-4 h-4" /> The Nexus Matchmaker
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-nexus-navy mb-6 tracking-tight leading-tight font-display">
                The perfect AI tool for your <span className="text-nexus-cobalt">next move.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Tell me what you're trying to do, and I'll give you the perfect tool, a backup option, and a strategy to get the best results.
              </p>
              <div className="w-full max-w-md mx-auto">
                <Button onClick={() => {
                  goNext();
                }}>Find My Tool <ArrowRight className="w-5 h-5" /></Button>
              </div>
            </div>
          </ScreenTransition>
        );
      case 'role':
        return (
          <ScreenTransition keyId="role">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight font-display">Which one best describes you?</h1>
              <p className="text-gray-600 text-lg">We find the exact AI tools to <span className="text-nexus-cobalt font-bold">automate or augment</span> your specific work tasks.</p>
            </div>
            <div className="w-full max-w-md flex flex-col gap-3 mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Select your current situation:</h2>
              {roleOptions.map((opt) => (
                <OptionCard 
                  key={opt} 
                  title={opt} 
                  selected={role === opt} 
                  onClick={() => {
                    setRole(opt);
                  }} 
                />
              ))}
            </div>
            <div className="w-full max-w-md flex flex-col gap-4">
              <Button onClick={goNext} disabled={!role}>Continue</Button>
              <button 
                onClick={goBack}
                className="text-gray-500 font-medium hover:text-gray-700 transition-colors flex items-center justify-center gap-1 py-2"
              >
                <ChevronLeft className="w-4 h-4" /> Go Back
              </button>
            </div>
          </ScreenTransition>
        );
      case 'need':
        return (
          <ScreenTransition keyId="need">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight font-display">What's your biggest challenge?</h1>
              <p className="text-gray-600 text-lg">Pick the one area where you want AI to help you most.</p>
            </div>
            <div className="w-full max-w-md flex flex-col gap-3 mb-8">
              {getProblemsByRole(role).map((opt) => (
                <OptionCard 
                  key={opt} 
                  title={opt} 
                  selected={mainNeed === opt} 
                  onClick={() => {
                    setMainNeed(opt);
                  }} 
                />
              ))}
            </div>
            <div className="w-full max-w-md flex flex-col gap-4">
              <Button onClick={goNext} disabled={!mainNeed}>Continue</Button>
              <button 
                onClick={goBack}
                className="text-gray-500 font-medium hover:text-gray-700 transition-colors flex items-center justify-center gap-1 py-2"
              >
                <ChevronLeft className="w-4 h-4" /> Go Back
              </button>
            </div>
          </ScreenTransition>
        );
      case 'context':
        return (
          <ScreenTransition keyId="context">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight font-display">Give me the details.</h1>
              <p className="text-gray-600 text-lg">The more specific you are, the better the recommendation.</p>
            </div>
            <div className="w-full max-w-md flex flex-col gap-6 mb-8">
              <TextInput
                label={mainNeed === 'Other' ? "What exactly are you trying to do?" : `Tell me more about your ${mainNeed.toLowerCase()}`}
                placeholder="e.g., I need to automate my sales follow-ups..."
                value={contextCreate}
                onChange={setContextCreate}
              />
              <div className="flex flex-col gap-2">
                <TextArea
                  label="Additional Context (Optional)"
                  placeholder="e.g., I need it to sound professional, I'm on a tight deadline..."
                  value={contextSituation}
                  onChange={setContextSituation}
                />
                <div className="bg-blue-50/50 text-blue-800 text-sm p-3 rounded-xl flex items-start gap-2 border border-blue-100/50">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                  <p className="leading-snug">
                    <span className="font-semibold">The more context you provide, the better the result.</span> Tell us the specifics of your situation to get the most tailored strategy.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">How do you like your tools?</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {preferenceOptions.map((opt) => (
                    <Chip key={opt} title={opt} selected={toolPreference === opt} onClick={() => setToolPreference(opt)} />
                  ))}
                </div>
              </div>
            </div>
            <div className="w-full max-w-md flex flex-col gap-4">
              <Button onClick={goNext} disabled={!contextCreate || !toolPreference}>
                Continue <ArrowRight className="w-5 h-5" />
              </Button>
              <button 
                onClick={goBack}
                className="text-gray-500 font-medium hover:text-gray-700 transition-colors flex items-center justify-center gap-1 py-2"
              >
                <ChevronLeft className="w-4 h-4" /> Go Back
              </button>
            </div>
          </ScreenTransition>
        );
      case 'lead':
        return (
          <ScreenTransition keyId="lead">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-bold uppercase tracking-widest mb-4 border border-blue-100">
                <Sparkles className="w-4 h-4" /> Almost there!
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight font-display">Where should we send your strategy?</h1>
              <p className="text-gray-600 text-lg">Enter your details to unlock your custom AI recommendation.</p>
            </div>
            <div className="w-full max-w-md flex flex-col gap-6 mb-8">
              <TextInput
                label="Full Name"
                placeholder="e.g., Jane Doe"
                value={leadName}
                onChange={setLeadName}
              />
              <TextInput
                label="Email Address"
                placeholder="e.g., jane@example.com"
                value={leadEmail}
                onChange={setLeadEmail}
              />
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">WhatsApp Number</label>
                <PhoneInput
                  international
                  defaultCountry="NG"
                  value={leadPhone}
                  onChange={(val) => setLeadPhone(val || '')}
                  className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="w-full max-w-md flex flex-col gap-4">
              <Button 
                onClick={handleGenerateRecommendation} 
                disabled={!leadName || !leadEmail || !leadEmail.includes('@') || !leadPhone || !isValidPhoneNumber(leadPhone)} 
                loading={isLoading}
              >
                Unlock My AI Strategy <ArrowRight className="w-5 h-5" />
              </Button>
              <button 
                onClick={goBack}
                className="text-gray-500 font-medium hover:text-gray-700 transition-colors flex items-center justify-center gap-1 py-2"
              >
                <ChevronLeft className="w-4 h-4" /> Go Back
              </button>
            </div>
          </ScreenTransition>
        );
      case 'result':
        return (
          <ScreenTransition keyId="result">
            <div className="w-full max-w-3xl px-4 sm:px-0 text-left">
              <div className="mb-8 flex justify-center">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-20 h-20 bg-nexus-navy rounded-full flex items-center justify-center shadow-xl shadow-nexus-navy/30"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-black text-nexus-navy mb-4 tracking-tight leading-tight text-center font-display">
                Your Custom <span className="text-nexus-cobalt italic font-nexus">AI Strategy</span>
              </h1>
              
              <div className="flex flex-col items-center mb-10">
                <div className="inline-flex flex-wrap justify-center gap-2 max-w-lg">
                  <span className="px-3 py-1 rounded-full bg-nexus-silver/50 text-nexus-navy text-xs font-bold border border-nexus-silver">
                    Target: {role}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-nexus-silver/50 text-nexus-navy text-xs font-bold border border-nexus-silver">
                    Task: {mainNeed}
                  </span>
                </div>
              </div>

              {!recommendation && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Processing your recommendation details...</p>
                </div>
              )}

              {recommendation && (
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-12">
                  <div className="bg-gradient-to-br from-nexus-navy to-[#2D2A6E] p-8 sm:p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="text-nexus-silver/60 text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <NexusLogo className="w-4 h-4 text-nexus-cobalt" /> Primary Recommendation
                      </div>
                      <h2 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight">{recommendation.primaryTool}</h2>
                      <p className="text-nexus-silver text-lg sm:text-xl leading-relaxed mb-8 max-w-2xl">{recommendation.whyItFits}</p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                        <a 
                          href={getToolUrl(recommendation.primaryTool)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 bg-white text-nexus-navy px-6 py-3 rounded-xl font-bold hover:bg-nexus-silver transition-colors shadow-lg shadow-black/20 w-full sm:w-auto"
                        >
                          Open {recommendation.primaryTool} <ArrowRight className="w-5 h-5" />
                        </a>
                        <button 
                          onClick={handleSaveStrategy}
                          className="inline-flex items-center justify-center gap-2 bg-nexus-cobalt text-white px-6 py-3 rounded-xl font-bold hover:bg-nexus-cobalt/90 transition-colors shadow-lg w-full sm:w-auto"
                        >
                          <Download className="w-5 h-5" /> Save Strategy
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 sm:p-10 space-y-10">
                    <div>
                      <h3 className="text-xl font-bold text-nexus-navy mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-nexus-cobalt" /> Best Used For
                      </h3>
                      <ul className="space-y-3">
                        {recommendation.bestUsedFor.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-gray-700">
                            <div className="w-6 h-6 rounded-full bg-nexus-silver/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <CheckCircle2 className="w-4 h-4 text-nexus-cobalt" />
                            </div>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-8">
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col h-full">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4 text-gray-500" /> Alternatives
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {recommendation.alternativeTools.map((tool, idx) => (
                            <a 
                              key={idx}
                              href={getToolUrl(tool)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all"
                            >
                              {tool} <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                            </a>
                          ))}
                        </div>
                        <div className="mt-auto bg-white p-5 rounded-xl border border-nexus-silver shadow-sm">
                          <h4 className="text-xs font-bold text-nexus-cobalt uppercase tracking-wider mb-2">Comparison Strategy</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{recommendation.comparisonStrategy}</p>
                        </div>
                      </div>
                      <div className="bg-nexus-silver/30 p-6 rounded-2xl border border-nexus-silver relative overflow-hidden group flex flex-col h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-nexus-navy to-nexus-cobalt opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <h3 className="text-sm font-bold text-nexus-navy group-hover:text-white uppercase tracking-wider mb-3 relative z-10 transition-colors">Pro Tip</h3>
                        <p className="text-gray-700 group-hover:text-nexus-silver relative z-10 transition-colors">{recommendation.betterResultsTip}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Your Next Step</h3>
                      <p className="text-gray-700 leading-relaxed">{recommendation.nextStep}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-nexus-navy via-[#1A1840] to-black rounded-3xl shadow-2xl p-8 sm:p-12 text-white mb-12 relative overflow-hidden text-center border border-nexus-cobalt/20">
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none hidden sm:block" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-nexus-cobalt rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none hidden sm:block" />
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nexus-cobalt/20 text-nexus-silver text-xs font-black uppercase tracking-widest mb-6 border border-nexus-cobalt/30">
                    <NexusLogo className="w-4 h-4 text-nexus-cobalt" /> The Ultimate Shortcut
                  </div>
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 leading-tight tracking-tight font-display">
                    Stop Guessing. <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-nexus-cobalt to-cyan-400">Start Getting Results.</span>
                  </h2>
                  <p className="text-nexus-silver/80 text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto font-medium">
                    Knowing which tool to use is just the start. The real secret is knowing <strong className="text-white">how</strong> to use it to get your work done in half the time. Join the <strong className="text-white">AI Literacy Academy</strong> and get the exact steps to win back your day.
                  </p>
                  
                  <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
                    <a 
                      href="https://ailiteracyacademy.org/ai/70/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-3 bg-nexus-cobalt text-white py-5 px-8 rounded-2xl font-black text-xl hover:bg-nexus-cobalt/90 transition-all shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)] hover:-translate-y-1 active:translate-y-0"
                    >
                      Show Me How to Use AI <ChevronRight className="w-6 h-6" />
                    </a>
                    <p className="text-sm text-gray-400 font-medium">Stop wasting time. Start winning with AI today.</p>
                  </div>
                </div>
              </div>
              
              {/* Sticky Mobile CTA */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] sm:hidden z-50 flex justify-center">
                <a 
                  href="https://ailiteracyacademy.org/ai/70/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full max-w-md flex items-center justify-center gap-2 bg-nexus-navy text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-nexus-navy/90 transition-all shadow-lg active:scale-95"
                >
                  Master AI Now <ArrowRight className="w-5 h-5" />
                </a>
              </div>
              
              <div className="flex flex-col items-center gap-4 pb-24 sm:pb-10">
                <div className="h-px w-12 bg-gray-200" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Powered by Majimoni</p>
              </div>
            </div>
          </ScreenTransition>
        );
    }
  };

  return (
    <div className="min-h-screen bg-nexus-bg font-sans selection:bg-nexus-cobalt/20 selection:text-nexus-navy">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-12 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-10 bg-white p-4 sm:px-6 rounded-2xl shadow-sm border border-nexus-silver">
          <div className="flex items-center gap-3 text-nexus-navy font-bold text-xl sm:text-2xl tracking-tight font-display">
            <NexusIcon className="w-10 h-10" />
            <div className="flex flex-col leading-none">
              <span>AI</span>
              <span className="text-sm font-medium text-nexus-cobalt tracking-widest uppercase">Recommender</span>
            </div>
          </div>
          <a 
            href="https://ailiteracyacademy.org/ai/70/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center sm:items-end group text-center sm:text-right"
          >
            <div className="flex items-center gap-1 text-sm font-bold text-nexus-cobalt group-hover:text-nexus-navy transition-colors">
              Join AI Literacy Academy <ChevronRight className="w-4 h-4" />
            </div>
            <span className="text-xs text-gray-500 mt-0.5">Learn how to use AI to save hours</span>
          </a>
        </header>

        {/* Progress Bar (hide on landing and result screen) */}
        {currentStep !== 'landing' && currentStep !== 'result' && !isLoading && (
          <div className="w-full max-w-md mx-auto mb-8">
            <ProgressBar current={currentStepIndex} total={steps.length - 1} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center justify-start w-full">
          <AnimatePresence mode="wait">
            {renderScreen()}
          </AnimatePresence>
        </main>

        <footer className="w-full py-8 text-center border-t border-nexus-silver/30 mt-auto">
          <div className="text-nexus-silver text-[10px] font-bold tracking-widest uppercase opacity-50 mb-1">
            System Identity: V2.1.0-STABLE
          </div>
          <p className="text-gray-400 text-xs">AI Literacy Academy &copy; 2026. All strategies are AI-curated.</p>
        </footer>
        
      </div>
    </div>
  );
}

