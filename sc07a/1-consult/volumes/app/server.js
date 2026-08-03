const http = require("http");
const fs = require("fs");
const Busboy = require("busboy");
const { fileTypeFromFile } = require("file-type");
const path = require("path");
const querystring = require("querystring");
const crypto = require("crypto");
const { formidable } = require("formidable"); // ファイルアップロードの保存前に、余計なヘッダー情報を取り除くライブラリ

// 許可する拡張子のリスト（ホワイトリスト）
const allowedExtensions = ["docx", "xlsx", "pptx", "pdf", "jpg", "gif", "png"];

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
<a href="/project-progress">タスク管理</a>&nbsp;
<a href="/post-threads">スレッド投稿画面(ファイルアップロード機能のみ実装)</a>&nbsp;
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
  // res.setHeader(
  //   "Content-Security-Policy",
  //   "default-src 'self'; script-src 'self'; object-src 'none';",
  // );
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Frame-Options", "SAMEORIGIN"); //クリックジャッキング対策
  res.setHeader("Content-Security-Policy", "default-src 'self';");
  // 2. MIMEスニッフィング防止。Webブラウザがファイルの種類（MIMEタイプ）を勝手に推測して意図しない動作をしないよう、制限をかけるセキュリティ対策のこと
  //res.setHeader("X-Content-Type-Options", "nosniff");

  // ------------------------------------------
  // 1. GET / (ログイン画面表示)
  // ------------------------------------------
  if (url.pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <h1>ログイン画面</h1>
      ログインしたいユーザを選択してください。（実験用に簡易的な画面にしています）<br>
      <form action="/login" method="POST">
        <input type="text" name="userid" placeholder="ユーザIDを入力" required /><br>
        <input type="password" name="password" placeholder="パスワードを入力" required /><br>
        <button type="submit">ログイン</button>
      </form>
      <p>※元従業員Z（一般ユーザ）のユーザIDとパスワードはU00331001。管理者A（管理者ユーザ）のユーザIDとパスワードはU99999999。</p>
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
  // 4. GET /project-progress (プロジェクト進捗管理画面表示)
  // ------------------------------------------
  if (url.pathname === "/project-progress" && req.method === "GET") {
    console.debug("プロジェクト進捗管理画面リクエストを受信しました。");
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
      <h1>プロジェクト進捗管理</h1>
      <p>プロジェクトの情報が表示される。また、以下に未完了のタスクのうち締切日を過ぎたものが表示されるが、今回は登録したタスクを締切日にかかわらず全て表示している。</p>
      <ul>${listHtml}</ul>
      <h2>タスク追加</h2>
      <form action="/project-progress" method="POST">
        タスク名:<input type="text" name="title" placeholder="タスク名を入力" size="60" required /><br />
        タスクの締切日:<input type="date" name="deadline" required /><br />
        <button type="submit">作成</button>
      </form>
      <br><a href="/post-threads">スレッド投稿画面(ファイルアップロード機能のみ実装)へ</a>
    `);
    return;
  }

  // ------------------------------------------
  // 5. POST /project-progress (タスク作成処理)
  // ------------------------------------------
  if (url.pathname === "/project-progress" && req.method === "POST") {
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
      res.writeHead(303, { Location: "/project-progress" });
      res.end();
    });
    return;
  }

  // ------------------------------------------
  // 6. GET /post-threads (アップロード画面表示)
  // ------------------------------------------
  if (url.pathname === "/post-threads" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      ${getCommonTopUi(req)}
      <h1>スレッド投稿画面(ファイルアップロード機能のみ実装)</h1>
      <form action="/post-threads" method="POST" enctype="multipart/form-data">
        <input type="file" name="file" required />
        <button type="submit">送信</button>
      </form>
    `);
    return;
  }

  // ------------------------------------------
  // 7. POST /post-threads (手動マルチパート解析による簡易保存)
  // ------------------------------------------
  if (url.pathname === "/post-threads" && req.method === "POST") {
    const busboy = Busboy({ headers: req.headers });

    // ファイルフィールドを検知したときのイベント
    busboy.on("file", async (name, fileStream, info) => {
      const { filename } = info;

      // // 1. ファイル名から拡張子を抽出
      // const extFromFile = path.extname(filename).slice(1).toLowerCase();

      // if (!allowedExtensions.includes(extFromFile)) {
      //   res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      //   return res.end("許可されていないファイル拡張子です");
      // }

      try {
        // 2. ストリームから中身（マジックナンバー）を判定
        // 注: file-typeがストリームを読み込んでも、後続の処理に影響しません
        // const detected = await fileTypeFromStream(fileStream);

        // if (!detected) {
        //   res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        //   return res.end(
        //     "ファイル形式を特定できませんでした（テキスト等は非対応）。",
        //   );
        // }
        // // 実際に読み込んだファイルから推測される拡張子
        // const extFromContent = detected.ext.toLowerCase();

        // // 3. 拡張子の一致確認
        // if (extFromFile === extFromContent) {
        //   res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        //   return res.end(
        //     `不正なファイル: 拡張子は "${extFromFile}" ですが、中身は "${extFromContent}" です。`,
        //   );
        // }

        // 4. チェック成功時の処理（ここでは保存せずそのまま読み飛ばし）
        fileStream.resume();

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`チェック成功: ${filename} (MIME: ${detected.mime})`);
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("サーバー内部エラーが発生しました。");
      }
    });

    // formidable を使って、余計なヘッダーを除去して保存する
    const form = formidable({
      uploadDir: path.join(__dirname, "files"), // 保存先ディレクトリ
      keepExtensions: true, // 拡張子を維持する
      filename: (name, ext, part) => part.originalFilename, // 保存時のファイル名をオリジナルのものにする
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("アップロード失敗");
      }

      // formidable が自動的に Boundary を除去し、純粋な中身だけをファイルとして保存してくれます
      // リダイレクト (303 See Other)
      res.writeHead(303, { Location: "/project-progress" });
      res.end();
    });
    return;
  }

  // ------------------------------------------
  // 8. GET /files/* (スクリプトによるアクセス)
  // ------------------------------------------
  if (url.pathname.startsWith("/files/") && req.method === "GET") {
    const filePath = path.join(__dirname, url.pathname);
    console.debug("filePath : ", filePath);

    // ファイルをそのまま読み込んで返却（文字コード指定なしで Buffer として取得）
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("File Not Found");
      }

      // X-Content-Type-Options は意図的に未設定にしておくことで、
      // Content-Type が不適切（例: text/plain や 未設定）でもブラウザのスニフィングを誘発できます
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8", // 例: 本来は JS なのに text/plain で返す実験など
      });

      res.end(data);
    });

    return;
  }

  // ------------------------------------------
  // 9. GET /management/role（ロール設定画面表示）
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
  // 10. POST /management/roleset（ロール変更処理）
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
      res.writeHead(303, { Location: "/project-progress" });
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
  console.log("Sサービスが起動しました: http://localhost:3000/");
});
