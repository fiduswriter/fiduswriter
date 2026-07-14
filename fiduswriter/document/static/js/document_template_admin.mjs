import {DocumentTemplateAdmin} from "@fiduswriter/document-template-editor"
import {initSettings} from "fwtoolkit/settings"

window.settings.gettext = window.gettext
window.settings.staticUrl = window.staticUrl
window.settings.interpolate = window.interpolate
initSettings(window.settings)

const theDocumentTemplateAdmin = new DocumentTemplateAdmin()

theDocumentTemplateAdmin.init()

window.theDocumentTemplateAdmin = theDocumentTemplateAdmin
