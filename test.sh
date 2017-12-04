#!/bin/sh

set -e

echo "YAML:"
docker run --rm \
    -v "$(pwd)/test/mix:/home/node/test/mix" \
    boxboat/config-merge \
    -n 4 test/mix/*
echo ""

echo "JSON:"
docker run --rm \
    -v "$(pwd)/test/mix:/home/node/test/mix" \
    boxboat/config-merge \
    -f json test/mix/*
echo ""

echo "Docker Compose"
docker run --rm \
    -v "$(pwd)/test/docker-compose/local.env:/home/node/local.env" \
    -v "$(pwd)/test/docker-compose/docker-compose.yml:/home/node/docker-compose.yml" \
    -v "$(pwd)/test/docker-compose/docker-compose-local.patch.yml:/home/node/docker-compose-local.patch.yml" \
    -v "$(pwd)/test/docker-compose/docker-compose-local.yml:/home/node/docker-compose-local.yml" \
    boxboat/config-merge \
    local.env docker-compose.yml docker-compose-local.patch.yml docker-compose-local.yml
