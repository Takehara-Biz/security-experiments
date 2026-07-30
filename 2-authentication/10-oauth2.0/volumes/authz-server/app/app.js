const http = require('http');
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');

const CLIENT_ID = process.env.CLIENT_ID || 'my-client-id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'my-client-secret';

const authorizationCodes = new Map(); // code -> { clientId, redirectUri }
const accessTokens = new Map();       // token -> { userId, scope }

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. GET /authorize : ユーザーへログイン＆アクセス同意画面を表示
  if (pathname === '/authorize' && req.method === 'GET') {
    const { response_type, client_id, redirect_uri, state } = parsedUrl.query;

    if (client_id !== CLIENT_ID) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('無効な Client ID です。');
    }

    // ユーザーにボタンを押させるHTML画面を返す
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>認可サーバー - アクセス許可</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; background-color: #f4f4f9; }
          .card { background: white; padding: 2rem; border-radius: 8px; max-width: 400px; margin: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          button { background-color: #007bff; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 1rem; }
          button:hover { background-color: #0056b3; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🔒 ログイン & アクセス承認</h2>
          <p>アプリケーション <b>${client_id}</b> があなたのプロファイル情報へのアクセスを求めています。</p>
          <form action="/approve" method="POST">
            <input type="hidden" name="client_id" value="${client_id}" />
            <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
            <input type="hidden" name="state" value="${state || ''}" />
            <button type="submit">許可して連携する</button>
          </form>
        </div>
      </body>
      </html>
    `);
  }

  // 2. POST /approve : ユーザーがボタンを押した後に認可コードを発行
  if (pathname === '/approve' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const data = querystring.parse(body);
      const { client_id, redirect_uri, state } = data;

      if (client_id !== CLIENT_ID) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('不正なリクエストです。');
      }

      // ボタンが押されたので認可コードを発行
      const authCode = crypto.randomBytes(16).toString('hex');
      authorizationCodes.set(authCode, { clientId: client_id, redirectUri: redirect_uri });

      // クライアントの redirect_uri へリダイレクト
      const redirectUrl = `${redirect_uri}?code=${authCode}&state=${state}`;
      res.writeHead(302, { Location: redirectUrl });
      return res.end();
    });
    return;
  }

  // 3. POST /token : アクセストークン発行 (クライアントからのサーバー間通信)
  if (pathname === '/token' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const data = querystring.parse(body);
      const { grant_type, code, client_id, client_secret } = data;

      if (grant_type !== 'authorization_code' || client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'invalid_client' }));
      }

      const storedData = authorizationCodes.get(code);
      if (!storedData) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'invalid_grant' }));
      }

      authorizationCodes.delete(code);

      const accessToken = 'at_' + crypto.randomBytes(24).toString('hex');
      accessTokens.set(accessToken, { userId: 'user_12345', scope: 'read:profile' });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600
      }));
    });
    return;
  }

  // 4. POST /introspect : トークン検証 (リソースサーバーからの問い合せ用)
  if (pathname === '/introspect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const data = querystring.parse(body);
      const token = data.token;
      const tokenInfo = accessTokens.get(token);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (tokenInfo) {
        res.end(JSON.stringify({
          active: true,
          user_id: tokenInfo.userId,
          scope: tokenInfo.scope
        }));
      } else {
        res.end(JSON.stringify({ active: false }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(4000, () => {
  console.log('🔒 認可サーバー起動: ポート 4000');
});