#!/bin/bash
set -euo pipefail 

echo "waiting message... send from another container!"

nc -lk -p 8080