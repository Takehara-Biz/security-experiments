#!/bin/sh

set -euo pipefail
set -x

# 1. ルートに prio キューを作成（handle 1:）
tc qdisc add dev eth0 root handle 1: prio bands 3

# 2. 2番目のバンド（1:2）にのみ 60秒の遅延（netem）を適用
tc qdisc add dev eth0 parent 1:2 handle 20: netem delay 60s

# 3. ICMP（Protocol 1）は遅延なしの 1:1 へ明示的に流す（最優先）
tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip protocol 1 0xff \
  flowid 1:1

# 4. UDP の 53番ポート（DNS）のみを遅延用バンド（1:2）へ流す
tc filter add dev eth0 protocol ip parent 1:0 prio 2 u32 \
  match ip protocol 17 0xff \
  match ip dport 53 0xffff \
  flowid 1:2

# 5. TCP の 53番ポート（DNS）も遅延させる場合
tc filter add dev eth0 protocol ip parent 1:0 prio 2 u32 \
  match ip protocol 6 0xff \
  match ip dport 53 0xffff \
  flowid 1:2

tc qdisc show dev eth0

# コンテナを起動させたままにする
#tail -f /dev/null

# BINDをIPv4限定モード（-4）で起動
named -g -d 3 -4
