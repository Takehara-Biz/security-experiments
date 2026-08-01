iptablesを使った実験手順

1. docker-compose up -d
1. clientから配置済みのshファイルを実行して成功することを確認する。
1. firewallから配置済みのshファイルを実行して、tcp80番ポート以外の通信をブロックする。
1. 再度clientからshファイルを実行すると、80番ポートへの通信のみ成功するように変わる。
