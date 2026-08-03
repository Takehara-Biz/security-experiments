FROM python:3.11-slim
RUN pip install dnslib
WORKDIR /app
COPY server_a.py .
CMD ["python", "server_a.py"]