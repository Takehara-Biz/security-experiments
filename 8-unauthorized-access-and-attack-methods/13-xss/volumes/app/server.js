const http = require("http");
const fs = require("fs");
const path = require("path");
const querystring = require("querystring");

// HTMLエスケープ関数（XSS対策）
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag] || tag,
  );
}

// HTTPサーバーの作成
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ==========================================
  // セキュリティヘッダーの共通設定 (試験の問1 設問1対策)
  // ==========================================
  // 1. CSP: 外部スクリプトやインラインスクリプトの無許可実行を制限
  // res.setHeader(
  //   "Content-Security-Policy",
  //   "default-src 'self'; script-src 'self'; object-src 'none';",
  // );
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Frame-Options", "SAMEORIGIN"); //クリックジャッキング対策
  res.setHeader("Content-Security-Policy", "default-src 'self';");
  res.setHeader("X-Content-Type-Options", "nosniff");

  // ------------------------------------------
  // 1. GET / (ログイン画面表示)
  // ------------------------------------------
  if (url.pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <h1>クロスサイトスクリプティング(XSS)実験</h1>
      <h2>反射型 (Reflected) XSS</h2>
      <p>お問い合わせフォーム</p>
      <form action="reflected-xss" method="post">
        <textarea name="textarea">&lt;script&gt;alert(&#39aa&#39);&ltscript&gt;</textarea>
        <p>
          安全：<input type="radio" name="isSafe" value="true" checked/>&nbsp;
          危険：<input type="radio" name="isSafe" value="false" />
        </p>
        <input type="submit" value="確認画面に進む" />
      </form>
    `);
    return;
  }

  if (url.pathname === "/reflected-xss" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    // 受信完了時の処理
    req.on("end", () => {
      // 届いたフォームデータを解析
      const params = new URLSearchParams(body);
      console.debug("params : ", params);

      // オブジェクトに変換して取り出す
      const textarea = params.get("textarea");
      const isSafe = Boolean(params.get("isSafe"));

      let printText;
      if (isSafe) {
        printText = escapeHTML(printText);
      } else {
        printText = textarea;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <h1>反射型 (Reflected) XSS - 安全</h1>
        <p>以下の内容で送信してよろしいでしょうか？</p>
        <p>${printText}</p>
      `);
    });
    return;
  }

  if (url.pathname === "/pay" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    // 受信完了時の処理
    req.on("end", () => {
      // 入力されたフォームデータを取得
      const parsedData = querystring.parse(body);
      const amount = parseInt(parsedData.amount);
      remaining_money -= amount;

      // リダイレクト (303 See Other)
      res.writeHead(303, { Location: "/relected-xss-safe" });
      res.end();
    });
    return;
  }

  // ------------------------------------------
  // 2. POST /login (ログイン処理)
  // ------------------------------------------
  if (url.pathname === "/login" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    // 受信完了時の処理
    req.on("end", () => {
      // 入力されたフォームデータを取得
      const parsedData = querystring.parse(body);
      const userId = parsedData.userid;

      // 簡易的なユーザ認証処理。
      const user = usersDB[userId];

      if (!user) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("ユーザID又はパスワードが不正です。");
      }

      console.info("ログインしたユーザーID:", userId);
      res.setHeader("Set-Cookie", `userId=${userId}; Path=/;`);
      // 302 Found (一時的なリダイレクト) の場合
      res.writeHead(302, {
        Location: "/project-progress",
      });

      // レスポンスを終了する
      res.end();
    });
    return;
  }

  // 404 Not Found
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(
    `404 Not Found. url.pathname=${url.pathname}, req.method=${req.method}`,
  );
});

// サーバー起動 (ポート 3000)
server.listen(3000, () => {
  console.log("Nginxが起動しました: http://localhost:3000/");
});
