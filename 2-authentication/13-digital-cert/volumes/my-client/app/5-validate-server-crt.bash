#!/usr/bin/env bash

# エラー発生時にスクリプトを停止
set -e

echo ""
echo "=========================================="
echo " 5. 証明書の検証処理"
echo "=========================================="

echo "CA証明書を使ってサーバー証明書が正当か検証: "
openssl verify -CAfile ./share/ca.crt ./share/server.crt
echo "↑OKならば、サーバー証明書は、Root CAによってサインされたことが保証される"
