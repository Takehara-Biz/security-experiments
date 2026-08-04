#!/bin/sh

# モニタリングしたいコンテナ名を

docker run --rm --net container:$1 nicolaka/netshoot tcpdump -i any -U -w - | wireshark -k -i -
