import {DocumentTemplateAdmin} from "./modules/document_template/index.js"

const theDocumentTemplateAdmin = new DocumentTemplateAdmin(window.settings)

theDocumentTemplateAdmin.init()

window.theDocumentTemplateAdmin = theDocumentTemplateAdmin
