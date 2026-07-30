#!/bin/sh

# サーバーへPOSTリクエスト。otpは適当な数字
RESPONSE=$(curl -s -X POST "http://server:3000/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"otp\":\"123456\"}")

echo "サーバーからの応答: $RESPONSE"
