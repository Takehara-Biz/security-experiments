docker run --rm -it \
  -v $(pwd)/ssl_out:/acme.sh \
  neilpang/acme.sh:3.1.4 --issue \
  --server letsencrypt \
  --staging \
  --accountemail "takehara@libery-it.biz" \
  --dns \
  -d liberty-it.biz \
  --yes-I-know-dns-manual-mode-enough-go-ahead-please
