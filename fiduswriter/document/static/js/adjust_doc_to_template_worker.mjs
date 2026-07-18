import {AdjustDocToTemplateWorker} from "@fiduswriter/frontend/workers/adjust-doc"

addEventListener("message", message => {
    const adjuster = new AdjustDocToTemplateWorker(
        message.data.schemaSpec,
        message.data.doc,
        message.data.template,
        message.data.documentStyleSlugs,
        response => postMessage(response)
    )
    adjuster.init()
})
