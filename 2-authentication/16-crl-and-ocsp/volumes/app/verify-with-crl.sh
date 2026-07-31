#!/bin/sh
set -euo pipefail
cd ./certs

echo ""
echo "========================================"
echo " 2. CRL (失効リスト) による検証"
echo "========================================"

# ルートCA証明書とCRLを1つの検証用チェーンファイルに結合
cat ca.crt crl.pem >ca_crl_chain.pem

echo "【テスト 2-1】有効な証明書 (good.crt) のCRL検証"
openssl verify -crl_check -CAfile ca_crl_chain.pem good.crt

echo ""
echo "【テスト 2-2】失効した証明書 (revoked.crt) のCRL検証"
openssl verify -crl_check -CAfile ca_crl_chain.pem revoked.crt || true
