#!/bin/bash
# 

# -dをつけると復号する。
cat ./encrypted.txt | openssl enc -d -aes-256-cbc -a -pbkdf2 -pass file:../sym.key
