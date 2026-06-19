export function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [
      key.toLowerCase(),
      Array.isArray(value) ? value.join(',') : String(value)
    ])
  );
}

export function getHeader(headers, name) {
  if (!name) return undefined;
  return headers[String(name).toLowerCase()];
}
