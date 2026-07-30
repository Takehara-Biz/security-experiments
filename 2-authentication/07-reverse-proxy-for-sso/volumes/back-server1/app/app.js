const http = require('http');
const PORT = 3001;

http.createServer((req, res) => {
  const userId = req.headers['x-user-id'];
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <h1>[ App 1 ] 購買システム</h1>
    <p>ログインユーザー: <strong>${userId}</strong></p>
    <a href="/app2">App 2 へ移動</a> | <a href="/logout">ログアウト</a>
  `);
}).listen(PORT, () => console.log(`[App 1] 起動: http://localhost:${PORT}`));