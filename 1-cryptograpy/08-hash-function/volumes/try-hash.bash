#!/bin/bash

# 引数の数（$#）が 0 の場合に処理を実行
if [ $# -eq 0 ]; then
    echo "エラー: ハッシュ化したい文字列を引数に指定してください。" >&2
    echo "使い方: $0 [引数]" >&2
    exit 1
fi

set -x

# opensslコマンドで様々なハッシュ値を生成可能。md5とsha1は非推奨。
echo -n "$1" | openssl dgst -md5
echo -n "$1" | openssl dgst -sha1
echo -n "$1" | openssl dgst -sha256
echo -n "$1" | openssl dgst -sha512
echo -n "$1" | openssl dgst -sha3-256
echo -n "$1" | openssl dgst -sha3-512
