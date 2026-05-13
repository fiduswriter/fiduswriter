import {BibliographyImportWorker} from "./workers/importer/bibliography.js"

addEventListener("message", message => {
    const {fileContents, format} = message.data
    const worker = new BibliographyImportWorker(
        fileContents,
        postMessage.bind(self),
        format
    )
    worker.init()
})
