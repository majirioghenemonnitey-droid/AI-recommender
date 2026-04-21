import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import App from './App.tsx';
import './index.css';

const siteKey = process.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Defaults to a testing key if none provided

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <App />
    </GoogleReCaptchaProvider>
  </StrictMode>,
);
