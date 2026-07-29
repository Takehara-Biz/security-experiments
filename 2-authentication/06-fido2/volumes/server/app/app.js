const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const userStore = {};
const challengeStore = new Map();
const toBase64URL = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const PORT = 3000;

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const bodyString = Buffer.concat(chunks).toString();
    try { req.body = bodyString ? JSON.parse(bodyString) : {}; } catch (e) { req.body = {}; }

    // 【画面配信】トップページ（別ファイルのindex.htmlを読み込んで返す）
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      const filePath = path.join(__dirname, 'index.html');
      
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('HTMLファイルの読み込みに失敗しました。');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    // 【登録API - ステップ1】
    if (req.method === 'POST' && req.url === '/api/register/options') {
      const { username } = req.body;
      if (!username) return sendJSON(res, 400, { error: 'ユーザー名が必要です' });

      // チャレンジを生成
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const challengeBase64 = toBase64URL(Buffer.from(challenge));
      challengeStore.set(username, challengeBase64);

      // 生成したチャレンジを渡す
      return sendJSON(res, 200, {
        challenge: challengeBase64,
        rp: { name: "Minimal WebAuthn Demo", id: "localhost" },
        user: {
          id: toBase64URL(Buffer.from(username)),
          name: username,
          displayName: username
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }]
      });
    }

    // 【登録API - ステップ2】
    if (req.method === 'POST' && req.url === '/api/register/verify') {
      const { username, credential } = req.body;
      const savedChallenge = challengeStore.get(username);
      console.info('crendential:', credential);
      console.info('savedChallenge', savedChallenge);

      if (!savedChallenge) return sendJSON(res, 400, { error: 'セッションが切れています' });

      userStore[username] = {
        id: credential.id,
        rawPublicKey: credential.response.attestationObject 
      };

      challengeStore.delete(username);
      console.log(`[DB] ユーザー「${username}」の生体鍵を登録しました。`, userStore[username]);
      return sendJSON(res, 200, { success: true, message: "生体認証の登録に成功しました！" });
    }

    // 【ログインAPI - ステップ1】
    if (req.method === 'POST' && req.url === '/api/login/options') {
      const { username } = req.body;
      const user = userStore[username];
      if (!user) return sendJSON(res, 404, { error: 'ユーザーが見つかりません。先に登録してください。' });

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const challengeBase64 = toBase64URL(Buffer.from(challenge));
      console.info('challengeBase64 : ', challengeBase64);
      challengeStore.set(username, challengeBase64);

      return sendJSON(res, 200, {
        challenge: challengeBase64,
        rpId: "localhost",
        allowedCredentials: [{ type: "public-key", id: user.id }]
      });
    }

    // 【ログインAPI - ステップ2】
    if (req.method === 'POST' && req.url === '/api/login/verify') {
      const { username, assertion } = req.body;
      const savedChallenge = challengeStore.get(username);
      const user = userStore[username];
      console.info('ussavedChallengeer : ', savedChallenge);
      console.info('user : ', user);

      if (!savedChallenge || !user) return sendJSON(res, 400, { error: 'ログイン認証エラー' });

      console.info(`       
このサンプルコードはフローの全体像を把握するためのデモ実装です。そのため、最も重要な「電子署名の暗号学的な検証」が省略されています。

本来の本番WebAuthnサーバーの実装では、if (!savedChallenge || !user) の後に以下の検証プロセスを行います：

[クライアントから届いた assertion]
  │
  ├─① clientDataJSON をデコードし、送った challenge と一致するか確認
  ├─② 送信元の origin (https://example.com など) が正しいか確認
  └─③ 登録時に保存した「公開鍵（user.rawPublicKey）」を使い、
     「authenticatorData + clientDataJSONのハッシュ」に対する
     「署名（signature）」が正しいか検証する（暗号学的な整合性チェック）
        `);

      console.log(`[Auth] ユーザー「${username}」の生体検証を通過しました。`);
      challengeStore.delete(username);
      return sendJSON(res, 200, { success: true, message: `ログイン成功！ お帰りなさい、${username}さん 🎉` });
    }

    return sendJSON(res, 404, { error: 'Not Found' });
  });
});

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

server.listen(PORT, () => {
  console.log(`WebAuthn server running at http://localhost:${PORT}`);
});
