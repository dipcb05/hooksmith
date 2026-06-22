import { config } from '../config.js';
import { sha256 } from '../utils/crypto.js';
import { validateTransformationCode } from './transformationExecutor.js';

export async function generateTransformation({ source, schemaShape }) {
  const providerName = String(config.aiProvider || 'openai').toLowerCase();

  let driver;
  switch (providerName) {
    case 'openai':
      driver = await import('./ai/openai.js');
      break;
    case 'gemini':
      driver = await import('./ai/gemini.js');
      break;
    case 'claude':
      driver = await import('./ai/claude.js');
      break;
    case 'mcp':
      driver = await import('./ai/mcp.js');
      break;
    default:
      throw new Error(`Unsupported AI provider: ${config.aiProvider}`);
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

  const generated = await driver.generate(prompt);
  const functionCode = stripCodeFence(generated.content);
  validateTransformationCode(functionCode);

  return {
    functionCode,
    promptHash: sha256(prompt),
    model: generated.model
  };
}

function stripCodeFence(content) {
  return content
    .replace(/^```(?:javascript|js)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

