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

echo ""
echo "=========================================="
echo " 3. SAN (主体者代替名) 設定ファイルの作成"
echo "=========================================="
# 現代のTLS/SSL検証では SAN (Subject Alternative Name) が必須です
cat <<EOF >server.ext
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = example.com
DNS.2 = *.example.com
EOF
echo "[+] SAN設定ファイルを作成しました: server.ext"
cat ./server.ext

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
echo " 5. デジタル証明書の中身を確認 (デコード)"
echo "=========================================="

echo "--- [発行されたサーバー証明書の主要情報] ---"
openssl x509 -in server.crt -text -noout | grep -E "(Issuer:|Subject:|Not Before|Not After|DNS:)"

echo ""
echo "=========================================="
echo " 6. 証明書の検証処理"
echo "=========================================="

# 6-1. CA証明書を使ってサーバー証明書が正当か検証
echo -n "[検証 1] Root CAによる証明書の検証: "
openssl verify -CAfile ca.crt server.crt

# 6-2. 秘密鍵と証明書が対になっているか検証 (公開鍵ハッシュ値の比較)
CERT_HASH=$(openssl x509 -in server.crt -pubkey -noout | openssl md5)
KEY_HASH=$(openssl rsa -in server.key -pubout 2>/dev/null | openssl md5)

echo -n "[検証 2] 秘密鍵と証明書の一致確認: "
if [ "$CERT_HASH" = "$KEY_HASH" ]; then
  echo "OK (秘密鍵と証明書のペアが一致しています)"
else
  echo "FAILED (一致しません)"
fi

echo ""
echo "すべての処理が完了しました。作成されたファイルは/appディレクトリ内にあります。"
