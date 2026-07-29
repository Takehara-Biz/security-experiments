#!/bin/bash

docker image build -t hash-function-image . --no-cache
docker container run --rm -it -v./volumes:/app --name hash-function-container hash-function-image /bin/bash
