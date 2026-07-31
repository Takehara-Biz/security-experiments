#!/bin/bash

# エラー発生時にスクリプトを停止
set -e

# カレントディレクトリ以下の .crt / .key / .csr / .ext / .srl ファイルを再帰的に削除
find . -type f \( \
  -name "*.crt" -o \
  -name "*.key" -o \
  -name "*.csr" -o \
  -name "*.ext" -o \
  -name "*.srl" \
  \) -delete
