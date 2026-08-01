#!/bin/sh

set -euo pipefail
set -x

iptables -F FORWARD
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -p tcp --dport 80 -j ACCEPT
iptables -P FORWARD DROP
