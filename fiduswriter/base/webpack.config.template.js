const webpack = require("webpack") // eslint-disable-line no-undef
const OfflinePlugin = require("offline-plugin") // eslint-disable-line no-undef

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

if (django.conf.settings.DEBUG) { // eslint-disable-line no-undef
    baseRule.exclude = /node_modules/
}

const definitions = {
    "settings.STATIC_URL": django.conf.settings.STATIC_URL // eslint-disable-line no-undef
}

// splitting  key so it won't be replaced
definitions[
    "transpile" + "." + "VERSION"  // eslint-disable-line no-useless-concat
] = transpile.VERSION // eslint-disable-line no-undef


module.exports = { // eslint-disable-line no-undef
    mode: django.conf.settings.DEBUG ? 'development' : 'production', // eslint-disable-line no-undef
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
        path: transpile.OUT_DIR, // eslint-disable-line no-undef
        chunkFilename: "[id]-" + transpile.VERSION + ".js", // eslint-disable-line no-undef
        publicPath: transpile.BASE_URL, // eslint-disable-line no-undef
    },
    plugins: [
        new webpack.DefinePlugin(definitions),
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
            externals: transpile.STATIC_FRONTEND_FILES.concat([ // eslint-disable-line no-undef
                "/",
                "/api/django_js_error_hook/utils.js",
                "/api/jsi18n/",
                transpile.BASE_URL + "browser_check.js", // eslint-disable-line no-undef
                "/manifest.json"
            ]),
            AppCache: false,
            version: transpile.VERSION, // eslint-disable-line no-undef
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
    entry: transpile.ENTRIES // eslint-disable-line no-undef
}
