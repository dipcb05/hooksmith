import { SignatureVerifier } from './base.js';

export class NoneSignatureVerifier extends SignatureVerifier {
  verify() {
    // No signature validation requested, always pass
    return true;
  }
}
