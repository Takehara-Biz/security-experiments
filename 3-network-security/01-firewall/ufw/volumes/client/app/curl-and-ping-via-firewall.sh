#!/bin/sh

set -euo pipefail
set -x

curl http://192.168.20.2
ping -c 3 192.168.20.2
