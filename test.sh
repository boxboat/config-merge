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

echo "YAML array merge:"
docker run --rm \
    -v "$(pwd)/test/mix/:/home/node/" \
    boxboat/config-merge \
    "*"
echo ""

echo "YAML array overwrite:"
docker run --rm \
    -v "$(pwd)/test/mix/:/home/node/" \
    boxboat/config-merge \
    -a overwrite "*"
echo ""

echo "YAML array concat:"
docker run --rm \
    -v "$(pwd)/test/mix/:/home/node/" \
    boxboat/config-merge \
    -a concat "*"
echo ""

echo "Docker Compose"
docker run --rm \
    -v "$(pwd)/test/docker-compose/:/home/node/" \
    boxboat/config-merge \
    local.env docker-compose.yml docker-compose-local.patch.yml docker-compose-local.yml
echo ""

echo "Docker Compose no envsubst"
docker run --rm \
    -v "$(pwd)/test/docker-compose/:/home/node/" \
    boxboat/config-merge \
    --no-envsubst local.env docker-compose.yml docker-compose-local.patch.yml docker-compose-local.yml
