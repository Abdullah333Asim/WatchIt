import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";
import { activeAiRequests, aiLatencyHistogram, aiProviderWins } from './metrics';

dotenv.config();

export async function getRecommendations(preferences: string, history: string, query: string, chatHistoryText: string = "") {
  const safeHistory = (history || "").replace(/[\r\n\t]+/g, " ").slice(0, 1000);
  const safeQuery = (query || "").replace(/[\r\n\t]+/g, " ").slice(0, 500);
  const safeChatHistory = (chatHistoryText || "").slice(0, 2000);

  const prompt = `
    You are Cine Noir, a friendly, semi-formal movie recommender.
    User's Recently Swiped/Watched History (DO NOT recommend these again): ${safeHistory}
    
    Previous Conversation:
    ${safeChatHistory}
    
    User Request: ${safeQuery}
    
    Provide highly specific movie/show recommendations based on their watched history and request. 
    Focus on the "vibe" and specific artistic preferences.
    Act as if you are a sophisticated curator in a dark, atmospheric theater lobby.

    You MUST respond with valid JSON in the following format:
    {
      "reply": "Your conversational reply to the user, spoken as Cine Noir.",
      "recommendations": [
        {
          "title": "Movie title",
          "year": "Release year",
          "synopsis": "Brief synopsis",
          "why_it_matches": "Why it matches their taste"
        }
      ]
    }
  `;

  const fetchGemini = async () => {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not set. Skipping Gemini.");
    }
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  year: { type: Type.STRING },
                  synopsis: { type: Type.STRING },
                  why_it_matches: { type: Type.STRING }
                },
                required: ["title", "year", "synopsis", "why_it_matches"]
              }
            }
          },
          required: ["reply", "recommendations"]
        }
      }
    });
    return response.text;
  };

  const fetchOpenRouter = async (modelName: string) => {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not set. Skipping OpenRouter.");
    }
    const openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    
    const response = await openrouter.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content;
  };

  // 🛡️ THE UNBREAKABLE FALLBACK
  const fetchLocalVault = async () => {
    // Simulate a realistic 800ms API network delay for your Grafana histograms
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return JSON.stringify({
      reply: "The external API networks are currently dark, but my local archives are always open. Here are some guaranteed classics from the vault while the connection is restored.",
      recommendations: [
        {
          title: "The Matrix",
          year: "1999",
          synopsis: "A computer hacker learns from mysterious rebels about the true nature of his reality.",
          why_it_matches: "A perfect cinematic match for when external systems and APIs are glitching."
        },
        {
          title: "Blade Runner 2049",
          year: "2017",
          synopsis: "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard.",
          why_it_matches: "Because we are navigating a dystopian landscape of broken AI models right now."
        }
      ]
    });
  };

  activeAiRequests.inc();
  const endAiTimer = aiLatencyHistogram.startTimer();

  try {
    const runRace = async (name: string, apiCall: Promise<any>) => {
      const response = await apiCall;
      return { provider: name, data: response };
    };

    // 🏁 RACE ONLY THE REAL APIs
    const winner = await Promise.any([
      runRace("Gemini", fetchGemini()),
      runRace("OpenRouter", fetchOpenRouter("meta-llama/llama-3.1-8b-instruct"))
    ]);
    
    if (!winner.data) throw new Error("Empty response");

    // Log the true winner!
    aiProviderWins.labels({ provider: winner.provider }).inc();
    return winner.data;
    
  } catch (error) {
    // Adding the 'error' object here will print exactly why Gemini and OpenRouter failed!
    console.warn("External APIs failed (or keys are missing). Deploying Local Vault safety net!", error);
    
    const fallbackData = await fetchLocalVault();
    aiProviderWins.labels({ provider: "Local_Vault" }).inc();
    return fallbackData;
    
  } finally {
    endAiTimer();
    activeAiRequests.dec();
  } 
}