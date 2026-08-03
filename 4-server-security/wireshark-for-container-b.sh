#!/bin/sh

docker run --rm --net container:container_b nicolaka/netshoot tcpdump -i any -U -w - | wireshark -k -i -
