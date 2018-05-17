#!/bin/sh

set -e

echo "JSON:"
docker run --rm \
    -v "$(pwd)/test/mix/:/home/node/" \
    boxboat/config-merge \
    -f json "*"
echo ""

echo "TOML:"
docker run --rm \
    -v "$(pwd)/test/mix/:/home/node/" \
    boxboat/config-merge \
    -f toml "*"
echo ""

echo "YAML:"
docker run --rm \
    -v "$(pwd)/test/mix/:/home/node/" \
    boxboat/config-merge \
    -n 4 "*"
echo ""

echo "Docker Compose"
docker run --rm \
    -v "$(pwd)/test/docker-compose/:/home/node/" \
    boxboat/config-merge \
    local.env docker-compose.yml docker-compose-local.patch.yml docker-compose-local.yml
