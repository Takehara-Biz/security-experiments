#!/bin/sh

set -eu

dig +time=60 +retry=0 host1.example1.test
