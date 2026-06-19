#!/usr/bin/env bash
set -euo pipefail

payload='{"action":"opened","repository":{"full_name":"acme/widgets"},"sender":{"login":"octocat"},"pull_request":{"head":{"ref":"feature","sha":"abc123"},"title":"Add widgets"}}'
secret='github_secret_replace_me'
signature="$(printf '%s' "$payload" | openssl dgst -sha256 -hmac "$secret" -hex | sed 's/^.* //')"

curl -i -X POST http://localhost:3000/webhooks/github \
  -H "content-type: application/json" \
  -H "x-hub-signature-256: sha256=$signature" \
  --data "$payload"
