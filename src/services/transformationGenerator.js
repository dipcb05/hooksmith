import OpenAI from 'openai';
import { config } from '../config.js';
import { sha256 } from '../utils/crypto.js';
import { validateTransformationCode } from './transformationExecutor.js';

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

export async function generateTransformation({ source, schemaShape }) {
  if (!openai) {
    throw new Error('OPENAI_API_KEY is required for transformation generation');
  }

  const prompt = [
    'Return only a valid JavaScript arrow function string with signature (payload) => result.',
    'Do not use imports, require, eval, Function, process, global, network calls, timers, or filesystem access.',
    'The function must be deterministic and must tolerate missing optional fields.',
    'The payload schema below contains keys and value types only, never real values.',
    '',
    `Operator output description: ${source.outputDescription}`,
    '',
    `Payload schema: ${JSON.stringify(schemaShape, null, 2)}`
  ].join('\n');

  const completion = await openai.chat.completions.create({
    model: config.openaiModel,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: 'You generate production-safe JavaScript data transformation functions. Return code only.'
      },
      { role: 'user', content: prompt }
    ]
  });

  const functionCode = stripCodeFence(completion.choices[0]?.message?.content?.trim() || '');
  validateTransformationCode(functionCode);

  return {
    functionCode,
    promptHash: sha256(prompt),
    model: config.openaiModel
  };
}

function stripCodeFence(content) {
  return content
    .replace(/^```(?:javascript|js)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}
