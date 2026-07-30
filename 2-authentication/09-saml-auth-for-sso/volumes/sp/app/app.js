const http = require('http');
const { SAML } = require('@node-saml/node-saml');

// SimpleSAMLphp 用の設定
const saml = new SAML({
  // IdP の SSO URL
  entryPoint: 'http://localhost:8080/simplesaml/saml2/idp/SSOService.php',
  
  // IdP の SLO（Single Logout）URL
  logoutUrl: 'http://localhost:8080/simplesaml/saml2/idp/SingleLogoutService.php',
  
  // SP の Entity ID
  issuer: 'urn:example:sp',
  
  // ACS URL (ログイン後のコールバック)
  callbackUrl: 'http://localhost:3000/login/callback',
  
  // SLO コールバック (ログアウト処理後の受け取りURL)
  logoutCallbackUrl: 'http://localhost:3000/logout/callback',
  
  // 先ほど成功した正解の証明書（PEM形式）をここにセット
  idpCert: `-----BEGIN CERTIFICATE-----
MIICmjCCAYICCQDX5sKPsYV3+jANBgkqhkiG9w0BAQsFADAPMQ0wCwYDVQQDDAR0ZXN0MB4XDTE5MTIyMzA5MDI1MVoXDTIwMDEyMjA5MDI1MVowDzENMAsGA1UEAwwEdGVzdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMdtDJ278DQTp84O5Nq5F8s5YOR34GFOGI2Swb/3pU7X7918lVljiKv7WVM65S59nJSyXV+fa15qoXLfsdRnq3yw0hTSTs2YDX+jl98kK3ksk3rROfYh1LIgByj4/4NeNpExgeB6rQk5Ay7YS+ARmMzEjXa0favHxu5BOdB2y6WvRQyjPS2lirT/PKWBZc04QZepsZ56+W7bd557tdedcYdY/nKI1qmSQClG2qgslzgqFOv1KCOw43a3mcK/TiiD8IXyLMJNC6OFW3xTL/BG6SOZ3dQ9rjQOBga+6GIaQsDjC4Xp7Kx+FkSvgaw0sJV8gt1mlZy+27Sza6d+hHD2pWECAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAm2fk1+gd08FQxK7TL04O8EK1f0bzaGGUxWzlh98a3Dm8+OPhVQRi/KLsFHliLC86lsZQKunYdDB+qd0KUk2oqDG6tstG/htmRYD/S/jNmt8gyPAVi11dHUqW3IvQgJLwxZtoAv6PNs188hvT1WK3VWJ4YgFKYi5XQYnR5sv69Vsr91lYAxyrIlMKahjSW1jTD3ByRfAQghsSLk6fV0OyJHyhuF1TxOVBVf8XOdaqfmvD90JGIPGtfMLPUX4m35qaGAU48PwCL7L3cRHYs9wZWc0ifXZcBENLtHYCLi5txR8c5lyHB9d3AQHzKHMFNjLswn5HsckKg83RH7+eVqHqGw==
-----END CERTIFICATE-----`,

  wantAssertionsSigned: false,
});

// メモリ上で管理する簡易セッションストア
// Key: sessionToken, Value: { profile, nameID, nameIDFormat }
const sessions = {};

// Cookieのパースヘルパー
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

// POSTボディのパースヘルパー
function parsePostBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const result = {};
      for (const [key, value] of params.entries()) {
        result[key] = value;
      }
      resolve(result);
    });
    req.on('error', reject);
  });
}

// HTTP サーバー
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const cookies = parseCookies(req);
  const sessionId = cookies.sid;
  const userSession = sessions[sessionId];

  // --------------------------------------------------
  // 1. トップページ
  // --------------------------------------------------
  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (userSession) {
      res.end(`
        <h1>ログイン中</h1>
        <p>ユーザー情報:</p>
        <pre>${JSON.stringify(userSession.profile, null, 2)}</pre>
        <a href="/logout"><button>ログアウトする</button></a>
      `);
    } else {
      res.end(`
        <h1>未ログイン</h1>
        <a href="/login"><button>SimpleSAMLphpでログイン</button></a>
        <p>↑をクリックすると、リダイレクトでIdPサーバに飛びます。そこで、ユーザ名:user1、パスワード:passwordと打ってください。アカウント情報の詳細は<a href="https://hub.docker.com/r/kenchan0130/simplesamlphp/#environment-variables">こちらの真上</a>に定義されています。</p>
      `);
    }
  }

  // --------------------------------------------------
  // 2. ログイン開始
  // --------------------------------------------------
  else if (url.pathname === '/login' && req.method === 'GET') {
    try {
      const loginUrl = await saml.getAuthorizeUrlAsync('', req.headers, {});
      res.writeHead(302, { Location: loginUrl });
      res.end();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('ログインURL作成失敗: ' + err.message);
    }
  }

  // --------------------------------------------------
  // 3. ログイン完了 (ACS URL)
  // --------------------------------------------------
  else if (url.pathname === '/login/callback' && req.method === 'POST') {
    try {
      const body = await parsePostBody(req);
      // Base64 から UTF-8 文字列へデコード
      const xmlString = Buffer.from(body.SAMLResponse, 'base64').toString('utf-8');
      console.log('SAML response body : ', xmlString);
      const { profile } = await saml.validatePostResponseAsync(body);

      // セッションIDを生成してメモリに保存
      const newSid = Math.random().toString(36).substring(2);
      sessions[newSid] = {
        profile,
        // ログアウト時に必要なNameID情報を保持
        nameID: profile.nameID,
        nameIDFormat: profile.nameIDFormat,
      };

      // Cookieを設定してトップにリダイレクト
      res.writeHead(302, {
        'Set-Cookie': `sid=${newSid}; Path=/; HttpOnly`,
        Location: '/',
      });
      res.end();
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('SAMLレスポンス検証失敗: ' + err.message);
    }
  }

  // --------------------------------------------------
  // 4. ログアウト開始
  // --------------------------------------------------
  else if (url.pathname === '/logout' && req.method === 'GET') {
    if (!userSession) {
      res.writeHead(302, { Location: '/' });
      return res.end();
    }

    try {
      // IdPへ送る LogoutRequest URL を生成
      const logoutUrl = await saml.getLogoutUrlAsync(
        {
          nameID: userSession.nameID,
          nameIDFormat: userSession.nameIDFormat,
        },
        req.headers,
        {}
      );

      // 自システムのセッションを破棄してCookie削除
      delete sessions[sessionId];
      res.setHeader('Set-Cookie', 'sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');

      // IdPのSLOエンドポイントへリダイレクト
      res.writeHead(302, { Location: logoutUrl });
      res.end();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('ログアウトURL生成失敗: ' + err.message);
    }
  }

  // --------------------------------------------------
  // 5. ログアウト完了 (SLO コールバック)
  // --------------------------------------------------
  else if (url.pathname === '/logout/callback') {
    // IdPでのログアウト処理完了後の戻り先
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <h1>ログアウトが完了しました</h1>
      <a href="/">トップへ戻る</a>
    `);
  }

  else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('SP Server running at http://localhost:3000');
});