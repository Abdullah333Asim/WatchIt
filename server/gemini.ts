import { GoogleGenAI, Type } from "@google/genai";
import Groq from "groq-sdk";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import dotenv from "dotenv";
import { activeAiRequests, aiLatencyHistogram } from './metrics';
import { activeAiRequests, aiLatencyHistogram, aiProviderWins } from './metrics';

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "Your conversational reply to the user, spoken as Cine Noir."
            },
            recommendations: {
              type: Type.ARRAY,
              description: "A list of movie recommendations.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Movie title" },
                  year: { type: Type.STRING, description: "Release year" },
                  synopsis: { type: Type.STRING, description: "Brief synopsis" },
                  why_it_matches: { type: Type.STRING, description: "Why it matches their taste" }
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

  const fetchGroq = async () => {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not set");
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-8b-8192",
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content;
  };

  const fetchCerebras = async () => {
    if (!process.env.CEREBRAS_API_KEY) {
      throw new Error("CEREBRAS_API_KEY not set");
    }
    const cerebras = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
    const response = await cerebras.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3.1-8b",
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    if (!("choices" in response)) {
      throw new Error("Cerebras returned an unexpected response shape");
    }
    const firstChoice = response.choices[0];
    if (!firstChoice) return null;
    if ("message" in firstChoice) return firstChoice.message?.content;
    if ("delta" in firstChoice) return firstChoice.delta?.content;
    return null;
  };

  // Start the trackers before the AI race begins
  activeAiRequests.inc();
  const endAiTimer = aiLatencyHistogram.startTimer();

  try {
    // Helper function to tag whoever finishes first
    const runRace = async (name: string, apiCall: Promise<any>) => {
      const response = await apiCall;
      return { provider: name, data: response };
    };

    // Race them for the fastest response!
    const winner = await Promise.any([
      runRace("Cerebras", fetchCerebras()),
      runRace("Groq", fetchGroq()),
      runRace("Gemini", fetchGemini())
    ]);
    
    if (!winner.data) throw new Error("Empty response");

    // 🏆 Log the winner to Prometheus!
    aiProviderWins.labels({ provider: winner.provider }).inc();
    
    return winner.data;
    
  } catch (error) {
    console.error("AI Race failed, attempting fallback:", error);
    // Fallback to one more try with Gemini just in case
    const fallback = await fetchGemini();
    
    // Log Gemini as the winner by default if the fallback succeeds
    aiProviderWins.labels({ provider: "Gemini_Fallback" }).inc();
    
    return fallback;
    
  } finally {
    // THIS is the observability best practice! 
    // It guarantees the timer stops and the gauge drops to 0 
    // even if the fallback crashes.
    endAiTimer();
    activeAiRequests.dec();
  } 
}

export default ai;
