#!/bin/bash
set -e

PORT=8080
PUBKEY_PATH="./public_key.pem"
WORK_DIR="/tmp/verify_work"

if [ ! -f "${PUBKEY_PATH}" ]; then
  echo "【エラー】 公開鍵 (${PUBKEY_PATH}) が見つかりません。"
  exit 1
fi

echo "=== [Receiver] ポート ${PORT} で待機を開始します (公開鍵読み込み完了) ==="

# 無限ループで受信し続ける
while true; do
  rm -rf "${WORK_DIR}"
  mkdir -p "${WORK_DIR}"

  echo "--------------------------------------------------"
  echo "[Receiver] データ待機中..."

  # ncで接続を受け分け、1行目をメッセージ、2行目をBase64署名として変数に格納
  # readの挙動を安定させるためIFS=を使用
  {
    IFS= read -r RECEIVED_MESSAGE
    IFS= read -r RECEIVED_SIG_B64
  } < <(nc -l -p ${PORT})

  echo "${RECEIVED_MESSAGE}"
  echo "${RECEIVED_SIG_B64}"

  # 受信データが空の場合はスキップ
  if [ -z "${RECEIVED_MESSAGE}" ] || [ -z "${RECEIVED_SIG_B64}" ]; then
    echo "【警告】 空のデータ、または不完全なデータを受信しました。"
    continue
  fi

  echo "[Receiver] データを受信しました。"
  echo "  - 受信メッセージ: \"${RECEIVED_MESSAGE}\""
  echo "  - 受信署名(Base64): ${RECEIVED_SIG_B64:0:30}..."

  # メッセージをファイルに保存
  echo -n "${RECEIVED_MESSAGE}" >"${WORK_DIR}/message.txt"

  # Base64署名をデコードしてバイナリに戻す
  echo "${RECEIVED_SIG_B64}" | base64 -d >"${WORK_DIR}/signature.bin"

  # 署名の検証
  if openssl dgst -sha256 -verify "${PUBKEY_PATH}" \
    -signature "${WORK_DIR}/signature.bin" \
    "${WORK_DIR}/message.txt" >/dev/null 2>&1; then
    echo "【検証成功】 署名は正当であり、メッセージは改ざんされていません。"
  else
    echo "【検証失敗】 署名が不正か、メッセージが改ざんされています。"
  fi
  echo "--------------------------------------------------"

  sleep 1
done
