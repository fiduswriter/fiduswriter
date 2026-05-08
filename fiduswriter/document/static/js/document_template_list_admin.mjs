import {DocumentTemplateListAdmin} from "./modules/document_template/index.js"

const theDocumentTemplateListAdmin = new DocumentTemplateListAdmin(
    window.settings
)

theDocumentTemplateListAdmin.init()

window.theDocumentTemplateListAdmin = theDocumentTemplateListAdmin
