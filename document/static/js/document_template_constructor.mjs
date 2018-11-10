import {DocumentTemplateConstructor} from "./modules/document_template_constructor"

const theDocumentTemplateConstructor = new DocumentTemplateConstructor(window.fidusConfig)

theDocumentTemplateConstructor.init()

window.theDocumentTemplateConstructor = theDocumentTemplateConstructor
