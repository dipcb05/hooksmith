import crypto from 'node:crypto';

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function schemaShape(value) {
  const kind = typeOf(value);
  if (kind === 'array') {
    const itemShapes = value.slice(0, 10).map(schemaShape);
    return { type: 'array', items: mergeArrayShapes(itemShapes) };
  }
  if (kind === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, schemaShape(value[key])])
    );
  }
  return kind;
}

function mergeArrayShapes(shapes) {
  if (shapes.length === 0) return 'unknown';
  const unique = [...new Set(shapes.map((shape) => JSON.stringify(shape)))];
  if (unique.length === 1) return JSON.parse(unique[0]);
  return unique.map((shape) => JSON.parse(shape));
}

export function schemaFingerprint(payload) {
  const shape = schemaShape(payload);
  const canonical = JSON.stringify(shape);
  return {
    shape,
    fingerprint: crypto.createHash('sha256').update(canonical).digest('hex')
  };
}
