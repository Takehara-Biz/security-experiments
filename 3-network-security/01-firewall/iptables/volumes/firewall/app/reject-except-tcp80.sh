#!/bin/sh

set -euo pipefail
set -x

# 現在のルールを確認
iptables -L -n --line-numbers
# 既存のFORWARDチェインのルールをすべて削除
iptables -F FORWARD
# すでに接続済みの通信（ESTABLISHED）と、それに関連して発生した通信（RELATED）の通過を許可します。内部からWebサイトにアクセスした際、その「戻りのパケット」が遮断されないようにします。
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -p tcp --dport 80 -j ACCEPT
# FORWARDチェインのデフォルトポリシーを「破棄（DROP）」に設定します。上記の許可ルールに一致しなかったすべての通信を拒否する安全な状態にします。
iptables -P FORWARD DROP

iptables -L -n --line-numbers
