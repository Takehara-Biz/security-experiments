#!/bin/bash
set -e

RECEIVER_HOST="receiver"
PORT=8080
PRIVKEY_PATH="./private_key.pem"

if [ "$#" -ne 1 ]; then
  echo "送信したいメッセージを引数として1つ指定してください。"
  exit 1
fi

if [ ! -f "${PRIVKEY_PATH}" ]; then
  echo "【エラー】 秘密鍵 (${PRIVKEY_PATH}) が見つかりません。"
  exit 1
fi

echo "=== [Sender] 処理を開始します ==="

# メッセージに対するデジタル署名（SHA256）を作成し、Base64エンコード（改行を除去）
# openssl dgst は標準入力から読み込み、バイナリ署名を base64 で1行の文字列に変換
SIG_B64=$(echo -n "$1" | openssl dgst -sha256 -sign "${PRIVKEY_PATH}" | base64 | tr -d '\r\n')

echo "[Sender] メッセージ: \"${1}\""
echo "[Sender] 署名(Base64): ${SIG_B64:0:30}..."

# 4. tarでまとめてnc経由で送信（秘密鍵は含めない）
echo "[Sender] データをネットワーク経由で送信中..."
printf "%s\n%s\n" "${1}" "${SIG_B64}" | nc -N ${RECEIVER_HOST} ${PORT}

echo "=== [Sender] 送信完了 ==="
