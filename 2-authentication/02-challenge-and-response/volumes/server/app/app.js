const http = require("http")
const crypto = require("crypto")

// 擬似データベース（ユーザー名とパスワード）
const USER_DB = { "user1": "pass1" }

// セッション管理用（ランダム文字列: ユーザー名）
const challenges = new Map()

const server = http.createServer((req, res) => {
  console.log("begin");
  console.log(getLoggableReq(req));
  const url = new URL(req.url, `http://${req.headers.host}`)

  // 1. チャレンジ（ランダム文字列）の発行を要求された場合
  if (url.pathname === "/get-challenge" && req.method === "GET") {
    const username = url.searchParams.get("username")
    
    if (!username || !USER_DB[username]) {
      res.writeHead(400, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ error: "ユーザーが見つかりません" }))
    }

    // ランダムなチャレンジ文字列を生成
    const challenge = crypto.randomBytes(16).toString("hex")
    challenges.set(challenge, username)

    // 1分後にチャレンジを無効化（タイムアウト処理）
    setTimeout(() => challenges.delete(challenge), 60000)

    res.writeHead(200, { "Content-Type": "application/json" })
    console.info("チャレンジを発行しました : " + challenge)
    return res.end(JSON.stringify({ challenge }))
  }

  // 2. レスポンス（検証）を要求された場合
  if (url.pathname === "/login" && req.method === "POST") {
    let body = ""
    req.on("data", chunk => body += chunk)
    req.on("end", () => {
      try {
        const { username, challenge, response } = JSON.parse(body)

        // チャレンジが存在し、かつ該当ユーザーのものか確認
        if (!challenges.has(challenge) || challenges.get(challenge) !== username) {
          console.warn("不正または期限切れのチャレンジです")
          res.writeHead(401, { "Content-Type": "application/json" })
          return res.end(JSON.stringify({ error: "不正または期限切れのチャレンジです" }))
        }

        // 使用済みのチャレンジは即座に削除（リプレイ攻撃対策）
        challenges.delete(challenge)

        // サーバー側で正解のレスポンス（ハッシュ値）を計算
        // 計算式: SHA-256( チャレンジ + パスワード )
        const actualPassword = USER_DB[username]
        const expectedResponse = crypto
          .createHash("sha256")
          .update(challenge + actualPassword)
          .digest("hex")

        // クライアントから届いたハッシュ値と一致するか検証
        if (response === expectedResponse) {
          console.info("ログインに成功しました！")
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ message: "ログインに成功しました！" }))
        } else {
          console.warn("パスワードが間違っています")
          res.writeHead(401, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "パスワードが間違っています" }))
        }
      } catch (e) {
        console.error("不正なリクエストデータです")
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "不正なリクエストデータです" }))
      }
    })
    return
  }

  // 3. それ以外のリクエスト
  res.writeHead(404, { "Content-Type": "text/plain" })
  res.end("Not Found")
})

server.listen(3000, () => {
  console.log("サーバーがポート3000で起動しました")
})

function getLoggableReq(req) {
  return {
    method: req.method,
    url: req.originalUrl || req.url,
    query: req.query,
    body: req.body,
    ip: req.ip || req.socket.remoteAddress
  };
}