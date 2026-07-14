const path = require("path")
const fs = require("fs")
const acorn = require("acorn")
const {execSync} = require("child_process")

// Packages provided by Fidus Writer core base apps. Plugins may import these
// without re-declaring them in their own package.json5 files.
const BASE_PACKAGES = new Set([
    "fwtoolkit",
    "downloadjs",
    "bibliojson",
    "cropperjs",
    "browserslist-useragent-regexp",
    "file-loader",
    "diff-dom",
    "@fortawesome/fontawesome-free",
    "simple-datatables",
    "@vivliostyle/print",
    "w3c-keyname",
    "source-map-loader",
    "stacktrace-js",
    "regenerator-runtime",
    "@aaroon/workbox-rspack-plugin",
    "qrcode",
    "tokenfield",
    "fix-utf8",
    "@lcdp/offline-plugin"
])

// Common Fidus Writer app names. Used to identify cross-app imports when the
// target plugin is not installed in a standalone pre-commit run.
const KNOWN_FIDUSWRITER_APPS = new Set([
    "base",
    "bibliography",
    "book",
    "browser_check",
    "document",
    "feedback",
    "fixturemedia",
    "menu",
    "user",
    "user_template_manager",
    "usermedia",
    "citation_api_import",
    "gitrepo_export",
    "languagetool",
    "llm",
    "ojs",
    "pandoc",
    "payment",
    "phplist",
    "rust",
    "tum",
    "website"
])

function isKnownAppName(name) {
    return KNOWN_FIDUSWRITER_APPS.has(name)
}

function getPackageName(source) {
    if (source.startsWith("@")) {
        const parts = source.split("/")
        return `${parts[0]}/${parts[1]}`
    }
    return source.split("/")[0]
}

function loadPackageDeps(packageFile) {
    try {
        const output = execSync(
            `python -c "from npm_mjs.json5_parser import load_json5; import json; data=load_json5('${packageFile}'); print(json.dumps(list(data.get('dependencies',{}).keys()) + list(data.get('peerDependencies',{}).keys())))"`,
            {encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"]}
        )
        return JSON.parse(output.trim())
    } catch {
        return []
    }
}

function collectAllowedPackages(appsPaths) {
    const allowed = new Set(BASE_PACKAGES)
    appsPaths.forEach(appPath => {
        for (const fileName of ["package.json5", "package.json"]) {
            const packageFile = path.join(appPath, fileName)
            if (isFile(packageFile)) {
                loadPackageDeps(packageFile).forEach(dep => allowed.add(dep))
                break
            }
        }
    })
    return allowed
}

function getFidusWriterPaths() {
    const paths = []
    try {
        const pathsOutput = execSync(
            'python -c "import fiduswriter; import json; print(json.dumps([str(p) for p in fiduswriter.__path__]))"',
            {encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"]}
        )
            .toString()
            .trim()

        const fwPaths = JSON.parse(pathsOutput)
        const pluginDir = path.resolve(__dirname, "..")

        fwPaths.forEach(testPath => {
            if (
                typeof testPath !== "string" ||
                testPath.startsWith("__editable__")
            ) {
                return
            }
            let resolvedPath
            try {
                resolvedPath = fs.realpathSync(testPath)
            } catch {
                return
            }

            // Skip the current plugin directory
            if (
                resolvedPath === pluginDir ||
                resolvedPath.startsWith(pluginDir + path.sep)
            ) {
                return
            }

            paths.push(resolvedPath)
        })
    } catch {
        // Python import failed
    }

    // Fallback: try to find fiduswriter core by looking in parent directories
    const pluginDir = path.resolve(__dirname, "..")
    const pluginParent = path.resolve(pluginDir, "..")
    const fiduswriterCore = path.join(
        pluginParent,
        "fiduswriter",
        "fiduswriter"
    )
    if (
        fs.existsSync(fiduswriterCore) &&
        fs.statSync(fiduswriterCore).isDirectory()
    ) {
        try {
            const resolvedCore = fs.realpathSync(fiduswriterCore)
            if (
                !paths.some(
                    p =>
                        p === resolvedCore ||
                        resolvedCore.startsWith(p + path.sep)
                )
            ) {
                paths.push(resolvedCore)
            }
        } catch {
            // ignore
        }
    }

    return paths
}

function isFile(file) {
    let stat
    try {
        stat = fs.statSync(file)
    } catch (e) {
        if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) {
            return false
        }
        throw e
    }
    return stat.isFile() || stat.isFIFO()
}

function getAppsPaths(rootDir) {
    const appsPaths = []
    if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
        return appsPaths
    }
    const subdirs = fs.readdirSync(rootDir, {withFileTypes: true})
    subdirs.forEach(subdir => {
        if (subdir.isDirectory()) {
            const staticPath = path.join(rootDir, subdir.name, "static")
            if (
                fs.existsSync(staticPath) &&
                fs.lstatSync(staticPath).isDirectory()
            ) {
                appsPaths.push(path.join(rootDir, subdir.name))
            }
        }
    })
    return appsPaths
}

function resolveFilelocation(source, file, pluginAppsPaths, allAppsPaths) {
    const returnValue = {found: false, path: null, crossApp: false}
    const resolvedFile = path.resolve(file)
    const fullPath = path.resolve(path.dirname(resolvedFile), source)

    if (
        fullPath.includes("/plugins/") ||
        fullPath.includes("/mathlive/opf_includes")
    ) {
        returnValue.found = true
        returnValue.path = null
        return returnValue
    }

    const tryApps = appsPaths => {
        appsPaths.find(appPath => {
            const resolvedPath = fullPath.replace(
                /.*\/static\/js\//g,
                `${appPath}/static/js/`
            )
            if (resolvedPath.endsWith("/index.js") && isFile(resolvedPath)) {
                returnValue.path = resolvedPath
                returnValue.found = true
                return true
            }
            if (resolvedPath.endsWith(".js") && isFile(resolvedPath)) {
                returnValue.path = resolvedPath
                returnValue.found = true
                return true
            }
            if (isFile(`${resolvedPath}.js`)) {
                returnValue.path = `${resolvedPath}.js`
                returnValue.found = true
                return true
            }
            if (isFile(`${resolvedPath}/index.js`)) {
                returnValue.path = `${resolvedPath}/index.js`
                returnValue.found = true
                return true
            }
            return false
        })
    }

    // Determine which plugin app the source file belongs to.
    const sourceApp = pluginAppsPaths.find(appPath =>
        resolvedFile.startsWith(appPath + path.sep)
    )

    // Determine the target app from the relative import source. Cross-app
    // imports are resolved at runtime by django-npm-mjs when all plugins are
    // installed together, so we cannot verify them in a standalone run.
    const sourceSegments = source
        .split("/")
        .filter(segment => segment && segment !== "." && segment !== "..")
    const targetAppName = sourceSegments[0]
    const targetApp = targetAppName
        ? allAppsPaths.find(appPath => path.basename(appPath) === targetAppName)
        : null

    // First try to resolve within the plugin's own apps.
    tryApps(pluginAppsPaths)
    if (returnValue.found) {
        return returnValue
    }

    // If the import points to a different app than the source file, treat it
    // as a cross-app import. These are resolved at runtime by django-npm-mjs
    // when all plugins are installed together, so we cannot verify them in a
    // standalone plugin pre-commit run. We detect cross-app imports either when
    // the target app is present in another location, or when the target name is
    // a known Fidus Writer app that differs from the source app.
    const sourceAppName = sourceApp ? path.basename(sourceApp) : null
    if (
        sourceApp &&
        targetAppName &&
        targetAppName !== sourceAppName &&
        (targetApp || isKnownAppName(targetAppName))
    ) {
        returnValue.found = true
        returnValue.path = null
        returnValue.crossApp = true
        return returnValue
    }

    // Otherwise, try all available apps (installed Fidus Writer plugins/core).
    // Cross-app imports found here are allowed but we cannot verify exports
    // because the target may not be installed in standalone CI runs.
    tryApps(allAppsPaths)
    if (returnValue.found) {
        returnValue.crossApp = true
    }

    return returnValue
}

function checkExports(filePath, importedNames, sourcePath) {
    const content = fs.readFileSync(filePath, "utf-8")
    const ast = acorn.parse(content, {
        sourceType: "module",
        ecmaVersion: "latest"
    })

    const exportedNames = new Set()

    ast.body.forEach(node => {
        if (node.type === "ExportNamedDeclaration") {
            if (node.declaration) {
                if (node.declaration.id) {
                    exportedNames.add(node.declaration.id.name)
                } else if (node.declaration.declarations) {
                    node.declaration.declarations.forEach(decl => {
                        if (decl.id && decl.id.name) {
                            exportedNames.add(decl.id.name)
                        }
                    })
                }
            }
            if (node.specifiers) {
                node.specifiers.forEach(spec => {
                    exportedNames.add(spec.exported.name)
                })
            }
        } else if (node.type === "ExportDefaultDeclaration") {
            exportedNames.add("default")
        }
    })

    importedNames.forEach(name => {
        if (!exportedNames.has(name)) {
            console.error(
                `Unresolved export: ${name} not found in ${filePath}, imported in ${sourcePath}`
            )
            process.exit(1)
        }
    })
}

function checkImports(file, pluginAppsPaths, allAppsPaths, allowedPackages) {
    const content = fs.readFileSync(file, "utf-8")
    const importRegex =
        /import\s+(?:(\*\s+as\s+\w+)|(\w+)|(\{[^}]+\}))\s+from\s+['"](.*)['"]/g
    let match
    while ((match = importRegex.exec(content)) !== null) {
        const source = match[4]
        // Non-relative imports are allowed if they come from the plugin's own
        // declared dependencies or from Fidus Writer core base packages.
        if (!source.startsWith(".") && !source.startsWith("..")) {
            const packageName = getPackageName(source)
            if (!allowedPackages.has(packageName)) {
                console.error(`Unresolved import: ${source} in file ${file}`)
                process.exit(1)
            }
            continue
        }
        const result = resolveFilelocation(
            source,
            file,
            pluginAppsPaths,
            allAppsPaths
        )
        if (!result.found) {
            console.error(`Unresolved import: ${source} in file ${file}`)
            process.exit(1)
        }

        const importedNames = []
        if (match[1]) {
            // import * as name
            importedNames.push("*")
        } else if (match[2]) {
            // import name
            importedNames.push("default")
        } else if (match[3]) {
            // import { name1, name2 }
            const names = match[3]
                .replace(/[{}]/g, "")
                .split(",")
                .map(name => name.trim())
            importedNames.push(...names)
        }
        if (!result.path || result.crossApp) {
            // Plugin or cross-app import - final path cannot be checked here.
            return
        }
        checkExports(result.path, importedNames, file)
    }
}

const pluginPath = path.resolve(__dirname, "../fiduswriter")
const pluginAppsPaths = getAppsPaths(pluginPath)

const fidusWriterPaths = getFidusWriterPaths()
let fidusWriterAppsPaths = []
fidusWriterPaths.forEach(fwPath => {
    fidusWriterAppsPaths = fidusWriterAppsPaths.concat(getAppsPaths(fwPath))
})

const appsPaths = pluginAppsPaths.concat(fidusWriterAppsPaths)

const allowedPackages = collectAllowedPackages(appsPaths)

const files = process.argv.slice(2)
files.forEach(file =>
    checkImports(file, pluginAppsPaths, appsPaths, allowedPackages)
)
