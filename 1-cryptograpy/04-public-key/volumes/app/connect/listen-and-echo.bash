#!/bin/bash
set -euo pipefail 

echo "waiting message... send from another container!"

while true; do
  # 接続が来るまで待ち受け、データを一時ファイルに保存
  nc -l -p 8080 > tmp.enc
  
  # 受信データがあれば復号して表示、一時ファイルを削除
  if [ -s tmp.enc ]; then
    openssl pkeyutl -decrypt -inkey ./private_key.pem -in tmp.enc
    echo "" # 改行用
  fi
  rm -f tmp.enc
done
