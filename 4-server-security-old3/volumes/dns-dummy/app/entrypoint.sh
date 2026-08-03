#!/bin/sh

apt-get update && apt-get install -y iproute2
ip route add 192.168.1.0/24 via 192.168.2.13

npm i dns-packet && node ./server.js
