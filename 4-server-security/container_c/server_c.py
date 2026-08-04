import socket
from dnslib import DNSRecord

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('0.0.0.0', 53))
    print("[Container C] DNS Cache Server 2 listening on port 53...")

    while True:
        data, addr = sock.recvfrom(1024)
        request = DNSRecord.parse(data)
        print(f"[Container C] Received query for {request.q.qname} from {addr}")

        # A (172.20.0.10) へ問い合わせを転送 (ルーティングによりB経由で通信)
        forward_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        forward_sock.settimeout(15)
        
        try:
            forward_sock.sendto(data, ('172.20.0.10', 53))
            # recvfrom(1024) の第2引数から 送信元IPアドレス と ポート番号 を取得
            resp_data, resp_addr = forward_sock.recvfrom(1024)
            
            # 受信したDNSレスポンスデータをパースして内容を取得
            response = DNSRecord.parse(resp_data)
            
            # Answer セクションから返却されたIPアドレス等のレコード情報を抽出
            answers = [f"{rr.rname} -> {rr.rdata}" for rr in response.rr]
            answer_str = ", ".join(answers) if answers else "No Answer"

            # ログ出力：送信元IP、ポート番号、レスポンス内容
            print(f"[Container C] Received response from {resp_addr[0]}:{resp_addr[1]} | Content: [{answer_str}]", flush=True)
            # 問い合わせ元にレスポンスを返す
            sock.sendto(resp_data, addr)
            print(f"[Container C] Forwarded response back to {addr}")
        except Exception as e:
            print(f"[Container C] Error during forwarding: {e}")

if __name__ == '__main__':
    main()