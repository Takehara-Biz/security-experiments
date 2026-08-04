const dns = require("dns").promises;

/**
 * Node.jsによるSPF判定用関数
 * @param {string} senderEmail Envelope From (例: root@example1.test)
 * @param {string} clientIp 送信元接続IP (例: 10.5.0.20)
 */
async function verifySPF(senderEmail, clientIp) {
  const domain = senderEmail.split("@")[1];

  if (!domain) {
    console.error("エラー: 有効なメールアドレスを指定してください。");
    return;
  }

  console.log(`\n=== Node.js SPF 検証実験 ===`);
  console.log(`送信者アドレス (Return-Path): ${senderEmail}`);
  console.log(`検証ドメイン               : ${domain}`);
  console.log(`送信元 IP アドレス         : ${clientIp}`);
  console.log(`-------------------------------------------`);

  try {
    // 1. Local BINDへ TXT レコードを問い合わせ
    const records = await dns.resolveTxt(domain);

    // v=spf1 で始まるレコードを抽出
    const spfRecords = records
      .map((r) => r.join(""))
      .filter((r) => r.startsWith("v=spf1"));

    if (spfRecords.length === 0) {
      console.log("判定結果: [NONE] SPFレコードが存在しません。");
      return;
    }

    const spfRecord = spfRecords[0];
    console.log(`[DNS取得成功] SPFレコード:\n  ${spfRecord}\n`);

    // 2. メカニズムの解析 (簡易パーサー)
    const tokens = spfRecord.split(/\s+/);

    // デフォルトのオールルール (~all, -all, ?all, +all) を取得
    let defaultQualifier = "?all";
    const allToken = tokens.find((t) => t.endsWith("all"));
    if (allToken) {
      defaultQualifier = allToken;
    }

    // ip4 / ip6 マッチング
    let matched = false;
    for (const token of tokens) {
      if (token.startsWith("ip4:")) {
        const allowedIp = token.replace("ip4:", "");
        if (allowedIp === clientIp) {
          matched = true;
          console.log(`[マッチ] ip4メカニズム (${allowedIp}) に一致しました。`);
          break;
        }
      }
    }

    // 3. 判定出力
    if (matched) {
      console.log("-------------------------------------------");
      console.log("【判定結果】 PASS : 送信元IPは許可されています。");
    } else {
      console.log("-------------------------------------------");
      switch (defaultQualifier) {
        case "~all":
          console.log(
            "【判定結果】 SOFTFAIL : 未許可のIPですが、受信拒否は推奨されません (~all)。",
          );
          break;
        case "-all":
          console.log(
            "【判定結果】 FAIL : 未許可のIPのため、明確に拒否対象です (-all)。",
          );
          break;
        default:
          console.log(
            `【判定結果】 NEUTRAL/UNKNOWN : 一致せず (${defaultQualifier})`,
          );
          break;
      }
    }
  } catch (error) {
    if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
      console.log(
        "【判定結果】 NONE : ドメインのDNSレコードが見つかりません。",
      );
    } else {
      console.error("DNS検索エラー:", error.message);
    }
  }
}

// コマンドライン引数の取得
const [, , sender, ip] = process.argv;

if (!sender || !ip) {
  console.log(
    "使用法: node check_spf.js <送信者メールアドレス> <送信元IPアドレス>",
  );
  console.log("例  : node check_spf.js root@example1.test 10.5.0.20");
  process.exit(1);
}

verifySPF(sender, ip);
