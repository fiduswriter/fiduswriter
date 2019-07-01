import {updateDoc} from "../schema/convert"

export function updateFile(doc, filetypeVersion, bibliography) {
    // update bibliography -- currently not needed
    // bibliography = updateBib(bibliography)

    if (filetypeVersion < 2.0) { // Before 2.0, version numbers of the doc and of the file differed.
        doc = updateDoc(doc, doc.settings['doc_version'], bibliography)
    } else {
        doc = updateDoc(doc, filetypeVersion, bibliography)
    }

    return {doc, bibliography}
}
