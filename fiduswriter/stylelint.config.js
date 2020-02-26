module.exports = { // eslint-disable-line no-undef
    "extends": process.env.PROJECT_PATH + "/.transpile/node_modules/stylelint-config-standard",
    "plugins": [
        process.env.PROJECT_PATH + "/.transpile/node_modules/stylelint-value-no-unknown-custom-properties"
    ],
    "rules": {
        "max-empty-lines": 4,
        "string-quotes": "single",
        "color-hex-length": "long",
        "number-leading-zero": "never",
        "max-nesting-depth": 2,
        "indentation": 4,
        "csstools/value-no-unknown-custom-properties": [
            true,
            {
                "importFrom": [process.env.SRC_PATH + "/base/static/css/colors.css"]
            }
        ]
    }
}