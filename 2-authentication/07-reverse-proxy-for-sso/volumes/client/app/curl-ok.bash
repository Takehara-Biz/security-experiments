#!/bin/sh

SHARED_SECRET="my_super_secret_shared_key_12345"

echo "1. クライアント側で現在の時刻からTOTPを計算中..."

# 1. 30秒単位のタイムステップを計算
# （現在の秒数を取得して30で割り、端数を切り捨てる）
NOW=$(date +%s)
TIME_STEP=$((NOW / 30))

# 2. タイムステップ（10進数）を8バイトのBig Endianバイナリデータに変換
# 16進数の文字列（16桁）に変換
HEX_STEP=$(printf "%016x" $TIME_STEP)

# printfを使って、16進数文字列を実際のバイナリデータに変換して一時ファイルに保存
# （純粋なshでバイナリを扱うための一般的な手法です）
printf "$(echo "$HEX_STEP" | sed 's/../\\x&/g')" > /tmp/totp_step.bin

# 3. opensslで秘密鍵を使い、バイナリデータに対してHMAC-SHA1を計算
# 出力は16進数の文字列（40文字）
HMAC_HEX=$(openssl dgst -sha1 -hmac "$SHARED_SECRET" -r /tmp/totp_step.bin | awk '{print $1}')
rm -f /tmp/totp_step.bin

# 4. 動的切り出し（最後の4ビットからオフセット位置を特定）
# 最後の1文字（16進数）を取得
LAST_CHAR=$(printf "%s" "$HMAC_HEX" | sed 's/.*\(.\)$/\1/')
OFFSET=$(printf "%d" "0x$LAST_CHAR")

# オフセット位置から4バイト（16進数で8文字）を抽出
START_INDEX=$((OFFSET * 2 + 1))
FOUR_BYTES=$(printf "%s" "$HMAC_HEX" | cut -c "$START_INDEX-$((START_INDEX + 7))")

# 最上位ビット（MSB）をクリアして整数に変換
CODE_HEX=$(printf "%08x" $((0x$FOUR_BYTES & 0x7fffffff)))
CODE_DEC=$(printf "%d" "0x$CODE_HEX")

# 5. 6桁の数字にする
OTP=$((CODE_DEC % 1000000))
OTP_STRING=$(printf "%06d" $OTP)

echo "現在のOTP (有効期限: 30秒): $OTP_STRING"

echo ""
echo "2. サーバーにOTPを送信してログインを試みます..."

# サーバーへPOSTリクエスト
RESPONSE=$(curl -s -X POST "http://server:3000/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"otp\":\"$OTP_STRING\"}")

echo "サーバーからの応答: $RESPONSE"
