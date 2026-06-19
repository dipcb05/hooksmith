import crypto from 'node:crypto';

export function timingSafeEqualString(left, right) {
  const a = Buffer.from(left || '', 'utf8');
  const b = Buffer.from(right || '', 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function hmacHex(secret, payload, algorithm = 'sha256') {
  return crypto.createHmac(algorithm, secret).update(payload).digest('hex');
}

export function hmacBase64(secret, payload, algorithm = 'sha256') {
  return crypto.createHmac(algorithm, secret).update(payload).digest('base64');
}

export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
