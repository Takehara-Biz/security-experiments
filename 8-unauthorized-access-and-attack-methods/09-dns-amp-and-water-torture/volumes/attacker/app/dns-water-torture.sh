#!/bin/sh

DOMAIN="example1.test"
COUNT=10

echo "[${DOMAIN}] の名前解決を ${COUNT} 回実行します..."

i=1
while [ $i -le $COUNT ]; do
  echo "--- ${i}回目 ---"
  # 8文字のランダム文字列を生成
  LENGTH=8
  RANDOM_STR=$(tr -dc 'a-zA-Z0-9' </dev/urandom | head -c "$LENGTH")

  # AレコードのIPアドレス情報のみを抽出して表示
  dig @192.168.1.12 "${RANDOM_STR}.${DOMAIN}"

  i=$((i + 1))
done
