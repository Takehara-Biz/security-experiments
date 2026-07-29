#!/bin/sh

echo "1. チャレンジ（シーケンスとシードの取得）を要求中..."

# curlでチャレンジAPIを叩き、レスポンスを取得
RESPONSE=$(curl -s -X POST "http://server:3000/api/challenge" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"user1\"}")

echo "サーバー応答: $RESPONSE"

# 簡易的なJSONパース（jqを使わず、sedで値を取り出す）
SEED=$(echo "$RESPONSE" | sed -n 's/.*"seed":"\([^"]*\)".*/\1/p')
SEQUENCE=$(echo "$RESPONSE" | sed -n 's/.*"sequence":\([0-9]*\).*/\1/p')

if [ -z "$SEED" ] || [ -z "$SEQUENCE" ]; then
    echo "エラー: シードまたはシーケンスの取得に失敗しました。"
    exit 1
fi

echo ""
echo "2. クライアント側でOTPを計算中... (必要なハッシュ回数: $SEQUENCE 回)"

# 1回目のハッシュ計算（秘密鍵 + シード）
CURRENT_HASH=$(printf "%s" "pass1${SEED}" | openssl dgst -sha256 | awk '{print $2}')

# sh用のループ（whileとカウンター変数を使用）
i=1
while [ "$i" -lt "$SEQUENCE" ]; do
    # 前回のハッシュ値を次の入力にして再ハッシュ化
    CURRENT_HASH=$(printf "%s" "$CURRENT_HASH" | openssl dgst -sha256 | awk '{print $2}')
    i=$((i + 1))
done

echo "計算されたOTP: $CURRENT_HASH"

echo ""
echo "3. ログインを要求中..."

# 計算したOTPを送信してログイン
LOGIN_RESPONSE=$(curl -s -X POST "http://server:3000/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"user1\", \"otp\":\"$CURRENT_HASH\"}")

echo "ログイン結果: $LOGIN_RESPONSE"
