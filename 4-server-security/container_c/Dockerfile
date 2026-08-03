FROM python:3.11-slim
RUN apt-get update && apt-get install -y iproute2 iputils-ping && rm -rf /var/lib/apt/lists/*
RUN pip install dnslib
WORKDIR /app
COPY server_c.py .