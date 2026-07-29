const http = require('node:http');
const crypto = require('node:crypto');

// 共有秘密鍵（文字列）。※歴史的なTOTPはBase32ですが、今回は標準機能のみで組むため通常の文字列を使用します。
const SHARED_SECRET = 'my_super_secret_shared_key_12345'; 

// TOTPを計算する関数。この処理の内容についてはREADME.mdを参照。
function generateTOTP(secret) {
  // 1. 現在のUnixタイムステップを計算（30秒単位）
  const timeStep = Math.floor(Date.now() / 1000 / 30);
  console.debug('timeStep:' + timeStep);

  // 2. タイムステップを8バイトのバッファ（Big Endian）に変換
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(timeStep), 0);

  // 3. 秘密鍵を使ってHMAC-SHA1を計算
  const hmac = crypto.createHmac('sha1', secret).update(buffer).digest();

  // 4. 動的切り出し（Dynamic Truncation）により4バイトを抽出
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);

  // 5. 6桁の数字にする（1,000,000の余り）
  const otp = code % 1000000;

  // 6桁に満たない場合は、頭を0で埋める
  const number = String(otp).padStart(6, '0');
  console.debug('number:' + number);
  return number;
}

// サーバー作成
const server = http.createServer((req, res) => {
  console.log('begin');
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));

  req.on('end', () => {
    // ボディの自作パース
    const bodyString = Buffer.concat(chunks).toString();
    try { req.body = bodyString ? JSON.parse(bodyString) : {}; } catch (e) { req.body = {}; }

    // 主要プロパティのログ出力
    console.log(`[${req.method}] ${req.url} - Body:`, req.body);

    if (req.method === 'POST' && req.url === '/api/login') {
      const { otp } = req.body;
      const expectedOtp = generateTOTP(SHARED_SECRET);

      // 💡 認証検証（前後30秒の猶予を持たせる場合は、timeStep-1, timeStep+1 も計算して検証します）
      if (otp && otp === expectedOtp) {
        console.info('時刻同期OTP認証 成功 🎉');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: '時刻同期OTP認証 成功 🎉' }));
      } else {
        console.warn('認証失敗 ❌ OTPが正しくないか、有効期限切れです');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '認証失敗 ❌ OTPが正しくないか、有効期限切れです' }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });
});

server.listen(3000, () => {
  console.log('TOTP Server running on http://localhost:3000');
});
