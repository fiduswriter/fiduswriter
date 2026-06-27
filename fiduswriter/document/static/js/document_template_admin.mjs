import {initSettings} from "fwtoolkit/settings"
import {DocumentTemplateAdmin} from "./modules/document_template/index.js"

window.settings.gettext = window.gettext
window.settings.staticUrl = window.staticUrl
window.settings.interpolate = window.interpolate
initSettings(window.settings)

const theDocumentTemplateAdmin = new DocumentTemplateAdmin()

theDocumentTemplateAdmin.init()

window.theDocumentTemplateAdmin = theDocumentTemplateAdmin
