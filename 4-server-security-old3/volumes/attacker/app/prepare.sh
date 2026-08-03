# attackerコンテナ内で実行
apt-get update && apt-get install -y python3-pip
apt-get install -y libpcap0.8
pip3 install scapy --break-system-packages
