# ubuntuをカスタマイズしたものを利用する。
# bindが初期インストールされたDockerイメージでは、shやbashなどのシェルが使えず学習しづらいため、ubuntuベースで構築することにした。
FROM ubuntu:26.04

# digコマンドを使うためdnsutilsをインストール
# pingコマンドを使うためiputils-pingをインストール
RUN apt-get update && apt-get install -y bind9 bind9utils dnsutils iputils-ping

# キャッシュサーバの持つキャッシュサーバをコンソール出力できるよう、rndc.key を事前に自動生成する
RUN rndc-confgen -a -u bind && \
    chown bind:bind /etc/bind/rndc.key && \
    chmod 640 /etc/bind/rndc.key
    
ENTRYPOINT [ "./entrypoint.sh" ]
