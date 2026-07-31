#!/usr/bin/env bash

# エラー発生時にスクリプトを停止
set -e

echo ""
echo "=========================================="
echo " 4. CAによる証明書の発行 (CSRへの署名)"
echo "=========================================="

# Root CAの鍵(ca.key)と証明書(ca.crt)を使って、サーバーのCSRに署名して証明書を発行
openssl x509 -req \
  -in server.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out server.crt \
  -days 90 \
  -sha256 \
  -extfile server.ext 2>/dev/null

echo "[+] サーバー証明書を発行しました: server.crt"

echo ""
echo "=========================================="
echo " おまけ デジタル証明書の中身を確認 (デコード)"
echo "=========================================="

echo "--- [発行されたサーバー証明書の主要情報] ---"
openssl x509 -in server.crt -text -noout | grep -E "(Issuer:|Subject:|Not Before|Not After|DNS:)"
