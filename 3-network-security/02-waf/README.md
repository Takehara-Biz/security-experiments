WAF (Web Application Firewall) に関する実験

owaspが提供している、juice-shopという脆弱性のあるWebアプリを利用する。

https://qiita.com/haw_ohnuma/items/6bb57b57efdf676155b2

これの手前にowaspのmodsecurity-crsを配置して、攻撃を防ぐ。

https://webspeed.ne.jp/blog/owasp-modsecurity/

「juice-shop」と「modsecurity-crs」の2つのコンテナを配置し、ホストOSのブラウザからjuice-shopに直アクセスした場合と、「modsecurity-crs」経由でアクセスした場合の違いを比較すると良い。
