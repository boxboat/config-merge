# Config Merge

Tool for merging YAML/JSON files and performing environment variable substitution.

## Usage

```
config-merge [-fnh] file1 [file2] ... [fileN]
-f, --format   json|yaml    whether to output json or yaml.  defaults to yaml
-n  --inline   integer depth to start using inline notation at.  defaults to 10. set to 0 to disable
-h  --help     print the help message
    files ending in .env and .sh will be sourced and used for environment variable substitution
    files ending in .yml, .yaml, .json, and .js will be merged
    files ending in .patch.yml, .patch.yaml, .patch.json, and .patch.js will be applied as JSONPatch
```

## Merging

Files ending in `.yaml`, `.yml`, `.json`, and `.js` are merged together.  The merging algorithm uses the [lodash merge](https://lodash.com/docs/4.17.4#merge) function and operates:

> Source properties that resolve to undefined are skipped if a destination value exists. Array and plain object properties are merged recursively. Other objects and value types are overridden by assignment. Source objects are applied from left to right. Subsequent sources overwrite property assignments of previous sources.

## Patching

Files ending in `.patch.yaml`, `.patch.yml`, `.patch.json`, and `.patch.js` are applied as [JSON Patch](http://jsonpatch.com/)

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
