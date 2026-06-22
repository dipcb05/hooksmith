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
    
    // Check for replay attacks (tolerance window of 5 minutes)
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (age > 300) return false;

    const expected = hmacHex(source.signature.secret, `${timestamp}.${rawBody}`);
    return timingSafeEqualString(expected, signature);
  }
}
