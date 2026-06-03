import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function getRecommendations(preferences: string, history: string, query: string, chatHistoryText: string = "") {
  const prompt = `
    You are Cine Noir, a friendly, semi-formal movie recommender.
    User's Recently Swiped/Watched History: ${history}
    
    Previous Conversation:
    ${chatHistoryText}
    
    User Request: ${query}
    
    Provide highly specific movie/show recommendations based on their watched history and request. 
    Focus on the "vibe" and specific artistic preferences.
    
    Output format: For each recommendation, provide structured details clearly separated from the next one using markdown horizontal rules (---). Format each recommendation EXACTLY like this:
    
    ### **Title of the Movie** (Year)
    
    * **Synopsis:** Brief description.
    * **Cast:** Main cast members.
    * **Why it matches:** Brief explanation relating to what they watched and requested.
    * **Streaming:** Platform names (e.g. Netflix, Max).
    
    ---
    
    Act as if you are a sophisticated curator in a dark, atmospheric theater lobby.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
}

export default ai;
