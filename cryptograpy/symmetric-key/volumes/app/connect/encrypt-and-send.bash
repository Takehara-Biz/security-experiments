#!/bin/bash
set -euo pipefail 

echo "=== 暗号化メッセージ送信スクリプト ==="
echo "終了するには 'exit' と入力するか、Ctrl+C を押してください。"
echo "----------------------------------------"

while true; do
  # ユーザーからの入力を受け取る
  read -p "送信するメッセージ > " msg

  # 'exit' と入力されたらループを抜ける
  if [ "$msg" = "exit" ]; then
      echo "終了します。"
      break
  fi

  # 空文字の場合はスキップ
  if [ -z "$msg" ]; then
      continue
  fi

  echo "$msg" | openssl enc -aes-256-cbc -a -pbkdf2 -pass file:../sym.key | nc -N receiver 8080
  echo "送信完了"
done
