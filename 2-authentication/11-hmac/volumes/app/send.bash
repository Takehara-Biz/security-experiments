#!/bin/bash

# --- 設定 ---
RECEIVER_IP="receiver" #受信側のDockerコンテナ名
PORT=9999
KEY_FILE="./sym.key"

if [ "$#" -ne 1 ]; then
    echo "送信したいメッセージを引数として1つ指定してください。"
    exit 1
fi

# 秘密鍵ファイルの存在確認
if [ ! -f "$KEY_FILE" ]; then
    echo "エラー: 秘密鍵ファイル ($KEY_FILE) が見つかりません。"
    exit 1
fi

# ファイルから秘密鍵を読み込み（余分な改行を除去）
SECRET_KEY=$(tr -d '\r\n' < "$KEY_FILE")

# HMAC-SHA256 の計算
hmac=$(echo -n "$1" | openssl dgst -sha256 -hmac "$SECRET_KEY" | awk '{print $NF}')

echo "=== 送信データ ==="
echo "使用鍵ファイル: $KEY_FILE"
echo "送信先        : $RECEIVER_IP:$PORT"
echo "メッセージ    : $1"
echo "HMAC値        : $hmac"

# メッセージとHMACを改行で繋いで nc で送信
printf "%s\n%s" "$1" "$hmac" | nc -w 3 $RECEIVER_IP $PORT

echo "送信完了！"
