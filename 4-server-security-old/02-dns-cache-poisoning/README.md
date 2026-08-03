DNSキャッシュポイズニングの実験です。（悪用厳禁）

Dockerコンテナ内に閉じた実験です。

実験のためにサーバのセキュリティ強度をわざと下げています。

DNSのAレコードの問い合わせが、
attacker -> child-dns-cache-server -> parent-dns-cache-server -> 外部DNSサーバ
の順に行われます。
parent-dns-cache-serverの53番ポートに入ってくる全てのパケットを遅延させます。

その隙に、attackerがchild-dns-cache-serverに偽のレスポンスを送ります。
