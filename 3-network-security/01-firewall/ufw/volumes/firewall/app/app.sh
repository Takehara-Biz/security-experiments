#!/bin/sh

set -euo pipefail
set -x

ufw status verbose
# ROUTEルールを使って、Client -> Server への HTTP(port 80) 通信を許可
ufw route allow proto tcp from 192.168.10.2 to 192.168.20.2 port 80

# フォワード通信のデフォルトを DENY (破棄) に変更
sed -i 's/DEFAULT_FORWARD_POLICY="ACCEPT"/DEFAULT_FORWARD_POLICY="DROP"/' /etc/default/ufw
# -p icmp パス許可の行をコメントアウト (# を先頭に付与)
sed -i 's/^-A ufw-before-forward -p icmp/# -A ufw-before-forward -p icmp/' /etc/ufw/before.rules

ufw reload
ufw status verbose
