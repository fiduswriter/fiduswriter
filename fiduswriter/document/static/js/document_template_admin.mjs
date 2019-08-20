import {DocumentTemplateAdmin} from "./modules/document_template"

const theDocumentTemplateAdmin = new DocumentTemplateAdmin(window.fidusConfig)

theDocumentTemplateAdmin.init()

window.theDocumentTemplateAdmin = theDocumentTemplateAdmin
