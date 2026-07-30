const http = require('http');
const url = require('url');
const querystring = require('querystring');

const CLIENT_ID = process.env.CLIENT_ID || 'my-client-id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'my-client-secret';
const REDIRECT_URI = 'http://localhost:3000/callback';

const AUTH_SERVER_PUBLIC_URL = process.env.AUTH_SERVER_PUBLIC_URL || 'http://localhost:4000';
const AUTH_SERVER_INTERNAL_URL = process.env.AUTH_SERVER_INTERNAL_URL || 'http://authz-server:4000';
const RESOURCE_SERVER_INTERNAL_URL = process.env.RESOURCE_SERVER_INTERNAL_URL || 'http://resource-server:5001';

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <h1>OAuth2.0 動作デモ (3サーバー分離構成)</h1>
      <p><a href="/login"><button>OAuth2.0 でログイン</button></a></p>
    `);
  }

  if (pathname === '/login' && req.method === 'GET') {
    const authUrl = `${AUTH_SERVER_PUBLIC_URL}/authorize?` + querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state: 'xyz123'
    });
    res.writeHead(302, { Location: authUrl });
    return res.end();
  }

  if (pathname === '/callback' && req.method === 'GET') {
    const { code } = parsedUrl.query;

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('認可コードがありません。');
    }

    // 1. 認可サーバー (auth-server:3000) にトークンを要求
    const postData = querystring.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    const tokenTarget = url.parse(`${AUTH_SERVER_INTERNAL_URL}/token`);
    const tokenReq = http.request({
      hostname: tokenTarget.hostname,
      port: tokenTarget.port,
      path: tokenTarget.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (tokenRes) => {
      let body = '';
      tokenRes.on('data', chunk => { body += chunk; });
      tokenRes.on('end', () => {
        const tokenJson = JSON.parse(body);
        const accessToken = tokenJson.access_token;

        // 2. リソースサーバー (resource-server:5000) にデータ要求
        const resourceTarget = url.parse(`${RESOURCE_SERVER_INTERNAL_URL}/api/userinfo`);
        const profileReq = http.request({
          hostname: resourceTarget.hostname,
          port: resourceTarget.port,
          path: resourceTarget.path,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }, (profileRes) => {
          let profileBody = '';
          profileRes.on('data', chunk => { profileBody += chunk; });
          profileRes.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <h2>認証＆データ取得 成功！</h2>
              <p><b>Access Token:</b> ${accessToken}</p>
              <p><b>リソースサーバーから取得したデータ:</b></p>
              <pre>${profileBody}</pre>
              <a href="/">トップに戻る</a>
            `);
          });
        });
        profileReq.end();
      });
    });

    tokenReq.write(postData);
    tokenReq.end();
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(3000, () => {
  console.log('💻 クライアントアプリ起動: ポート 3000');
});