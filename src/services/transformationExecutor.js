import vm from 'node:vm';

const forbiddenTokens = [
  'require',
  'import',
  'process',
  'global',
  'globalThis',
  'Function',
  'eval',
  'constructor',
  'setTimeout',
  'setInterval',
  'fetch',
  'XMLHttpRequest'
];

export function validateTransformationCode(functionCode) {
  if (!functionCode?.trim().startsWith('(payload) =>')) {
    throw new Error('Transformation must use signature (payload) => result');
  }
  for (const token of forbiddenTokens) {
    const pattern = new RegExp(`\\b${token}\\b`);
    if (pattern.test(functionCode)) {
      throw new Error(`Transformation contains forbidden token: ${token}`);
    }
  }
  new vm.Script(`"use strict"; const transform = ${functionCode};`);
}

export function executeTransformation(functionCode, payload) {
  validateTransformationCode(functionCode);
  const context = Object.freeze({
    payload: structuredClone(payload),
    Math,
    Date,
    JSON
  });
  const script = new vm.Script(`"use strict"; const transform = ${functionCode}; transform(payload);`);
  const result = script.runInNewContext(context, { timeout: 500 });
  if (result && typeof result.then === 'function') {
    throw new Error('Async transformations are not allowed');
  }
  return result;
}
