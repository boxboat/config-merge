#!/bin/sh

set -e

echo "YAML:"
docker run --rm \
    -v "$(pwd)/test/mix/:/home/node/" \
    boxboat/config-merge \
    -n 4 "*"
echo ""

echo "JSON:"
docker run --rm \
    -v "$(pwd)/test/mix/:/home/node/" \
    boxboat/config-merge \
    -f json "*"
echo ""

echo "Docker Compose"
docker run --rm \
    -v "$(pwd)/test/docker-compose/:/home/node/" \
    boxboat/config-merge \
    local.env docker-compose.yml docker-compose-local.patch.yml docker-compose-local.yml
