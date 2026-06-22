import { SignatureVerifier } from './base.js';
import { timingSafeEqualString } from '../utils/crypto.js';
import { getHeader } from '../utils/headers.js';

export class CustomTokenSignatureVerifier extends SignatureVerifier {
  verify({ headers, source }) {
    const headerName = source.signature.signatureHeader || 'x-webhook-token';
    const headerValue = getHeader(headers, headerName);
    if (!headerValue) return false;
    return timingSafeEqualString(source.signature.secret, headerValue);
  }
}
