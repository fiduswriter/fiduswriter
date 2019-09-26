const webpack = require("webpack") // eslint-disable-line no-undef
const OfflinePlugin = require("offline-plugin") // eslint-disable-line no-undef
module.exports = { // eslint-disable-line no-undef
    mode: "$MODE$",
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
            {
                $RULES$, // eslint-disable-line no-undef
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            "@babel/preset-env"
                        ],
                        plugins: [
                            "@babel/plugin-syntax-dynamic-import"
                        ]
                    }
                }
            }
        ]
    },
    output: {
        path: "$OUT_DIR$",
        chunkFilename: "[id]-$VERSION$.js",
        publicPath: "$TRANSPILE_BASE_URL$",
    },
    plugins: [
        new webpack.DefinePlugin({
            "process.env.TRANSPILE_VERSION": process.env.TRANSPILE_VERSION
        }),
        new OfflinePlugin({
            cacheMaps: [
                {
                    match: function(url) {
                        if (
                            url.pathname.indexOf('/admin') === 0 ||
                            url.pathname.indexOf('/api/') === 0
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
            externals: [
                "/",
                "/api/django_js_error_hook/utils.js",
                "/api/jsi18n/",
                "/manifest.json",
                $STATIC_FRONTEND_FILES$ // eslint-disable-line no-undef
            ],
            AppCache: false,
            version: '$VERSION$',
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
    entry: {
        $ENTRIES$ // eslint-disable-line no-undef
    }
}
