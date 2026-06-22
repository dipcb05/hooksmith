import { GoogleGenAI } from '@google/genai';
import { config } from '../../config.js';
import { SYSTEM_PROMPT } from './prompt.js';

export async function generate(prompt) {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.1
    }
  });

  return {
    content: response.text?.trim() || '',
    model: config.geminiModel
  };
}
