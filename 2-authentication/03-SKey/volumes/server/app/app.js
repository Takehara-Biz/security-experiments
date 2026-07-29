const http = require('node:http');
const crypto = require('node:crypto');

// ハッシュ関数（SHA-256）
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// 簡易インメモリデータベース
// 初期状態：ユーザー「user1」が10回分のハッシュチェーンで登録されていると仮定
// 💡本来は初期登録用APIで作りますが、ここでは事前に10回目の値を計算して格納しています。
const initialSecret = 'pass1';
const initialSeed = 'seed123';
let currentHash = hash(initialSecret + initialSeed);
for (let i = 1; i < 10; i++) {
  currentHash = hash(currentHash);
}

const userStore = {
  'user1': {
    seed: initialSeed,
    currentSequence: 10,      // 残り回数（最初は10回目）
    lastValidHash: currentHash // 10回目のハッシュ値
  }
};

// JSONレスポンス用のヘルパー関数
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// サーバー作成
const server = http.createServer((req, res) => {
  console.log("begin");
  // 1. リクエストボディ（JSON）のパース処理
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  
  req.on('end', () => {
    const bodyString = Buffer.concat(chunks).toString();
    try {
      req.body = bodyString ? JSON.parse(bodyString) : {};
    } catch (e) {
      req.body = {};
    }

    // 主要プロパティのログ出力
    console.log(`[${req.method}] ${req.url} - Body:`, req.body);

    // 2. ルーティング処理
    // 【チャレンジAPI】シードと残り回数を返却する
    if (req.method === 'POST' && req.url === '/api/challenge') {
      const { username } = req.body;
      const user = userStore[username];

      if (!user || user.currentSequence <= 1) {
        return sendJSON(res, 400, { error: 'ユーザーが見つからないか、OTPの利用回数上限です' });
      }

      // 次にユーザーが送信すべきハッシュ回数（N - 1 回目）
      const nextSequence = user.currentSequence - 1;

      return sendJSON(res, 200, {
        seed: user.seed,
        sequence: nextSequence
      });
    }

    // 【ログインAPI】OTPを検証する
    if (req.method === 'POST' && req.url === '/api/login') {
      const { username, otp } = req.body;
      const user = userStore[username];

      if (!user || !otp) {
        console.warn('不正なリクエストです');
        return sendJSON(res, 400, { error: '不正なリクエストです' });
      }

      // ユーザーから送られてきたOTPを「1回だけハッシュ化」する
      const hashedSubmission = hash(otp);
      console.debug('ユーザーから送られてきたOTP:' + otp);
      console.debug('↑を1回だけハッシュ化したもの:' + hashedSubmission);

      // サーバーが保持している「前回の値」と一致するか検証
      if (hashedSubmission === user.lastValidHash) {
        // 認証成功：サーバーのデータベース情報を更新する（一回限りの使い捨て）
        user.lastValidHash = otp; 
        user.currentSequence -= 1; 
        console.info('ログイン成功 🎉');

        return sendJSON(res, 200, { 
          message: 'ログイン成功 🎉', 
          remaining: user.currentSequence 
        });
      } else {
        console.warn('認証失敗：OTPが正しくありません ❌');
        return sendJSON(res, 401, { error: '認証失敗：OTPが正しくありません ❌' });
      }
    }

    // 該当するルートがない場合
    return sendJSON(res, 404, { error: 'Not Found' });
  });
});

// サーバー起動
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`S/Key Auth Server running on http://localhost:${PORT}`);
});
