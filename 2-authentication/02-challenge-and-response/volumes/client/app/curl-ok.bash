#!/bin/sh
# echo;はただの改行。
echo "correct hash";

echo "=== 1. チャレンジ文字列を取得中 ==="
RESPONSE=$(curl server:3000/get-challenge?username=user1); echo;echo;
CHALLENGE=$(echo "$RESPONSE" | grep -o '"challenge":"[^"]*' | grep -o '[^"]*$')
if [ -z "$CHALLENGE" ]; then
    echo "エラー: チャレンジの取得に失敗しました。サーバーの応答:"
    echo "$RESPONSE"
    exit 1
fi
echo "取得したチャレンジ: ${CHALLENGE}"

echo -e "\n=== 2. レスポンス（ハッシュ値）を計算中 ==="
# 「チャレンジ + パスワード」の文字列を作成
RAW_STRING="${CHALLENGE}pass1"
# SHA-256でハッシュ化（改行コードを入れないよう echo -n を使用）
HASH=$(echo -n "${RAW_STRING}" | openssl dgst -sha256 -hex | sed 's/^.* //')
echo "計算されたハッシュ: ${HASH}"

echo -e "\n=== 3. ログインをリクエスト中 ==="
# JSONデータを作成
JSON_DATA="{\"username\":\"user1\",\"challenge\":\"${CHALLENGE}\",\"response\":\"${HASH}\"}"

# POSTリクエストを送信
curl -v -X POST \
     -H "Content-Type: application/json" \
     -d "${JSON_DATA}" \
     "server:3000/login"
