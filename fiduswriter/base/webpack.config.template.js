const webpack = require("webpack") // eslint-disable-line no-undef
const OfflinePlugin = require("offline-plugin") // eslint-disable-line no-undef

const settings = window.settings // Replaced by django-npm-mjs
const transpile = window.transpile // Replaced by django-npm-mjs

const baseRule = {
    test: /\.(js|mjs)$/,
    use: {
        loader: "babel-loader",
        options: {
            presets: ["@babel/preset-env"],
            plugins: ["@babel/plugin-syntax-dynamic-import"]
        }
    }
}

if (settings.DEBUG) {
    baseRule.exclude = /node_modules/
}

module.exports = { // eslint-disable-line no-undef
    mode: settings.DEBUG ? 'development' : 'production',
    module: {
        rules: [
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
    },
    plugins: [
        new webpack.DefinePlugin({
            "settings.STATIC_URL": JSON.stringify(settings.STATIC_URL),
            "settings.REGISTRATION_OPEN": settings.REGISTRATION_OPEN,
            "settings.CONTACT_EMAIL": JSON.stringify(settings.CONTACT_EMAIL),
            "settings.WS_SERVER": settings.WS_SERVER ? JSON.stringify(settings.WS_SERVER) : false,
            "settings.WS_PORT": settings.WS_PORT,
            "settings.IS_FREE": settings.IS_FREE,
            "settings.TEST_SERVER": settings.TEST_SERVER,
            "settings.DEBUG": settings.DEBUG,
            "transpile.VERSION": transpile.VERSION
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
                events: true
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
