import { SignatureVerifier } from './base.js';
import { hmacHex, timingSafeEqualString } from '../utils/crypto.js';
import { getHeader } from '../utils/headers.js';

export class StripeSignatureVerifier extends SignatureVerifier {
  verify({ rawBody, headers, source }) {
    const header = getHeader(headers, source.signature.signatureHeader || 'stripe-signature');
    if (!header) return false;
    const timestamp = header.match(/t=([^,]+)/)?.[1];
    const signature = header.match(/v1=([^,]+)/)?.[1];
    if (!timestamp || !signature) return false;
    const expected = hmacHex(source.signature.secret, `${timestamp}.${rawBody}`);
    return timingSafeEqualString(expected, signature);
  }
}
