import {initSettings} from "fwtoolkit/settings"
import {DocumentTemplateAdmin} from "./modules/document_template/index.js"

initSettings(window.settings)

const theDocumentTemplateAdmin = new DocumentTemplateAdmin()

theDocumentTemplateAdmin.init()

window.theDocumentTemplateAdmin = theDocumentTemplateAdmin
