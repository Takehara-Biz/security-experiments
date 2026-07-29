const http = require("http");
const util = require('util');

const server = http.createServer((req, res) => {
  console.log("begin");
  // depth（深さ）を浅くして見やすくする
  console.log(util.inspect(req, { depth: 1, colors: true }));
  const authHeader = req.headers["authorization"]

  if (!authHeader) {
    console.warn("no authHeader!");
    return askForAuth(res)
  }

  // "Basic dXNlcm5hbWU6cGFzc3dvcmQ=" からトークン部分を抽出
  const authType = authHeader.split(" ")[0]
  const authToken = authHeader.split(" ")[1]

  if (authType !== "Basic" || !authToken) {
    console.warn("no Basic or no Token!");
    return askForAuth(res)
  }

  // Base64をデコードして "ユーザー名:パスワード" を取得
  const credentials = Buffer.from(authToken, "base64").toString("ascii")
  const [username, password] = credentials.split(":")

  // ユーザー名とパスワードの検証
  if (username === "user1" && password === "pass1") {
    console.info("username and password are correct!");
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("ログインに成功しました！")
  } else {
    console.warn("username or password is incorrect!");
    return askForAuth(res)
  }
})

// 認証ダイアログを表示させる関数
function askForAuth(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Secure Area"',
    "Content-Type": "text/plain; charset=utf-8"
  })
  res.end("認証が必要です。")
}

server.listen(3000, () => {
  console.log("サーバーがポート3000で起動しました")
})
