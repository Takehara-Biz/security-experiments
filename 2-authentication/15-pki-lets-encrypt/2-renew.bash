docker run --rm -it \
  -v $(pwd)/ssl_out:/acme.sh \
  neilpang/acme.sh --renew \
  --server letsencrypt \
  --staging \
  --dns \
  -d liberty-it.biz \
  --yes-I-know-dns-manual-mode-enough-go-ahead-please
