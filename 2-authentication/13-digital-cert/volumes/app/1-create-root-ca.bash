#!/usr/bin/env bash

# エラー発生時にスクリプトを停止
set -e

echo "=========================================="
echo " 1. 認証局 (Root CA) の作成"
echo "=========================================="

# 1-1. CAの秘密鍵を作成
openssl genrsa -out ca.key 4096 2>/dev/null
echo "[+] Root CA の秘密鍵を作成しました: ca.key"
cat ./ca.key

# 1-2. Root CA の自己署名証明書を作成 (有効期限: 365日)
openssl req -x509 -new -nodes \
  -key ca.key \
  -sha256 \
  -days 365 \
  -out ca.crt \
  -subj "/C=JP/ST=Tokyo/O=MyTestCA/CN=My Test Root CA"
echo "[+] Root CA 証明書を作成しました: ca.crt"
cat ./ca.crt
