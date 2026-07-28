#!/bin/bash

openssl genpkey -algorithm RSA -out private_key.pem -outpubkey public_key.pem -pkeyopt rsa_keygen_bits:2048
