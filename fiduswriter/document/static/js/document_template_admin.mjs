import {initSettings} from "./modules/common/settings.js"
import {DocumentTemplateAdmin} from "./modules/document_template/index.js"

initSettings(window.settings)

const theDocumentTemplateAdmin = new DocumentTemplateAdmin()

theDocumentTemplateAdmin.init()

window.theDocumentTemplateAdmin = theDocumentTemplateAdmin
