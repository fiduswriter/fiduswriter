const webpack = require("webpack") // eslint-disable-line no-undef
const WorkboxPlugin = require("workbox-webpack-plugin") // eslint-disable-line no-undef

const settings = window.settings // Replaced by django-npm-mjs
const transpile = window.transpile // Replaced by django-npm-mjs

const baseRule = {
    test: /\.(js|mjs)$/,
    use: {
        loader: "babel-loader",
        options: {
            presets: ["@babel/preset-env"]
        }
    }
}

const predefinedVariables = {
    "settings_BRANDING_LOGO": settings.BRANDING_LOGO ? JSON.stringify(settings.BRANDING_LOGO) : false,
    "settings_STATIC_URL": JSON.stringify(settings.STATIC_URL),
    "settings_REGISTRATION_OPEN": settings.REGISTRATION_OPEN,
    "settings_SOCIALACCOUNT_OPEN": settings.SOCIALACCOUNT_OPEN,
    "settings_PASSWORD_LOGIN": settings.PASSWORD_LOGIN,
    "settings_CONTACT_EMAIL": JSON.stringify(settings.CONTACT_EMAIL),
    "settings_IS_FREE": settings.IS_FREE,
    "settings_TEST_SERVER": settings.TEST_SERVER,
    "settings_DEBUG": settings.DEBUG,
    "settings_SOURCE_MAPS": JSON.stringify(settings.SOURCE_MAPS) || false,
    "settings_USE_SERVICE_WORKER": settings.USE_SERVICE_WORKER,
    "settings_MEDIA_MAX_SIZE": settings.MEDIA_MAX_SIZE,
    "settings_FOOTER_LINKS": JSON.stringify(settings.FOOTER_LINKS),
    "transpile_VERSION": transpile.VERSION
}

if (settings.DEBUG) {
    baseRule.exclude = /node_modules/
    predefinedVariables.staticUrl = `(url => ${JSON.stringify(settings.STATIC_URL)} + url)`
} else {
    predefinedVariables.staticUrl = `(url => ${JSON.stringify(settings.STATIC_URL)} + url + "?v=" + ${transpile.VERSION})`
}

module.exports = { // eslint-disable-line no-undef
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
                test: /\.(csljson)$/i,
                use: [
                    {
                        loader: "file-loader",
                    },
                ],
            },
            baseRule
        ]
    },
    output: {
        path: transpile.OUT_DIR,
        chunkFilename: "[id]-" + transpile.VERSION + ".js",
        publicPath: transpile.BASE_URL,
        crossOriginLoading: "anonymous"
    },
    plugins: [
        new webpack.DefinePlugin(predefinedVariables),
        new WorkboxPlugin.GenerateSW({
            clientsClaim: true,
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
                    manifest: manifestEntries.map((entry) => {
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
                        return {url: `${url}?v=${transpile.VERSION}`, revision: null}
                    }
                }
            ).concat(
                [
                    "/",
                    "/api/jsi18n/",
                    "/manifest.json"
                ].map(
                    url => ({url, revision: transpile.VERSION.toString()})
                )
            ),
        }),
    ],
    entry: transpile.ENTRIES
}
