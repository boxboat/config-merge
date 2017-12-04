#!/bin/sh

echo "YAML:"
docker run --rm \
    -v "$(pwd)/test:/home/node/test" \
    boxboat/config-merge \
    -n 4 test/*
echo ""

echo "JSON:"
docker run --rm \
    -v "$(pwd)/test:/home/node/test" \
    boxboat/config-merge \
    -f json test/*
