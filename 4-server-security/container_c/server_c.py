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
            resp_data, _ = forward_sock.recvfrom(1024)
            # 問い合わせ元にレスポンスを返す
            sock.sendto(resp_data, addr)
            print(f"[Container C] Forwarded response back to {addr}")
        except Exception as e:
            print(f"[Container C] Error during forwarding: {e}")

if __name__ == '__main__':
    main()