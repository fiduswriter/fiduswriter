const webpack = require("webpack") // eslint-disable-line no-undef
const OfflinePlugin = require("@lcdp/offline-plugin") // eslint-disable-line no-undef

const settings = window.settings // Replaced by django-npm-mjs
const transpile = window.transpile // Replaced by django-npm-mjs

const baseRule = {
    test: /\.(js|mjs)$/,
    use: {
        loader: "babel-loader",
        options: {
            presets: ["@babel/preset-env"],
            plugins: ["@babel/plugin-syntax-dynamic-import", "@babel/plugin-proposal-optional-chaining"]
        }
    }
}

if (settings.DEBUG) {
    baseRule.exclude = /node_modules/
}

module.exports = { // eslint-disable-line no-undef
    mode: settings.DEBUG ? 'development' : 'production',
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
                        loader: 'file-loader',
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
        crossOriginLoading: 'anonymous'
    },
    plugins: [
        new webpack.DefinePlugin({
            "settings_STATIC_URL": JSON.stringify(settings.STATIC_URL),
            "settings_REGISTRATION_OPEN": settings.REGISTRATION_OPEN,
            "settings_SOCIALACCOUNT_OPEN": settings.SOCIALACCOUNT_OPEN,
            "settings_PASSWORD_LOGIN": settings.PASSWORD_LOGIN,
            "settings_CONTACT_EMAIL": JSON.stringify(settings.CONTACT_EMAIL),
            "settings_WS_SERVER": settings.WS_SERVER ? JSON.stringify(settings.WS_SERVER) : false,
            "settings_WS_PORT": settings.WS_PORT,
            "settings_IS_FREE": settings.IS_FREE,
            "settings_TEST_SERVER": settings.TEST_SERVER,
            "settings_DEBUG": settings.DEBUG,
            "settings_SOURCE_MAPS": JSON.stringify(settings.SOURCE_MAPS) || false,
            "settings_USE_SERVICE_WORKER": settings.USE_SERVICE_WORKER,
            "settings_JSONPATCH": settings.JSONPATCH,
            "settings_MEDIA_MAX_SIZE": settings.MEDIA_MAX_SIZE,
            "transpile_VERSION": transpile.VERSION
        }),
        new OfflinePlugin({
            cacheMaps: [
                {
                    match: function(url) {
                        if (
                            url.pathname.startsWith('/admin') ||
                            url.pathname.startsWith('/api/') ||
                            url.pathname.startsWith('/media/')
                        ) {
                            return true
                        }
                        return new URL('/', url)
                    },
                    requestTypes: ['navigate']
                }
            ],
            ServiceWorker: {
                publicPath: '/sw.js',
                events: true,
                entry: "./js/sw-template.js"
            },
            autoUpdate: true,
            appShell: "/",
            externals: transpile.STATIC_FRONTEND_FILES.concat([
                "/",
                "/api/django_js_error_hook/utils.js",
                "/api/jsi18n/",
                transpile.BASE_URL + "browser_check.js",
                "/manifest.json"
            ]),
            AppCache: false,
            version: transpile.VERSION,
            excludes: [
                'admin_console.js',
                'maintenance.js',
                'schema_export.js',
                'test_caret.js',
                'document_template_admin.js',
                '**/.*',
                '**/*.map',
                '**/*.gz',
                '**/*.csljson'
            ]
        })
    ],
    entry: transpile.ENTRIES
}
