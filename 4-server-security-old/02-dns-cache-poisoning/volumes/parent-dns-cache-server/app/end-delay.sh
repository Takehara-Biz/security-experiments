#!/bin/sh

set -euo pipefail
set -x

tc qdisc del dev eth0 root netem
