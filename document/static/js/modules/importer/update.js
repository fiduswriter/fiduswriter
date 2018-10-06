import {updateDoc} from "../schema/convert"

export function updateFile(doc, bibliography, filetypeVersion) {
    // update bibliography -- currently not needed
    // bibliography = updateBib(bibliography)

    if (filetypeVersion < 2.0) { // Before 2.0, version numbers of the doc and of the file differed.
        doc = updateDoc(doc, bibliography, doc.settings['doc_version'])
    } else {
        doc = updateDoc(doc, bibliography, filetypeVersion)
    }

    return {doc, bibliography}
}
