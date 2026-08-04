const dns = require("dns").promises;

/**
 * 送信者のドメインと送信元IPがSPFレコードと一致しているかチェックする
 * @param {string} senderEmail - 例: sender@example.com
 * @param {string} clientIp - 例: 192.0.2.1
 */
async function checkSPF(senderEmail, clientIp) {
  const domain = senderEmail.split("@")[1];
  if (!domain) {
    console.error("エラー: 有効なメールアドレスを指定してください。");
    return;
  }

  console.log(`=== Node.js SPF検証実験 ===`);
  console.log(`送信ドメイン: ${domain}`);
  console.log(`送信元 IP   : ${clientIp}\n`);

  try {
    // 対象ドメインの TXT レコードを取得
    const records = await dns.resolveTxt(domain);
    console.debug("records : ", records);

    // v=spf1 で始まるレコードを抽出
    const spfRecords = records
      .map((r) => r.join(""))
      .filter((r) => r.startsWith("v=spf1"));
    console.debug("spfRecords : ", spfRecords);

    if (spfRecords.length === 0) {
      console.log("結果: [NONE] SPFレコードが見つかりませんでした。");
      return;
    }

    const spfRecord = spfRecords[0];
    console.log(`取得されたSPFレコード:\n  ${spfRecord}\n`);

    // 簡易チェック: SPFレコード内に直接送信元IPまたはincludeが含まれているか検索
    const isIpIncluded =
      spfRecord.includes(`ip4:${clientIp}`) ||
      spfRecord.includes(`ip6:${clientIp}`);

    if (isIpIncluded) {
      console.log(
        `結果: [PASS] IPアドレス (${clientIp}) はSPFレコード内に明示的に指定されています。`,
      );
    } else {
      console.log(`結果: [CHECK_REQUIRED] IPが直接マッチしませんでした。`);
      console.log(
        `※ 実際の判定には include: や a, mx, CIDR範囲の解釈が必要です。`,
      );
    }
  } catch (error) {
    if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
      console.log("結果: [NONE] DNSレコードが存在しません。");
    } else {
      console.error("DNSエラー:", error.message);
    }
  }
}

// 実行引数の取得 (node check_spf.js sender@example.com 192.0.2.1)
const [, , sender, ip] = process.argv;

if (!sender || !ip) {
  console.log(
    "使用法: node check_spf.js <送信者メールアドレス> <送信元IPアドレス>",
  );
  process.exit(1);
}

checkSPF(sender, ip);
