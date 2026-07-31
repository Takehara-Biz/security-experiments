#!/bin/sh
set -euo pipefail

echo "----------------------------------------"
echo "【テスト 1】有効な証明書 (good.crt) のOCSP検証"
echo "----------------------------------------"
openssl ocsp -issuer ca.crt -cert good.crt -url http://responder:8888 -CAfile ca.crt

echo ""
echo "----------------------------------------"
echo "【テスト 2】失効した証明書 (revoked.crt) のOCSP検証"
echo "----------------------------------------"
openssl ocsp -issuer ca.crt -cert revoked.crt -url http://responder:8888 -CAfile ca.crt
