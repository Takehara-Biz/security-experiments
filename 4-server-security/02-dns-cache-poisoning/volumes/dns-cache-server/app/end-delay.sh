#!/bin/sh

set -euo pipefail
set -x

# 既存の mangle ルールをクリア
iptables -t mangle -F
iptables -F
