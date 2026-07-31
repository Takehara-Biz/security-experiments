#!/usr/bin/env bash

# エラー発生時にスクリプトを停止
set -e

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
