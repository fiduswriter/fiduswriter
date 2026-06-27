import {initSettings} from "fwtoolkit/settings"
import {DocumentTemplateListAdmin} from "./modules/document_template/index.js"

window.settings.gettext = window.gettext
window.settings.staticUrl = window.staticUrl
window.settings.interpolate = window.interpolate
initSettings(window.settings)

const theDocumentTemplateListAdmin = new DocumentTemplateListAdmin(
    window.settings
)

theDocumentTemplateListAdmin.init()

window.theDocumentTemplateListAdmin = theDocumentTemplateListAdmin
