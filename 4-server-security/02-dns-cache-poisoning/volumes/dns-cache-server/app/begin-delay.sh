#!/bin/sh

set -euo pipefail
set -x

# 既存の mangle ルールをクリア
iptables -t mangle -F
iptables -F

# 1. コンテナaから外部（port 53）へ送信したIPを記録する
iptables -A OUTPUT -p udp --dport 53 -m recent --set --name DNS_REQ --rdest

# 2. 記録されてから60秒以内の受信応答（192.168.1.12以外）はドロップする
iptables -A INPUT -p udp ! -s 192.168.1.12 --dport 53000 -m recent --update --seconds 60 --name DNS_REQ --rdest -j DROP
