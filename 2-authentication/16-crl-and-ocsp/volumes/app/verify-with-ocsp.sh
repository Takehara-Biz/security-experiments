#!/bin/sh
set -euo pipefail
cd ./certs

echo "========================================"
echo " 1. OCSP レスポンダーによる検証"
echo "========================================"

echo "【テスト 1-1】有効な証明書 (good.crt) のOCSP検証"
openssl ocsp -issuer ca.crt -cert good.crt -url http://responder:8888 -CAfile ca.crt

echo ""
echo "【テスト 1-2】失効した証明書 (revoked.crt) のOCSP検証"
openssl ocsp -issuer ca.crt -cert revoked.crt -url http://responder:8888 -CAfile ca.crt
