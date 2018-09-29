import {DocumentOverview} from "./modules/documents/overview"

const theDocumentOverview = new DocumentOverview(window.fidusConfig)
theDocumentOverview.init()

window.theDocumentOverview = theDocumentOverview
