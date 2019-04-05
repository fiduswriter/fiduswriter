import {DocumentTemplateDesigner} from "./modules/document_template"

const theDocumentTemplateDesigner = new DocumentTemplateDesigner(window.fidusConfig)

theDocumentTemplateDesigner.init()

window.theDocumentTemplateDesigner = theDocumentTemplateDesigner
