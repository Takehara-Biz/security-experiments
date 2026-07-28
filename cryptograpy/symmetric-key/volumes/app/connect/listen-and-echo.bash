#!/bin/bash
set -euo pipefail 

echo "waiting message... send from another container!"

# -l listen
# -k keep connection
# 最後の echo "";は改行の意味。
#nc -lk -p 8080 | while read -r line; do echo "$line" | openssl enc -d -aes-256-cbc -a -pbkdf2 -pass file:../sym.key; echo ""; done

nc -lk -p 8080 | while read -r line; do echo "$line" | openssl enc -d -aes-256-cbc -a -pbkdf2 -pass file:./sym.key; echo ""; done
