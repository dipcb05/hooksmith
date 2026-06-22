import OpenAI from 'openai';
import { config } from '../../config.js';
import { SYSTEM_PROMPT } from './prompt.js';

export async function generate(prompt) {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const completion = await openai.chat.completions.create({
    model: config.openaiModel,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      { role: 'user', content: prompt }
    ]
  });

  return {
    content: completion.choices[0]?.message?.content?.trim() || '',
    model: config.openaiModel
  };
}
