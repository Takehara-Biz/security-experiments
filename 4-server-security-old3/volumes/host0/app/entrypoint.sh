#!/bin/sh

ip route add 192.168.2.0/24 via 192.168.1.13

/usr/sbin/named -g -d 3 -c /etc/bind/named.conf -u bind
