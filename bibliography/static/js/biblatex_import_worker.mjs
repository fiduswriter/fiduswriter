import {BibLatexImporter} from "./modules/importer/biblatex"

onmessage = function(message) {
    let importer = new BibLatexImporter(
        message.data.fileContents,
        response => postMessage(response),
        message.data.csrfToken
    )
    importer.init()
}
