const http = require("http");
const fs = require("fs");
const path = require("path");
const querystring = require("querystring");

// アップロード先ディレクトリの作成（なければ作成）
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// メモリ上の簡易データベース (試験問題のタスク情報を模したもの)
let tasks = [{ id: 1, title: "仕様書の確認", createdBy: "元従業員Z" }];

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
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; object-src 'none';",
  );
  // 2. MIMEスニッフィング防止
  res.setHeader("X-Content-Type-Options", "nosniff");

  // ------------------------------------------
  // 1. GET /tasks (タスク一覧表示 - XSSの表示側対策)
  // ------------------------------------------
  if (url.pathname === "/tasks" && req.method === "GET") {
    let listHtml = tasks
      .map((t) => {
        // 出力時に必ず escapeHTML を介すことで保存型XSSを無害化 (設問2/3対策)
        return `<li>[ID: ${t.id}] ${escapeHTML(t.title)} (作成者: ${escapeHTML(t.createdBy)})</li>`;
      })
      .join("");

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Sサービス - タスク一覧 (標準モジュール版)</title></head>
      <body>
        <h1>タスク一覧</h1>
        <ul>${listHtml}</ul>
        <h2>タスク追加</h2>
        <form action="/tasks" method="POST">
          <input type="text" name="title" placeholder="タスク名を入力" size="40" required />
          <button type="submit">作成</button>
        </form>
        <br><a href="/upload">ファイルアップロード画面へ</a>
      </body>
      </html>
    `);
    return;
  }

  // ------------------------------------------
  // 2. POST /tasks (タスク作成処理)
  // ------------------------------------------
  if (url.pathname === "/tasks" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const parsed = querystring.parse(body);
      if (parsed.title) {
        tasks.push({
          id: tasks.length + 1,
          title: parsed.title, // DBへは生の入力を保存（表示時にエスケープ）
          createdBy: "一般ユーザー",
        });
      }
      // リダイレクト (303 See Other)
      res.writeHead(303, { Location: "/tasks" });
      res.end();
    });
    return;
  }

  // ------------------------------------------
  // 3. GET /upload (アップロード画面)
  // ------------------------------------------
  if (url.pathname === "/upload" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <!DOCTYPE html>
      <html>
      <body>
        <h1>ファイルアップロード</h1>
        <form action="/upload" method="POST" enctype="multipart/form-data">
          <input type="file" name="file" required />
          <button type="submit">送信</button>
        </form>
      </body>
      </html>
    `);
    return;
  }

  // ------------------------------------------
  // 4. POST /upload (手動マルチパート解析による簡易保存)
  // ------------------------------------------
  if (url.pathname === "/upload" && req.method === "POST") {
    let chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      // ランダムなファイル名を生成して保存
      const filename = `uploaded_${Date.now()}.bin`;
      const filePath = path.join(UPLOAD_DIR, filename);

      // (※解説用の簡易保存処理: マルチパートヘッダーの除去は省略しバイナリとして保存)
      fs.writeFileSync(filePath, buffer);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <p>ファイルを受け取りました。</p>
        <a href="/download?file=${filename}">ダウンロードテスト</a>
      `);
    });
    return;
  }

  // ------------------------------------------
  // 5. GET /download (安全なダウンロード処理 - 設問3対策)
  // ------------------------------------------
  if (url.pathname === "/download" && req.method === "GET") {
    const filename = url.searchParams.get("file");
    // ディレクトリトラバーサル（/../ などの悪用）対策
    const safeFilename = path.basename(filename || "");
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("ファイルが見つかりません。");
      return;
    }

    // ==========================================
    // 対策: Content-Disposition によるブラウザ実行の阻止
    // ==========================================
    // 偽装拡張子（例: .html などのスクリプト）がブラウザ内で「実行」されるのを防ぐため、
    // インライン表示（inline）ではなく強制ダウンロード（attachment）を指定する
    res.writeHead(200, {
      "Content-Type": "application/octet-stream", // 一般的なバイナリ形式として扱う
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    });

    // ファイルのストリーム送信
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    return;
  }

  // 404 Not Found
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
});

// サーバー起動 (ポート 3000)
server.listen(3000, () => {
  console.log(
    "標準モジュール版 サーバーが起動しました: http://localhost:3000/tasks",
  );
});
