#!/bin/sh

set -euo pipefail
set -x

#tc qdisc add dev eth0 root netem delay 60s
tc qdisc show dev eth0

# コンテナを起動させたままにする
tail -f /dev/null
