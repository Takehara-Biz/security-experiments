#!/bin/bash

echo "[BEGIN] entrypoint.bash"

# start DNS server
/usr/sbin/named -c /etc/bind/named.conf -u bind

# start mail server
# 最後のコマンドをフォアグラウンド実行させることで、コンテナの終了を防ぐ。
postfix start-fg

echo "[  END] entrypoint.bash"