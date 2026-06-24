import {initSettings} from "fwtoolkit/settings"
import {DocumentTemplateListAdmin} from "./modules/document_template/index.js"

initSettings(window.settings)

const theDocumentTemplateListAdmin = new DocumentTemplateListAdmin(
    window.settings
)

theDocumentTemplateListAdmin.init()

window.theDocumentTemplateListAdmin = theDocumentTemplateListAdmin
