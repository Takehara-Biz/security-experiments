ファイアウォールに関する実験。iptablesとufwの2種類で行う。

iptables

- カーネルの機能を直接操作する、細かくて難しいツール
- 命令の書き方が長く、覚えることが多い複雑なネットワークの制御に向いている

ufw (Uncomplicated FireWall)

- iptablesを分かりやすく簡単に使うための道具
- 短い言葉でパッと設定ができるふつうのWebサーバーなど、簡単な設定に向いている

使い方のかんたん比較ポート（80番を開けるとき）

- iptables: sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
- ufw: sudo ufw allow 80
