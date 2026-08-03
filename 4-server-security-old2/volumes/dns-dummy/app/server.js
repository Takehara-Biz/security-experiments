import dgram from "node:dgram";
import dnsPacket from "dns-packet";

const server = dgram.createSocket("udp4");
const DELAY_MS = 60000; // 待機時間（ミリ秒）
const RESPONSE_IP = "192.168.1.12"; // 任意のレスポンスIP

server.on("message", (msg, rinfo) => {
  console.log("packet received! : ", msg);
  try {
    const request = dnsPacket.decode(msg);
    const question = request.questions?.[0];

    if (!question || question.type !== "A") return;

    // 一定時間待機した後にレスポンスを返却
    setTimeout(() => {
      const response = dnsPacket.encode({
        type: "response",
        id: request.id,
        flags: dnsPacket.AUTHORITATIVE_ANSWER,
        questions: request.questions,
        answers: [
          {
            type: "A",
            name: question.name,
            ttl: 1,
            data: RESPONSE_IP,
          },
        ],
      });

      server.send(response, 0, response.length, rinfo.port, rinfo.address);
    }, DELAY_MS);
  } catch (err) {
    console.error("DNSパケットの処理エラー:", err);
  }
});

server.bind(53, () => {
  console.log("Node.js DNS サーバーがポート53で起動しました");
});
