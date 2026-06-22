import { StripeSignatureVerifier } from './stripe.js';
import { GitHubSignatureVerifier } from './github.js';
import { ShopifySignatureVerifier } from './shopify.js';
import { NoneSignatureVerifier } from './none.js';
import { CustomTokenSignatureVerifier } from './customToken.js';

const verifiers = new Map([
  ['stripe', new StripeSignatureVerifier()],
  ['github', new GitHubSignatureVerifier()],
  ['shopify', new ShopifySignatureVerifier()],
  ['none', new NoneSignatureVerifier()],
  ['custom-token', new CustomTokenSignatureVerifier()]
]);

export function getVerifier(strategy) {
  return verifiers.get(String(strategy || '').toLowerCase());
}

