#!/bin/bash

PORT=9999
KEY_FILE="./sym.key"

# 秘密鍵ファイルの存在確認
if [ ! -f "$KEY_FILE" ]; then
    echo "エラー: 秘密鍵ファイル ($KEY_FILE) が見つかりません。"
    exit 1
fi

# ファイルから秘密鍵を読み込み（余分な改行を除去）
SECRET_KEY=$(tr -d '\r\n' < "$KEY_FILE")

echo "=========================================="
echo " HMAC受信サーバーを起動しました (ポート: $PORT)"
echo " 終了するには Ctrl+C を押してください"
echo "=========================================="

# 無限ループで受信を継続
while true; do
    echo -e "\n[待機中] 送信からの接続を待っています..."

    # nc でデータを受信（1回の接続処理が終わると標準出力に出力される）
    DATA=$(nc -l $PORT)

    # 空の接続（スキャン等）の場合はスキップ
    if [ -z "$DATA" ]; then
        continue
    fi

    # 改行コードでメッセージとHMACを分割
    RECEIVED_MESSAGE=$(echo "$DATA" | head -n 1)
    RECEIVED_HMAC=$(echo "$DATA" | tail -n 1)

    # 受信側での HMAC 再計算
    EXPECTED_HMAC=$(echo -n "$RECEIVED_MESSAGE" | openssl dgst -sha256 -hmac "$SECRET_KEY" | awk '{print $NF}')

    echo "--- 受信データ処理 ---"
    echo "受信日時      : $(date '+%Y-%m-%d %H:%M:%S')"
    echo "受信メッセージ: $RECEIVED_MESSAGE"
    echo "受信HMAC      : $RECEIVED_HMAC"
    echo "計算HMAC      : $EXPECTED_HMAC"

    if [ "$RECEIVED_HMAC" = "$EXPECTED_HMAC" ]; then
        echo "判定          : 【成功】 正当なメッセージです。"
    else
        echo "判定          : 【警告】 検証失敗！改ざんまたは鍵の不一致です。"
    fi
done