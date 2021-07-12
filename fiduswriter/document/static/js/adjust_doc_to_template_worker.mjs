import {AdjustDocToTemplateWorker} from "./workers/document_template/adjust_doc.js"

onmessage = function(message) {
    let adjuster = new AdjustDocToTemplateWorker(
        message.data.schemaSpec,
        message.data.doc,
        message.data.template,
        message.data.documentStyleSlugs,
        response => postMessage(response)
    )
    adjuster.init()
}
