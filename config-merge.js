const fs = require('fs')
const glob = require('glob')
const merge = require('lodash.merge')
const path = require('path')
const YAML = require('yaml')
const toml = require('toml-j0.4')
const tomlify = require('tomlify-j0.4')
const { applyPatch } = require('fast-json-patch')
const { execFileSync } = require('child_process')

const envRe = new RegExp(/\.(?:env|sh)$/, "i")
const mergeJsonRe = new RegExp(/\.(?:json|js)$/, "i")
const mergeYamlRe = new RegExp(/\.(?:yaml|yml)$/, "i")
const mergeTomlRe = new RegExp(/\.toml$/, "i")
const patchJsonRe = new RegExp(/\.patch\.(?:json|js)$/, "i")
const patchYamlRe = new RegExp(/\.patch\.(?:yaml|yml)$/, "i")
const patchTomlRe = new RegExp(/\.patch\.toml$/, "i")
const envReserved = new Set(["_", "SHLVL"])

// prints the help message
function printHelp() {
    console.error("boxboat/config-merge [-fnh] file1 [file2] ... [fileN]")
    console.error("-f, --format   json|toml|yaml    whether to output json, toml, or yaml.  defaults to yaml")
    console.error("-n  --inline   integer depth to start using inline notation at.  defaults to 10. set to 0 to disable")
    console.error("-h  --help     print the help message")
    console.error("    files ending in .env and .sh will be sourced and used for environment variable substitution")
    console.error("    files ending in .json, .js, .toml, .yaml, and .yml will be merged")
    console.error("    files ending in .patch.json, .patch.js, .patch.toml, .patch.yaml, and .patch.yml will be applied as JSONPatch")
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
    return envsubst(fs.readFileSync(path.resolve(file), 'utf8'))
}

let args = process.argv.slice(2)
let processPositional = true
let setFlag = null
let format = 'yaml'
let inline = 10
let obj = {}

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
        if (setFlag == "f") {
            if (arg == "json" || arg == "toml" || arg == "yaml") {
                format = arg
                setFlag = null
            } else {
                console.error(`Format should be "json", "toml", or "yaml", invalid: ${arg}`)
                printHelp()
                process.exit(1)
            }
        }
        else if (setFlag == "n") {
            if (typeof parseInt(arg) === "number") {
                inline = parseInt(arg)
                setFlag = null
            } else {
                console.error(`Inline argument should be an integer, invalid: ${arg}`)
                printHelp()
                process.exit(1)
            }
        }
        else if (arg == "-f" || arg == "--foramt") {
            setFlag = "f"
        }
        else if (arg == "-n" || arg == "--inline") {
            setFlag = "n"
        } else {
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
            merge(obj, JSON.parse(readFileAndSubEnv(arg)))
        }
        else if (arg.match(mergeTomlRe)) {
            merge(obj, toml.parse(readFileAndSubEnv(arg)))
        }
        else if (arg.match(mergeYamlRe)) {
            merge(obj, YAML.parse(readFileAndSubEnv(arg)))
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
    YAML.defaultOptions.simpleKeys = true
    serialized = YAML.stringify(obj)
}

if (format == "json" || format == "toml") {
    // json and toml do not print a newline by default
    console.log(serialized)
} else {
    // yaml prints a newline by default
    process.stdout.write(serialized)
}
