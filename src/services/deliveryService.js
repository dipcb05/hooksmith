import { request } from 'undici';

function headersToObject(headers) {
  if (!headers) return {};
  if (headers instanceof Map) return Object.fromEntries(headers);
  return { ...headers };
}

export async function deliver({ destination, body }) {
  const response = await request(destination.url, {
    method: destination.method || 'POST',
    headers: {
      'content-type': 'application/json',
      ...headersToObject(destination.headers)
    },
    body: JSON.stringify(body),
    bodyTimeout: destination.timeoutMs,
    headersTimeout: destination.timeoutMs
  });

  const text = await response.body.text();
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Destination returned ${response.statusCode}: ${text.slice(0, 500)}`);
  }
  return { statusCode: response.statusCode, body: text };
}
