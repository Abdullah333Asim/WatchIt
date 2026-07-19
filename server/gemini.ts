import { GoogleGenAI, Type } from "@google/genai";
import Groq from "groq-sdk";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
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
    User's Recently Swiped/Watched History (DO NOT recommend these again): ${history}
    
    Previous Conversation:
    ${chatHistoryText}
    
    User Request: ${query}
    
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
      model: "llama-3.3-70b-versatile",
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
      model: "llama3.1-70b",
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content;
  };

  try {
    // Race them for the fastest response!
    const result = await Promise.any([fetchCerebras(), fetchGroq(), fetchGemini()]);
    if (!result) throw new Error("Empty response");
    return result;
  } catch (error) {
    console.error("Both APIs failed or returned empty", error);
    // Fallback to one more try with Gemini just in case
    const fallback = await fetchGemini();
    return fallback;
  }
}

export default ai;
