#!/bin/sh

set -euo pipefail

# 16進数を10進数に変換して表示する。16進数の文字列を、本スクリプト実行時の引数に指定すること。
printf "%d\n" $1
