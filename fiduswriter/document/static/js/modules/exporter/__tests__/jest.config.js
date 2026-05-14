import {dirname, resolve} from "path"
import {fileURLToPath} from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "../../../../../..")
const m = p => "<rootDir>/mocks/" + p

export default {
    rootDir: ".",
    testEnvironment: "node",
    transform: {},
    moduleDirectories: [
        "node_modules",
        resolve(projectRoot, ".transpile/node_modules")
    ],
    moduleNameMapper: {
        "^downloadjs$": m("downloadjs.js"),
        "^mathlive$": m("mathlive.js"),
        "^mathml2omml$": m("mathml2omml.js"),
        "^@vivliostyle/print$": m("vivliostyle.js"),
        "^pretty$": m("pretty.js"),
        "^biblatex-csl-converter$": m("biblatex-csl-converter.js"),
        "../common$": m("common.js"),
        "../../common$": m("common.js"),
        "../../citations/format$": m("citations-format.js"),
        "../../bibliography/schema/csl_bib$": m("csl-bib-schema.js"),
        "../../mathlive/opf_includes$": m("empty-module.js")
    },
    testMatch: ["**/__tests__/**/*.test.js"],
    setupFiles: ["<rootDir>/jest.setup.js"],
    moduleFileExtensions: ["js", "mjs", "json"]
}
