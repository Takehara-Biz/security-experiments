import socket
import time
from dnslib import DNSRecord, DNSHeader, RR, A, QTYPE

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('0.0.0.0', 53))
    print("[Container A] DNS Server started listening on port 53...")

    while True:
        data, addr = sock.recvfrom(1024)
        request = DNSRecord.parse(data)
        qname = str(request.q.qname)
        print(f"[Container A] Received request for {qname} from {addr}")

        # 問い合わせを受けてから5秒遅延させる
        print("[Container A] Delaying response for 5 seconds...")
        time.sleep(5)

        reply = DNSRecord(DNSHeader(id=request.header.id, qr=1, aa=1, ra=1), q=request.q)
        # 本来のAの回答 (例: 172.20.0.10)
        reply.add_answer(RR(request.q.qname, QTYPE.A, rdata=A("172.20.0.10"), ttl=1))
        
        sock.sendto(reply.pack(), addr)
        print(f"[Container A] Sent delayed response to {addr}")

if __name__ == '__main__':
    main()