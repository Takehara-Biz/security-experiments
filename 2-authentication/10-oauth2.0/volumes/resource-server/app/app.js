const http = require('http');
const url = require('url');
const querystring = require('querystring');

const AUTH_SERVER_INTERNAL_URL = process.env.AUTH_SERVER_INTERNAL_URL || 'http://authz-server:4000';

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // GET /api/userinfo : 保護されたユーザー情報API
  if (pathname === '/api/userinfo' && req.method === 'GET') {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'unauthorized' }));
    }

    const token = authHeader.split(' ')[1];

    // 1. 認可サーバーにトークンの有効性を問い合わせる (Introspection)
    const postData = querystring.stringify({ token: token });
    const authTarget = url.parse(`${AUTH_SERVER_INTERNAL_URL}/introspect`);

    const introspectReq = http.request({
      hostname: authTarget.hostname,
      port: authTarget.port,
      path: authTarget.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (introspectRes) => {
      let body = '';
      introspectRes.on('data', chunk => { body += chunk; });
      introspectRes.on('end', () => {
        const result = JSON.parse(body);

        // トークンが無効な場合
        if (!result.active) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'invalid_token' }));
        }

        // 2. トークンが有効ならデータ（リソース）を返す
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          id: result.user_id,
          name: '山田 太郎',
          email: 'yamada@example.com',
          department: '開発部'
        }));
      });
    });

    introspectReq.write(postData);
    introspectReq.end();
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(5001, () => {
  console.log('📦 リソースサーバー起動: ポート 5001');
});