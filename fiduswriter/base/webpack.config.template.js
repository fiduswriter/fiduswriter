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
};

if (django.conf.settings.DEBUG) {
    baseRule.exclude = /node_modules/
}

module.exports = { // eslint-disable-line no-undef
    mode: django.conf.settings.DEBUG ? 'development' : 'production',
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
            "transpile.VERSION": transpile.VERSION,
            "settings.STATIC_URL": django.conf.settings.STATIC_URL
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
