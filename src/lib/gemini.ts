export interface RecommendationResult {
  primaryTool: string;
  whyItFits: string;
  bestUsedFor: string[];
  alternativeTools: string[];
  comparisonStrategy: string;
  betterResultsTip: string;
  nextStep: string;
}

export async function getRecommendation(data: any): Promise<RecommendationResult> {
  console.log("Fetching recommendation from server API...");
  
  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to fetch recommendation");
  }

  return response.json();
}
