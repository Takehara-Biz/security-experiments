Ubuntu版v1.0.0の「5章 DNSサーバーの構築」を、Docker(docker-compose)で実現したものです。

docker-composeで、以下のホストを立ち上げます。

* host0.test
* host1.example1.test
* host2.example2.test

それぞれの役割は、テキストを参照してください。

# 簡単な動作確認

いずれかあるいは全てのDockerコンテナの中にexecで入った後、以下の3つのコマンドを打ち、Answerが帰ってきていれば構築成功です。

```bash
$ dig host0.test
$ dig host1.example1.test
$ dig host2.example2.test
```

成功例（上記のコマンド実行直後に表示される文字列の一部）

```bash
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
```

↑下の方に、問い合わせたターゲットのIPアドレスが表示されます。

失敗例

```bash
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 1
```

↑ANSWERがゼロなら失敗です。