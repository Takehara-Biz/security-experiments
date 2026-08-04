# ubuntuをカスタマイズしたものを利用する。
# bindが初期インストールされたDockerイメージでは、shやbashなどのシェルが使えず学習しづらいため、ubuntuベースで構築することにした。
FROM ubuntu:26.04

# digコマンドを使うためdnsutilsをインストール
# pingコマンドを使うためiputils-pingをインストール
RUN apt-get update && apt-get install -y bind9 bind9utils dnsutils iputils-ping

CMD ["/usr/sbin/named", "-g", "-c", "/etc/bind/named.conf", "-u", "bind"]