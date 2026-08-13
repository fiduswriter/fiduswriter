import {App} from "@fiduswriter/frontend/app"

// Django API adapters
import {djangoApiConnectors} from "../api_adapters/index.js"

/*
 * Plugins are discovered dynamically by django-npm-mjs. For each plugin type,
 * it scans all installed Django apps for files under
 * <app>/static/js/plugins/<type>/ and writes an aggregated index.js into the
 * transpile cache under plugins/<type>/index.js. That generated module exports
 * a `plugins` array of [appName, pluginModule] tuples.
 *
 * The App class filters the discovered plugins by settings.APPS at runtime, so
 * optional apps that are not installed never end up in the bundle.
 */

import {plugins as appPlugins} from "../../plugins/app/index.js"
import {plugins as bibliographyOverviewPlugins} from "../../plugins/bibliography_overview/index.js"
import {plugins as citationDialogPlugins} from "../../plugins/citation_dialog/index.js"
import {plugins as editorPlugins} from "../../plugins/editor/index.js"
import {plugins as menuPlugins} from "../../plugins/menu/index.js"

const djangoApiUrlMap = {
    "i18n.setLang": "/api/i18n/setlang/",
    "e2ee.user_encryption_key": "/api/user/encryption_key/",
    "e2ee.user_encryption_key_save": "/api/user/encryption_key/save/",
    "e2ee.user_public_key": "/api/user/encryption_public_key/{userId}/",
    "user.preferences": "/api/user/preferences/get/",
    "user.preferences_update": "/api/user/preferences/update/",
    "e2ee.document_encryption_key_get": "/api/document/encryption_key/get/",
    "e2ee.document_encryption_key_update":
        "/api/document/encryption_key/update/",
    "e2ee.document_encryption_key_save": "/api/document/encryption_key/save/"
}

window.settings.apiUrlMap = djangoApiUrlMap

const theApp = new App(djangoApiConnectors, window.settings, {
    appPlugins,
    menuPlugins,
    editorPlugins,
    citationDialogPlugins,
    bibliographyOverviewPlugins
})
theApp.init()
window.theApp = theApp
