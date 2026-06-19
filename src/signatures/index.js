import { StripeSignatureVerifier } from './stripe.js';
import { GitHubSignatureVerifier } from './github.js';
import { ShopifySignatureVerifier } from './shopify.js';

const verifiers = new Map([
  ['stripe', new StripeSignatureVerifier()],
  ['github', new GitHubSignatureVerifier()],
  ['shopify', new ShopifySignatureVerifier()]
]);

export function getVerifier(strategy) {
  return verifiers.get(String(strategy || '').toLowerCase());
}
