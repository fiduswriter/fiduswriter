import {App} from "@fiduswriter/frontend/app"

// Django API adapters
import {djangoApiConnectors} from "../api_adapters/index.js"

/*
 * Plugin imports from Django apps.
 * These use the transpile system's module overlay — files in
 * <app>/static/js/plugins/<name>/ are discoverable as
 * ../../plugins/<name>/ from any module in the overlay.
 *
 * Currently all plugin modules are empty placeholder init.js files.
 * When real plugins are added, update the paths below (and ensure
 * the plugin directories export an index.js / init.js with the
 * expected `plugins` named export).
 */

// import {plugins as appPlugins} from "../../plugins/app"
// import {plugins as bibPlugins} from "../../plugins/bibliography_overview/index.js"
// import {plugins as citationDialogPlugins} from "../../plugins/citation_dialog/index.js"
// import {plugins as editorPlugins} from "../../plugins/editor/index.js"
// import {plugins as menuPlugins} from "../../plugins/menu"

const appPlugins = []
const bibPlugins = []
const citationDialogPlugins = []
const editorPlugins = []
const menuPlugins = []

const theApp = new App(djangoApiConnectors, window.settings, {
    appPlugins,
    menuPlugins,
    editorPlugins,
    citationDialogPlugins,
    bibliographyOverviewPlugins: bibPlugins
})
theApp.init()
window.theApp = theApp
