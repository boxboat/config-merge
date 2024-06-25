const fs = require('fs')
const glob = require('glob')
const mergeWith = require('lodash.mergewith')
const path = require('path')
const JSON5 = require('json5')
const YAML = require('yaml')
const toml = require('toml-j0.4')
const tomlify = require('tomlify-j0.4')
const { applyPatch } = require('fast-json-patch')
const { execFileSync } = require('child_process')

// constants
const envRe = new RegExp(/\.(?:env|sh)$/, "i")
const mergeJsonRe = new RegExp(/\.(?:json|js)$/, "i")
const mergeJson5Re = new RegExp(/\.json5$/, "i")
const mergeYamlRe = new RegExp(/\.(?:yaml|yml)$/, "i")
const mergeTomlRe = new RegExp(/\.toml$/, "i")
const patchJsonRe = new RegExp(/\.patch\.(?:json|js)$/, "i")
const patchJson5Re = new RegExp(/\.patch\.json5$/, "i")
const patchYamlRe = new RegExp(/\.patch\.(?:yaml|yml)$/, "i")
const patchTomlRe = new RegExp(/\.patch\.toml$/, "i")
const envReserved = new Set(["_", "SHLVL"])

// variables
let args = process.argv.slice(2)
let processPositional = true
let setFlag = null
let array = 'merge'
let doEnvsubst = true
let format = 'yaml'
let obj = {}

// prints the help message
function printHelp() {
    console.error("boxboat/config-merge [flags] file1 [file2] ... [fileN]")
    console.error("-a, --array         merge|overwrite|concat   whether to merge, overwrite, or concatenate arrays.  defaults to merge")
    console.error("-f, --format        json|json5|toml|yaml   whether to output json, json5, toml, or yaml.  defaults to yaml")
    console.error("-h  --help          print the help message")
    console.error("    --no-envsubst   disable substituting env vars")
    console.error("    files ending in .env and .sh will be sourced and used for environment variable substitution")
    console.error("    files ending in .json, .js, .json5, .toml, .yaml, and .yml will be merged")
    console.error("    files ending in .patch.json, .patch.js, .patch.json5, .patch.toml, .patch.yaml, and .patch.yml will be applied as JSONPatch")
}

// loads a .env file into the current environment
function loadSource(file) {
    let exportedVars = execFileSync('/bin/sh', [__dirname + "/source.sh", path.resolve(file)], {
        env: process.env
    }).toString('utf8')
    let exportedLines = exportedVars.split('\n')
    for (let exportedLine of exportedLines) {
        let exportedVarArray = exportedLine.split("=")
        if (exportedVarArray.length >= 2 && !envReserved.has(exportedVarArray[0])) {
            process.env[exportedVarArray[0]] = exportedVarArray.slice(1).join("=")
        }
    }
}

// substitutes environment variables into text
function envsubst(text) {
    return execFileSync('/usr/local/bin/envsubst', [], {
        input: text,
        env: process.env
    }).toString('utf8')
}

// read a file and substitute environment variables
function readFileAndSubEnv(file) {
    let text = fs.readFileSync(path.resolve(file))
    return doEnvsubst ? envsubst(text) : text.toString('utf8');
}

// check empty args
if (args.length == 0) {
    printHelp()
    process.exit(1)
}

// iterate through each arg
let positionalArgCount = 0
for (let arg of args) {

    // process positional arguments
    if (processPositional) {
        if (arg == "-h" || arg == "--help") {
            printHelp()
            process.exit(0)
        }
        if (setFlag == "a") {
            if (arg == "merge" || arg == "overwrite" || arg == "concat") {
                array = arg
                setFlag = null
            } else {
                console.error(`Array should be "merge", "overwrite", or "concat", invalid: ${arg}`)
                printHelp()
                process.exit(1)
            }
        } else if (setFlag == "f") {
            if (arg == "json" || arg == "json5" || arg == "toml" || arg == "yaml") {
                format = arg
                setFlag = null
            } else {
                console.error(`Format should be "json", "json5", "toml", or "yaml", invalid: ${arg}`)
                printHelp()
                process.exit(1)
            }
        }
        else if (arg == "--no-envsubst") {
            doEnvsubst = false
        }
        else if (arg == "-a" || arg == "--array") {
            setFlag = "a"
        }
        else if (arg == "-f" || arg == "--format") {
            setFlag = "f"
        }
        else {
            break
        }
        positionalArgCount++
    }

}

// remove the positional args
args = args.slice(positionalArgCount)

// process glob arguments
let globArgs = []
for (let arg of args) {
    if (glob.hasMagic(arg)) {
        globArr = glob.sync(arg)
        globArgs.push(...globArr)
    } else {
        globArgs.push(arg)
    }
}

// merge customizer
function customizer(objValue, srcValue) {
    if (Array.isArray(objValue)) {
        if (array == "overwrite") {
            return srcValue
        } else if (array == "concat") {
            return objValue.concat(srcValue)
        }
    }
    return undefined
}

// process files
for (arg of globArgs) {
    // check that file exists
    if (!fs.existsSync(path.resolve(arg))) {
        console.error(`File does not exist: ${arg}`)
        printHelp()
        process.exit(1)
    }

    // process file
    try {
        if (arg.match(envRe)) {
            loadSource(arg)
        }
        else if (arg.match(patchJsonRe)) {
            let jsonPatch = JSON.parse(readFileAndSubEnv(arg))
            if (Array.isArray(jsonPatch)) {
                applyPatch(obj, jsonPatch)
            } else {
                console.error(`JSON patch file '${arg}' must a top-level array of patches`)
                process.exit(1)
            }
        }
        else if (arg.match(patchJson5Re)) {
            let json5Patch = JSON5.parse(readFileAndSubEnv(arg))
            if (Array.isArray(json5Patch)) {
                applyPatch(obj, json5Patch)
            } else {
                console.error(`JSON5 patch file '${arg}' must a top-level array of patches`)
                process.exit(1)
            }
        }
        else if (arg.match(patchTomlRe)) {
            let tomlPatch = toml.parse(readFileAndSubEnv(arg))
            if (tomlPatch.patch) {
                applyPatch(obj, tomlPatch.patch)
            } else {
                console.error(`TOML patch file '${arg}' must contain a single key 'patch' containing an array of patches`)
                process.exit(1)
            }
        }
        else if (arg.match(patchYamlRe)) {
            let yamlPatch = YAML.parse(readFileAndSubEnv(arg))
            if (Array.isArray(yamlPatch)) {
                applyPatch(obj, yamlPatch)
            } else {
                console.error(`YAML patch file '${arg}' must a top-level array of patches`)
                process.exit(1)
            }
        }
        else if (arg.match(mergeJsonRe)) {
            mergeWith(obj, JSON.parse(readFileAndSubEnv(arg)), customizer)
        }
        else if (arg.match(mergeJson5Re)) {
            mergeWith(obj, JSON5.parse(readFileAndSubEnv(arg)), customizer)
        }
        else if (arg.match(mergeTomlRe)) {
            mergeWith(obj, toml.parse(readFileAndSubEnv(arg)), customizer)
        }
        else if (arg.match(mergeYamlRe)) {
            mergeWith(obj, YAML.parse(readFileAndSubEnv(arg)), customizer)
        } else {
            console.error(`Invalid file extension: ${arg}`)
            printHelp()
            process.exit(1)
        }
    } catch (err) {
        console.error(`Error when processing file: ${arg}`)
        console.error(err)
        process.exit(1)
    }
}

// serialize object to proper output format
let serialized
if (format == "json") {
    serialized = JSON.stringify(obj, null, "  ")
} else if (format == "json5") {
    serialized = JSON5.stringify(obj, null, "  ")
} else if (format == "toml") {
    serialized = tomlify.toToml(obj, {
        space: 2,
        replace: (key, value) => {
            if (typeof value == "number" && Number.isInteger(value)) {
                return value.toFixed(0)
            }
            return false;
        }
    })
} else {
    serialized = YAML.stringify(obj, {
        defaultStringType: 'QUOTE_DOUBLE',
        simpleKeys: true
    })
}

if (format == "json" || format == "json5" || format == "toml") {
    // json and toml do not print a newline by default
    console.log(serialized)
} else {
    // yaml prints a newline by default
    process.stdout.write(serialized)
}
