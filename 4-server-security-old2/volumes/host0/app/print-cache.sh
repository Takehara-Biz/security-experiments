#!/bin/sh

set -euo pipefail
echo "example.comのAレコードのキャッシュ情報がもしあれば、以下に出力します。"

set -x
# メモリ内のキャッシュ情報をファイルに出力
rndc dumpdb -cache
cat /var/cache/bind/named_dump.db | grep -A 5 "example.com."
