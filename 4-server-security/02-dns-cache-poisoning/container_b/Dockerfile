FROM python:3.11-slim
RUN apt-get update && apt-get install -y dnsutils iproute2 iptables && rm -rf /var/lib/apt/lists/*
RUN pip install dnslib
WORKDIR /app
CMD ["python", "proxy_b.py"]