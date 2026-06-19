import { SignatureVerifier } from './base.js';
import { hmacBase64, timingSafeEqualString } from '../utils/crypto.js';
import { getHeader } from '../utils/headers.js';

export class ShopifySignatureVerifier extends SignatureVerifier {
  verify({ rawBody, headers, source }) {
    const header = getHeader(headers, source.signature.signatureHeader || 'x-shopify-hmac-sha256');
    if (!header) return false;
    const expected = hmacBase64(source.signature.secret, rawBody);
    return timingSafeEqualString(expected, header);
  }
}
