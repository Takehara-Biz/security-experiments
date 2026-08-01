const http = require("http");
const fs = require("fs");
const path = require("path");
const querystring = require("querystring");
const crypto = require("crypto");

// アップロード先ディレクトリの作成（なければ作成）
const UPLOAD_DIR = path.join(__dirname, "files");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// データベースの代わり
const usersDB = {
  U00331001: { name: "元従業員Z", role: "user" },
  U99999999: { name: "管理者A", role: "admin" },
};

// 発行済みのcsrf_tokenを管理する。key: userId, value: token
const csrfTokensDB = {};
function createCsrfToken(userId) {
  const token = crypto.randomBytes(4).toString("hex").slice(0, 4); // 4桁のランダム文字列
  csrfTokensDB[userId] = token; // 発行済みとして記録
  return token;
}

const getUserIdFromCookie = (req) => {
  const cookieHeader = req.headers.cookie;
  // 'key1=val1; key2=val2' を分断して検索
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  //console.debug("cookies : ", cookies);
  const userId = cookies.find((c) => c.startsWith(`userId=`));
  return userId.split("=")[1];
};

// ログイン後の画面上部に表示する全画面共通UIコンポーネント
const getCommonTopUi = (req) => {
  const userId = getUserIdFromCookie(req);

  // ユーザーIDに対応するユーザーを取得（トークンが無効または未設定の場合の対策も考慮）
  const user = usersDB[userId];

  return `<div>「令和7秋SC問1 - Sサービス」&nbsp;
ログイン中のユーザ:${user.name}&nbsp;
あなたのロール:${user.role}&nbsp;
<a href="/tasks">タスク管理</a>&nbsp;
<a href="/upload">ファイルアップロード（スレッド投稿の代わり）</a>&nbsp;
<form action="/logout" method="POST"><button type="submit">ログアウト</button></form>
</div><hr/>`;
};

// メモリ上の簡易データベース (試験問題のタスク情報を模したもの)
let tasks = [
  { id: 1, title: "G社のコンペ資料作成", deadline: "2026-7-9" },
  { id: 2, title: "G社の業界分析", deadline: "2026-7-6" },
];

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
  // 1. GET / (ログイン画面)
  // ------------------------------------------
  if (url.pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <h1>ログイン画面</h1>
      ログインしたいユーザを選択してください。（実験用に簡易的な画面にしています）<br>
      <form action="/login" method="POST">
        <label><input type="radio" name="user" value="U00331001" required /> 元従業員Z（一般ユーザ）</label><br>
        <label><input type="radio" name="user" value="U99999999" required /> 管理者A（管理者ユーザ）</label><br>
        <button type="submit">ログイン</button>
      </form>
    `);
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
      // "user=U00331001" のような文字列をオブジェクトに変換
      const parsedData = querystring.parse(body);
      const selectedUserId = parsedData.user;
      res.setHeader("Set-Cookie", `userId=${selectedUserId}; Path=/;`);

      console.log("選択されたユーザーID:", selectedUserId);
      // 302 Found (一時的なリダイレクト) の場合
      res.writeHead(302, {
        Location: "/tasks",
      });

      // レスポンスを終了する
      res.end();
    });
    return;
  }

  // ------------------------------------------
  // 3. POST /logout (ログアウト処理)
  // ------------------------------------------
  if (url.pathname === "/logout" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      // 有効期限を過去（Max-Age=0）にして上書きします
      res.setHeader("Set-Cookie", "userId=; Max-Age=0; Path=/;");

      // 302 Found (一時的なリダイレクト) の場合
      res.writeHead(302, {
        Location: "/",
      });

      // レスポンスを終了する
      res.end();
    });
    return;
  }

  // ------------------------------------------
  // 4. GET /tasks (タスク一覧表示 - XSSの表示側対策)
  // ------------------------------------------
  if (url.pathname === "/tasks" && req.method === "GET") {
    console.debug("タスク一覧表示リクエストを受信しました。");
    let listHtml = tasks
      .map((t) => {
        return `<li>[ID: ${t.id}] ${t.title} (締切日: ${t.deadline})</li>`;
        // 出力時に必ず escapeHTML を介すことで保存型XSSを無害化 (設問2/3対策)
        //return `<li>[ID: ${t.id}] ${escapeHTML(t.title)} (締切日: ${t.deadline})</li>`;
      })
      .join("");

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      ${getCommonTopUi(req)}
      <h1>タスク一覧</h1>
      <ul>${listHtml}</ul>
      <h2>タスク追加</h2>
      <form action="/tasks" method="POST">
        タスク名:<input type="text" name="title" placeholder="タスク名を入力" size="40" required /><br />
        タスクの締切日:<input type="date" name="deadline" required /><br />
        <button type="submit">作成</button>
      </form>
      <br><a href="/upload">ファイルアップロード画面へ</a>
    `);
    return;
  }

  // ------------------------------------------
  // 5. POST /tasks (タスク作成処理)
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
          deadline: parsed.deadline,
        });
      }
      // リダイレクト (303 See Other)
      res.writeHead(303, { Location: "/tasks" });
      res.end();
    });
    return;
  }

  // ------------------------------------------
  // 6. GET /upload (アップロード画面)
  // ------------------------------------------
  if (url.pathname === "/upload" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      ${getCommonTopUi(req)}
      <h1>ファイルアップロード（スレッド投稿画面の代わり）</h1>
      <form action="/upload" method="POST" enctype="multipart/form-data">
        <input type="file" name="file" required />
        <button type="submit">送信</button>
      </form>
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
      // バイナリ文字列として全体を読み込む
      const rawData = buffer.toString("binary");

      // ① ファイル名（filename="..."）を取り出す
      const filenameMatch = rawData.match(/filename="([^"]+)"/i);
      const filename = filenameMatch
        ? path.basename(filenameMatch[1])
        : `uploaded_${Date.now()}.bin`;

      // ② ファイルデータ部分（空行 \r\n\r\n から末尾のバウンダリ \r\n-- の間）を正規表現で一括抽出
      const fileMatch = rawData.match(/\r\n\r\n([\s\S]*?)\r\n--/);

      if (!fileMatch) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("ファイルの抽出に失敗しました");
      }

      // 抽出したバイナリ文字列を Buffer に戻して保存
      const fileBuffer = Buffer.from(fileMatch[1], "binary");
      const filePath = path.join(UPLOAD_DIR, filename);

      fs.writeFileSync(filePath, buffer);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        ${getCommonTopUi(req)}
        <p>ファイルを受け取りました。</p>
        <a href="/download?file=${filename}">ダウンロードテスト</a>
      `);
    });
    return;
  }

  // ------------------------------------------
  // 5. GET /files/* (スクリプトによるアクセス)
  // ------------------------------------------
  if (url.pathname.startsWith("/files/") && req.method === "GET") {
    const filePath = path.join(__dirname, url.pathname);
    console.debug("filePath : ", filePath);

    // 1. "utf8" を指定してテキスト（String）として読み込む
    fs.readFile(filePath, "utf8", (err, jsCode) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("ファイルの読み込みに失敗しました");
        return;
      }

      // 2. ヘッダーと本文の境目（空行）を検索
      const headerEndIndex = jsCode.indexOf("\r\n\r\n");

      if (headerEndIndex === -1) {
        res.writeHead(400);
        return res.end("Invalid multipart data");
      }

      // 3. 本文の開始位置 (\r\n\r\n の 4文字分後ろ)
      const dataStart = headerEndIndex + 4;

      // 4. 末尾のバウンダリの開始位置を検索
      const dataEnd = jsCode.lastIndexOf("\r\n------");

      // 5. 文字列の場合は .subarray() ではなく .slice() を使用します
      const cleanJsCode = jsCode.slice(dataStart, dataEnd);

      // 6. ブラウザに JavaScript として認識させるために Content-Type を設定
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
      });

      // 切り出した純粋な JS コードを返却
      res.end(cleanJsCode);
    });

    return;
  }

  // ------------------------------------------
  // 6. GET /management/role
  // ------------------------------------------
  if (url.pathname === "/management/role" && req.method === "GET") {
    console.log("GET /management/role リクエストを受信しました。");
    const csrfToken = createCsrfToken(getUserIdFromCookie(req)); // CSRFトークンを発行
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      ${getCommonTopUi(req)}
      <h1>ロール設定画面</h1>
      <p>この辺りに、入力フォームがあって、管理者が、特定のユーザのロールを変更できる想定。</p>
      <input type="hidden" id="csrf_token" name="csrf" value="${csrfToken}" />
      ↑hiddenに仕込んでいたcsrf_tokenを、F1234567890.xlsxのスクリプトが取得してPOSTリクエストに利用されてしまう。
    `);
    return;
  }

  // ------------------------------------------
  // 7. POST /management/roleset
  // ------------------------------------------
  if (url.pathname === "/management/roleset" && req.method === "POST") {
    console.log("POST /management/roleset リクエストを受信しました。");
    // CSRFが発生していないかチェック
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const parsedData = querystring.parse(body);
      console.debug("parsedData : ", parsedData);
      const userId = getUserIdFromCookie(req);
      console.debug("userId : ", userId);
      console.debug("parsedData.csrf_token : ", parsedData.csrf_token);
      console.debug("csrfTokens[userId] : ", csrfTokensDB[userId]);
      if (
        !parsedData.csrf_token ||
        !csrfTokensDB[userId] ||
        parsedData.csrf_token !== csrfTokensDB[userId]
      ) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        console.warn("CSRFトークンが無効かまたは不正なリクエストです。");
        res.end("CSRFトークンが無効かまたは不正なリクエストです。");
        return;
      }
      if (usersDB[userId].role !== "admin") {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        console.warn("ロールの設定変更には管理者権限が必要です。");
        res.end("ロールの設定変更には管理者権限が必要です。");
        return;
      }

      const targetUserId = parsedData.user_id;
      const newRole = parsedData.is_admin === "1" ? "admin" : "user";
      console.info("before : ", usersDB[targetUserId]);
      usersDB[targetUserId].role = newRole;
      console.info("after : ", usersDB[targetUserId]);

      // リダイレクト (303 See Other)
      res.writeHead(303, { Location: "/tasks" });
      res.end();
    });
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
