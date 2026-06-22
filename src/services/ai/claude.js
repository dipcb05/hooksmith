import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';
import { SYSTEM_PROMPT } from './prompt.js';

export async function generate(prompt) {
  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
  const response = await anthropic.messages.create({
    model: config.anthropicModel,
    max_tokens: 1024,
    temperature: 0.1,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: prompt }
    ]
  });

  const content = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  return {
    content,
    model: config.anthropicModel
  };
}
