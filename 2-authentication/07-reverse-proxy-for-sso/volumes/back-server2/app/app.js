const http = require('http');
const PORT = 3002;

http.createServer((req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId){
    // 本来は、userIdがあるかどうかではなく、長い英数字（JWTなど）を指定させて、その内容を検証するべきだが、今回は簡易版なので省略している。
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <h1>[ App 2 ] 勤怠管理システム</h1>
      <p>認証されていないため、サービスをご利用できません</p>
      <a href="http://localhost:3000/">ログインページ（プロキシサーバ）へ移動</a>
    `);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <h1>[ App 2 ] 勤怠管理システム</h1>
    <p>ログインユーザー: <strong>${userId}</strong></p>
    <a href="/app1">App 1 へ移動</a> | <a href="/logout">ログアウト</a>
  `);
}).listen(PORT, () => console.log(`[App 2] 起動: http://localhost:${PORT}`));