const http = require('http');

const PROXY_PORT = 3000;

// バックエンドサーバの定義（ルーティングテーブル）
const BACKENDS = {
  '/app1': { host: 'back-server1', port: 3001 },
  '/app2': { host: 'back-server2', port: 3002 }
};

const sessions = new Map();

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

const server = http.createServer((req, res) => {
  const cookies = parseCookies(req);
  const sessionId = cookies.sessionId;
  const username = sessions.get(sessionId);

  // --- ログアウト処理 ---
  if (req.url === '/logout') {
    if (sessionId) sessions.delete(sessionId);
    res.writeHead(302, {
      'Set-Cookie': 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'Location': '/'
    });
    return res.end();
  }

  // --- ログイン処理 ---
  if (req.method === 'POST' && req.url === '/login') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const username = params.get('username');
      const password = params.get('password');

      if (username === 'user1' && password === 'pass1') {
        const newSessionId = Math.random().toString(36).substring(2);
        sessions.set(newSessionId, username);

        // ログイン成功後は初期ページ (/app1) へリダイレクト
        res.writeHead(302, {
          'Set-Cookie': `sessionId=${newSessionId}; Path=/; HttpOnly`,
          'Location': '/app1'
        });
        return res.end();
      }
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('ユーザー名またはパスワードが間違っています。<a href="/">戻る</a>');
    });
    return;
  }

  // --- 未認証の場合 ---
  if (!username) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <h1>SSO 認証ゲートウェイ</h1>
      <form method="POST" action="/login">
        <label>ユーザー名: <input type="text" name="username" required /></label>
        <label>パスワード: <input type="text" name="password" required /></label>
        <button type="submit">ログイン (App 1 と App 2 に共通ログイン)</button>
        <p>※ユーザ名: user1、パスワード: pass1、で通ります。</p>
      </form>
    `);
  }

  // --- ルーティング判定 ---
  // URLの先頭（例: /app1/items -> /app1）から転送先を判定
  const targetKey = Object.keys(BACKENDS).find(path => req.url.startsWith(path));
  const targetBackend = BACKENDS[targetKey];

  // 該当するバックエンドがない場合はルート(/app1)へリダイレクト
  if (!targetBackend) {
    res.writeHead(302, { 'Location': '/app1' });
    return res.end();
  }

  // --- バックエンドへのプロキシ転送 ---
  const proxyHeaders = {
    ...req.headers,
    'x-user-id': username // 共通の認証情報を付与
  };

  const proxyReq = http.request(
    {
      hostname: targetBackend.host,
      port: targetBackend.port,
      path: req.url,
      method: req.method,
      headers: proxyHeaders
    },
    (backendRes) => {
      res.writeHead(backendRes.statusCode, backendRes.headers);
      backendRes.pipe(res, { end: true });
    }
  );

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Bad Gateway: バックエンド (${targetBackend.port}) に接続できません`);
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PROXY_PORT, () => {
  console.log(`[Proxy] SSOゲートウェイ起動: http://localhost:${PROXY_PORT}`);
});