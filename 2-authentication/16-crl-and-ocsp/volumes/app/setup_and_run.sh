#!/bin/sh
set -euo pipefail

DIR="./certs"
mkdir -p $DIR/demoCA/newcerts
cd $DIR

echo "=== 1. テストCAとデータベースの初期化 ==="
touch demoCA/index.txt
echo "1000" >demoCA/serial
echo "1000" >demoCA/crlnumber

# CAの作成
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout ca.key -out ca.crt -days 365 \
  -subj "/C=JP/ST=Tokyo/O=TestOrg/CN=Test Root CA"

echo "=== 2. テスト用証明書の作成 ==="
# 1枚目: 有効な証明書 (good.crt)
openssl req -newkey rsa:2048 -nodes -keyout good.key -out good.csr \
  -subj "/C=JP/ST=Tokyo/O=TestOrg/CN=good.example.com"
openssl ca -batch -in good.csr -out good.crt -keyfile ca.key -cert ca.crt -days 365

# 2枚目: 後で失効させる証明書 (revoked.crt)
openssl req -newkey rsa:2048 -nodes -keyout revoked.key -out revoked.csr \
  -subj "/C=JP/ST=Tokyo/O=TestOrg/CN=revoked.example.com"
openssl ca -batch -in revoked.csr -out revoked.crt -keyfile ca.key -cert ca.crt -days 365

echo "=== 3. 2枚目の証明書を失効処理 ＆ CRLファイルの生成 ==="
openssl ca -batch -revoke revoked.crt -keyfile ca.key -cert ca.crt

# CRL (証明書失効リスト) ファイルの生成
openssl ca -gencrl -out crl.pem -keyfile ca.key -cert ca.crt

echo "=== 4. OCSP レスポンダーの起動 (Port 8888) ==="
exec openssl ocsp -port 8888 \
  -index demoCA/index.txt \
  -CA ca.crt \
  -rsigner ca.crt \
  -rkey ca.key \
  -text
