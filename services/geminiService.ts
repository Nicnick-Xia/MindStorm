
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSubIdeas = async (
  concept: string, 
  contextNodes: string[] = []
): Promise<string[]> => {
  try {
    const prompt = `
      You are a creative brainstorming assistant. 
      The current central concept is: "${concept}".
      Context path: ${contextNodes.join(' -> ')}.
      
      Generate between 3 to 5 distinct, creative, and concise sub-concepts or related associations that branch off from "${concept}".
      Keep the text for each idea short (under 5 words) and punchy.
      
      Output JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ideas: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              }
            }
          }
        }
      }
    });

    if (!response.text) {
      return [];
    }

    const parsed: GeminiResponse = JSON.parse(response.text);
    return parsed.ideas || [];

  } catch (error) {
    console.error("Error generating ideas:", error);
    return ["Error generating", "Try again"];
  }
};
