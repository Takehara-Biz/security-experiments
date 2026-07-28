Dockerコンテナ「receiver」で、メッセージを待ち受け、受信したら復号化して標準出力する。
Dockerコンテナ「sender」から「encrypt-and-send.bash」を実行すると、標準入力から受け取った文字列を暗号化して、receiverに送流。
