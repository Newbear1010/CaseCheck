
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeActivityRisk = async (title: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the risk of this corporate activity:
      Title: ${title}
      Description: ${description}
      
      Return a JSON with:
      - riskLevel: "LOW" | "MEDIUM" | "HIGH"
      - reasoning: string (brief)
      - suggestions: string[] (how to mitigate risks)`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      riskLevel: "MEDIUM",
      reasoning: "Automated analysis unavailable. Manual review required.",
      suggestions: ["Ensure all attendees follow standard safety protocols."]
    };
  }
};
