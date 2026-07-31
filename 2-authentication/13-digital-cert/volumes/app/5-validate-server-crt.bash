#!/usr/bin/env bash

# エラー発生時にスクリプトを停止
set -e

echo ""
echo "=========================================="
echo " 5. 証明書の検証処理"
echo "=========================================="

# 5-1. CA証明書を使ってサーバー証明書が正当か検証
echo -n "[検証 1] Root CAによる証明書の検証: "
openssl verify -CAfile ca.crt server.crt

# 5-2. 秘密鍵と証明書が対になっているか検証 (公開鍵ハッシュ値の比較)
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
