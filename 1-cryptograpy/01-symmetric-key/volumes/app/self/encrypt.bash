#!/bin/bash
echo -n "暗号化したい文字列" | openssl enc -aes-256-cbc -a -salt -pbkdf2 -pass file:../sym.key > ./encrypted.txt
