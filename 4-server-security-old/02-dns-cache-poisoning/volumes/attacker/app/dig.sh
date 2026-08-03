#!/bin/sh

set -euo pipefail

dig +time=60 +retry=0 @child-dns-cache-server example.com
