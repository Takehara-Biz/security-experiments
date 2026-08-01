#!/bin/sh

set -euo pipefail
set -x

# 1. UFWのデフォルトフォワードポリシーを ACCEPT に変更（ルーターとして機能させるため）
sed -i 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw

# 2. UFWの設定ファイル側でも IP Forwarding を有効化
sed -i 's/#net\/ipv4\/ip_forward=1/net\/ipv4\/ip_forward=1/' /etc/ufw/sysctl.conf

# 3. UFWを有効化（--force で対話プロンプトをスキップ）
ufw --force enable

# 4. コンテナを常時起動
exec tail -f /dev/null
