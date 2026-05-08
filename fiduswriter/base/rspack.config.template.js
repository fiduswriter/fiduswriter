const rspack = require("@rspack/core")
const WorkboxPlugin = require("@aaroon/workbox-rspack-plugin")

const settings = window.settings // Replaced by django-npm-mjs
const transpile = window.transpile // Replaced by django-npm-mjs

// Settings are now passed from the backend via window.settings
// Only keep transpile-specific variables that are needed at build time
const predefinedVariables = {
    transpile_VERSION: transpile.VERSION
}

// staticUrl helper now uses runtime settings.STATIC_URL and transpile.VERSION
predefinedVariables.staticUrl = `(url => settings.STATIC_URL + url + "?v=" + ${transpile.VERSION})`

module.exports = {
    mode: settings.DEBUG ? "development" : "production",
    devtool: settings.SOURCE_MAPS || false,
    module: {
        rules: [
            {
                test: /\.js$/,
                use: ["source-map-loader"],
                enforce: "pre"
            },
            {
                test: /\.(csljson)$/,
                type: "asset/resource"
            },
            {
                test: /\.(wasm)$/,
                type: "asset/resource"
            }
        ]
    },
    output: {
        path: transpile.OUT_DIR,
        chunkFilename: "[id]-" + transpile.VERSION + ".js",
        publicPath: transpile.BASE_URL,
        crossOriginLoading: "anonymous"
    },
    plugins: [
        new rspack.DefinePlugin(predefinedVariables),
        new WorkboxPlugin.GenerateSW({
            clientsClaim: true,
            maximumFileSizeToCacheInBytes: 100 * 1024 * 1024, // 100 MB
            skipWaiting: true,
            inlineWorkboxRuntime: true,
            swDest: "sw.js",
            disableDevLogs: true,
            exclude: [
                "admin_console.js",
                "maintenance.js",
                "schema_export.js",
                "test_caret.js",
                "document_template_admin.js",
                "**/.*",
                "**/*.map",
                "**/*.gz"
            ],
            manifestTransforms: [
                manifestEntries => ({
                    manifest: manifestEntries.map(entry => {
                        if (!entry.url.includes(String(transpile.VERSION))) {
                            entry.url += `?v=${transpile.VERSION}`
                        }
                        return entry
                    })
                })
            ],
            additionalManifestEntries: transpile.STATIC_FRONTEND_FILES.map(
                url => {
                    if (url.includes("/fonts/")) {
                        return {url, revision: transpile.VERSION.toString()}
                    } else {
                        return {
                            url: `${url}?v=${transpile.VERSION}`,
                            revision: null
                        }
                    }
                }
            ).concat(
                ["/", "/api/jsi18n/", "/manifest.json"].map(url => ({
                    url,
                    revision: transpile.VERSION.toString()
                }))
            )
        })
    ],
    entry: transpile.ENTRIES
}
