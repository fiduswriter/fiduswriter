import {App} from "@fiduswriter/frontend/app"

// Django API adapters
import {djangoApiConnectors} from "../api_adapters/index.js"

/*
 * Plugin imports from Django apps.
 * These use the transpile system's module overlay — files in
 * <app>/static/js/plugins/<name>/ are discoverable as
 * ../../plugins/<name>/ from any module in the overlay.
 *
 * Core plugins are imported explicitly so that optional apps (books,
 * pandoc, website, etc.) do not break the bundle when they are not
 * installed. The App filters plugins by settings.APPS.
 */

import * as baseAppPlugins from "../../plugins/app/init.js"
import * as userTemplateManagerAppPlugins from "../../plugins/app/user_template_manager.js"
import * as bibliographyOverviewPlugins from "../../plugins/bibliography_overview/init.js"
import * as citationDialogPlugins from "../../plugins/citation_dialog/init.js"
import * as editorPlugins from "../../plugins/editor/init.js"
import * as menuPlugins from "../../plugins/menu/init.js"
import * as userTemplateManagerMenuPlugins from "../../plugins/menu/user_template_manager.js"

const appPlugins = [
    ["base", baseAppPlugins],
    ["user_template_manager", userTemplateManagerAppPlugins]
]
const bibPlugins = [["bibliography", bibliographyOverviewPlugins]]
const citationDialogPluginList = [["document", citationDialogPlugins]]
const editorPluginList = [["document", editorPlugins]]
const menuPluginList = [
    ["menu", menuPlugins],
    ["user_template_manager", userTemplateManagerMenuPlugins]
]

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
    menuPlugins: menuPluginList,
    editorPlugins: editorPluginList,
    citationDialogPlugins: citationDialogPluginList,
    bibliographyOverviewPlugins: bibPlugins
})
theApp.init()
window.theApp = theApp
