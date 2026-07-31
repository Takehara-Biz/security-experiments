#!/usr/bin/env bash

# エラー発生時にスクリプトを停止
set -e

echo ""
echo "=========================================="
echo " 2. サーバー用 秘密鍵とCSR (証明書署名要求) の作成"
echo "=========================================="

# 2-1. サーバーの秘密鍵を作成
openssl genrsa -out server.key 2048 2>/dev/null
echo "[+] サーバー秘密鍵を作成しました: server.key"

# 2-2. CSR (Certificate Signing Request) を作成
openssl req -new \
  -key server.key \
  -out server.csr \
  -subj "/C=JP/ST=Tokyo/O=ExampleCorp/CN=example.com"
echo "[+] CSRを作成しました: server.csr"
cat ./server.csr
echo "server.key"
cat ./server.key
