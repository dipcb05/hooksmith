#!/usr/bin/env bash
set -euo pipefail

payload='{"id":"evt_123","type":"payment_intent.succeeded","created":1717000000,"data":{"object":{"object":"payment_intent","customer":"cus_123","amount":4200,"currency":"usd"}}}'
secret='whsec_replace_me'
timestamp="$(date +%s)"
signature="$(printf '%s.%s' "$timestamp" "$payload" | openssl dgst -sha256 -hmac "$secret" -hex | sed 's/^.* //')"

curl -i -X POST http://localhost:3000/webhooks/stripe \
  -H "content-type: application/json" \
  -H "stripe-signature: t=$timestamp,v1=$signature" \
  --data "$payload"
