import { SignatureVerifier } from './base.js';
import { hmacHex, timingSafeEqualString } from '../utils/crypto.js';
import { getHeader } from '../utils/headers.js';

export class GitHubSignatureVerifier extends SignatureVerifier {
  verify({ rawBody, headers, source }) {
    const header = getHeader(headers, source.signature.signatureHeader || 'x-hub-signature-256');
    if (!header?.startsWith('sha256=')) return false;
    const expected = `sha256=${hmacHex(source.signature.secret, rawBody)}`;
    return timingSafeEqualString(expected, header);
  }
}
