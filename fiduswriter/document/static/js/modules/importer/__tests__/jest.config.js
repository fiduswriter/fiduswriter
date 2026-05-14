import {dirname, resolve} from "path"
import {fileURLToPath} from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "../../../../../..")

export default {
    testEnvironment: "node",
    transform: {},
    moduleDirectories: [
        "node_modules",
        resolve(projectRoot, ".transpile/node_modules")
    ],
    moduleNameMapper: {
        "^jszip$": "<rootDir>/mocks/jszip.js",
        "^mathml-to-latex$": "<rootDir>/mocks/mathml-to-latex.js"
    },
    testMatch: ["**/__tests__/**/*.test.js"],
    setupFiles: ["<rootDir>/jest.setup.js"],
    moduleFileExtensions: ["js", "mjs", "json"]
}
