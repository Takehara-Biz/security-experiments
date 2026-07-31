#!/usr/bin/env bash

# エラー発生時にスクリプトを停止
set -e

echo "=========================================="
echo " 1. 認証局 (Root CA) の作成"
echo "=========================================="

echo "1-1. CAの秘密鍵を作成"
openssl genrsa -out ca.key 4096 2>/dev/null
echo "[+] Root CA の秘密鍵を作成しました: ca.key"
cat ./ca.key

echo "1-2. Root CA の自己署名（オレオレ）証明書を作成 (有効期限: 365日)"
echo "自己署名証明書の中にCAの公開鍵が含まれる"
openssl req -x509 -new -nodes \
  -key ca.key \
  -sha256 \
  -days 365 \
  -out ca.crt \
  -subj "/C=JP/ST=Tokyo/O=RootCAOrganization/CN=root.ca.com"
echo "[+] Root CA 証明書を作成しました: ca.crt"
cat ./ca.crt

echo "↑意味のある文章に変換して出力します"
openssl x509 -in ca.crt -text -noout
