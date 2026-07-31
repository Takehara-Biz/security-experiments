#!/usr/bin/env bash

# エラー発生時にスクリプトを停止
set -e

echo ""
echo "=========================================="
echo " 4. 証明書の検証処理"
echo "=========================================="

echo "4-1. CA証明書を使ってサーバー証明書が正当か検証"
echo -n "[検証 1] Root CAによる証明書の検証: "
openssl verify -CAfile ./share/ca.crt ./share/server.crt
echo "↑OKならば、サーバー証明書は、Root CAによってサインされたことが保証される"
