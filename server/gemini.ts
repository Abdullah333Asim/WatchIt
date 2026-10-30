import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY || "";
if (!geminiApiKey) {
  console.warn("GEMINI_API_KEY is not set. Google Gemini will be skipped.");
}

const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

export async function getRecommendations(
  preferences: string,
  history: string,
  query: string,
  chatHistoryText: string = ""
) {
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
    if (!ai) {
      throw new Error("GEMINI_API_KEY not configured.");
    }
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "Your conversational reply to the user, spoken as Cine Noir.",
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
                  why_it_matches: { type: Type.STRING, description: "Why it matches their taste" },
                },
                required: ["title", "year", "synopsis", "why_it_matches"],
              },
            },
          },
          required: ["reply", "recommendations"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini.");
    }
    return response.text;
  };

  const fetchOpenRouter = async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured.");
    }
    const openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "WatchIt",
      },
    });

    const response = await openrouter.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenRouter.");
    }
    return content;
  };

  const fetchLocalVault = () => {
    return JSON.stringify({
      reply: "The external cinema networks are temporarily clouded, but my private vault is open. Here are some timeless, atmospheric selections matching your taste while the connection re-establishes.",
      recommendations: [
        {
          title: "Blade Runner 2049",
          year: "2017",
          synopsis: "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard.",
          why_it_matches: "A supreme atmospheric noir with mesmerizing neo-classical visuals."
        },
        {
          title: "Drive",
          year: "2011",
          synopsis: "A mysterious Hollywood stuntman and mechanic who moonlights as a getaway driver finds himself in trouble when he helps out his neighbor.",
          why_it_matches: "Hypnotic synthwave neo-noir with razor-sharp direction."
        },
        {
          title: "Chinatown",
          year: "1974",
          synopsis: "A private detective hired to expose an adulterer finds himself caught in a web of deceit, corruption, and murder.",
          why_it_matches: "The quintessential hardboiled detective mystery that defines the noir ethos."
        }
      ]
    });
  };

  try {
    // Race Google Gemini and OpenRouter for the fastest response
    const winner = await Promise.any([fetchGemini(), fetchOpenRouter()]);
    if (!winner) throw new Error("Empty response from AI providers.");
    return winner;
  } catch (error) {
    console.warn("External AI providers failed. Using local vault safety net:", error);
    return fetchLocalVault();
  }
}

export default ai;
