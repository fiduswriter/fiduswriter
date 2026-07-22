import {DocumentTemplateAdmin} from "@fiduswriter/document-template-editor"
import {initSettings} from "fwtoolkit/settings"

import {djangoApiConnectors} from "../../base/static/js/modules/api_adapters/index.js"

window.settings.gettext = window.gettext
window.settings.staticUrl = window.staticUrl
window.settings.interpolate = window.interpolate
initSettings(window.settings)

const theDocumentTemplateAdmin = new DocumentTemplateAdmin(
    djangoApiConnectors.documentTemplate
)

theDocumentTemplateAdmin.init()

window.theDocumentTemplateAdmin = theDocumentTemplateAdmin
