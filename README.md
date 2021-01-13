# Config Merge

![test](https://github.com/boxboat/config-merge/workflows/test/badge.svg)

Tool for merging JSON/TOML/YAML files and performing environment variable substitution.  Runs in a Docker Container.

## Usage

`config-merge` is released on [DockerHub](https://hub.docker.com/r/boxboat/config-merge/).  Usage can be seen by running with the `-h` flag

```
docker pull boxboat/config-merge
docker run --rm boxboat/config-merge -h

boxboat/config-merge [-fnh] file1 [file2] ... [fileN]
-f, --format   json|toml|yaml    whether to output json, toml, or yaml.  defaults to yaml
-n  --inline   integer depth to start using inline notation at.  defaults to 10. set to 0 to disable
-h  --help     print the help message
    files ending in .env and .sh will be sourced and used for environment variable substitution
    files ending in .json, .js, .toml, .yaml, and .yml will be merged
    files ending in .patch.json, .patch.js, .patch.toml, .patch.yaml, and .patch.yml will be applied as JSONPatch
```

The working directory of the container is `/home/node` and files/directories that get merged should be mounted into this directory.

## Example

This example considers building a Docker Compose file that can be used for production, but also tested locally.  The production compose file contains an extra network that is not available to the local developer.  We are able to use the patching feature of `config-merge` to remove the unneeded network, and use the environment variable substitution feature to add a custom network.

```
docker_compose_config=$(
    docker run --rm \
    -v "$(pwd)/test/docker-compose/:/home/node/" \
    boxboat/config-merge \
    local.env docker-compose.yml docker-compose-local.patch.yml docker-compose-local.yml
)

# Run with Docker Compose
docker-compose -f - -p nginx-local up <<EOF
$docker_compose_config
EOF

# Deploy to Swarm
docker stack deploy -c - nginx-local <<EOF
$docker_compose_config
EOF
```

Globbing is supported, but should be escaped in the `docker run` script so that expansion will occur inside of the container:

```
docker_compose_config=$(
    docker run --rm \
    -v "$(pwd)/test/docker-compose/:/home/node/" \
    boxboat/config-merge \
    "*.env" docker-compose.yml "*-local*"
)
```

## Merging

Files ending in `.json`, `.js`, `.toml`, `.yaml`, and `.yml` are merged together.  The merging algorithm uses the [lodash merge](https://lodash.com/docs/4.17.4#merge) function and operates:

> Source properties that resolve to undefined are skipped if a destination value exists. Array and plain object properties are merged recursively. Other objects and value types are overridden by assignment. Source objects are applied from left to right. Subsequent sources overwrite property assignments of previous sources.

## Patching

Files ending in `.patch.json`, `.patch.js`, `.patch.toml`, `.patch.yaml`, and `.patch.yml` are applied as [JSON Patch](http://jsonpatch.com/)

## Environment Variable Substitution

Files ending in `.env` and `.sh` are sourced into the environment.  Environment variables are substituted using [a8m/envsubst](https://github.com/a8m/envsubst), a go version of `envsubst` that supports the following default variables:

|__Expression__     | __Meaning__    |
| ----------------- | -------------- |
|`${var}`	   | Value of var (same as `$var`)
|`${var-$DEFAULT}`  | If var not set, evaluate expression as $DEFAULT
|`${var:-$DEFAULT}` | If var not set or is empty, evaluate expression as $DEFAULT
|`${var=$DEFAULT}`  | If var not set, evaluate expression as $DEFAULT
|`${var:=$DEFAULT}` | If var not set or is empty, evaluate expression as $DEFAULT
|`${var+$OTHER}`	   | If var set, evaluate expression as $OTHER, otherwise as empty string
|`${var:+$OTHER}`   | If var set, evaluate expression as $OTHER, otherwise as empty string
<sub>table taken from [here](http://www.tldp.org/LDP/abs/html/refcards.html#AEN22728)</sub>
