#!/usr/bin/env bash

# エラー発生時にスクリプトを停止
set -e

echo ""
echo "=========================================="
echo " 2. サーバー用 秘密鍵とCSR (証明書署名要求) とSAN(主体者代替名) 設定ファイルの作成"
echo "=========================================="

echo "2-1. サーバーの秘密鍵を作成"
openssl genrsa -out server.key 2048 2>/dev/null
echo "[+] サーバー秘密鍵を作成しました: server.key"
cat ./server.key

echo "2-2. CSR (Certificate Signing Request) を作成"
openssl req -new \
  -key server.key \
  -out server.csr \
  -subj "/C=JP/ST=Tokyo/O=ExampleCorp/CN=my.domain.com"
echo "[+] CSRを作成しました: server.csr"
cat ./server.csr

echo "↑意味のある文章に変換して出力します"
openssl req -in server.csr -text -noout

echo "2-3. SAN (主体者代替名) 設定ファイルの作成"
# 現代のTLS/SSL検証では SAN (Subject Alternative Name) が必須です
cat <<EOF >server.ext
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = example.com
DNS.2 = *.example.com
EOF
echo "[+] SAN設定ファイルを作成しました: server.ext"
cat ./server.ext

# SAN（Subject Alternative Name）が必要になった最大の理由は、
# 従来の CN（Common Name）だけでは現代の多様なWeb利用環境（マルチドメインやワイルドカード、IPアドレス指定など）に対応できず、
# セキュリティ上の脆弱性があったからです。
# 現在（Google Chrome 58以降や各種モダンブラウザ・通信ライブラリ）では、CN は非推奨（無視）され、SAN の確認が完全な必須要件となっています。

# SANが必要な3つの主な理由

# 1. 1枚の証明書で複数のドメインを保護するため（マルチドメイン）
# 従来の CN には、文字列を1つしか記述できないという根本的な制約がありました。
# CN のみの場合: example.com 用と sub.example.com 用で、別々に証明書を発行して管理する必要があった。
# SAN を使う場合: 1枚の証明書の中に複数のドメイン（example.com, example.net, another-domain.com など）を並べて記載可能。

# 2. IPアドレスやモバイル環境への対応
# CN はあくまで「ドメイン名（文字列）」を想定した設計でした。
# 一方、SAN は構造化されたデータ領域になっており、ドメイン名（DNS）だけでなく IPアドレス（IP:192.168.1.1） や メールアドレス（email:） などを明確な識別子として埋め込むことができます。

# 3. 「ドメイン名のなりすまし」を防ぐセキュリティ向上
# CN は単なる1行のテキストフィールドだったため、歴史的に名前の検証仕様が曖昧で、ブラウザや実装によって表記の解釈に揺れがあり、なりすまし（MITM攻撃）の隙を生む原因になっていました。
# SAN では「これがDNS名なのか」「IPアドレスなのか」が厳格に構造化されて定義されているため、安全に一致判定が行えます。
# CN と SAN の役割の比較
