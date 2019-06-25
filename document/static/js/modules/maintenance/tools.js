import {addAlert} from "../common"

export const recreateBibliography = function(shrunkBib, fullBib, node) {
    if (node.type === 'citation') {
        node.attrs.references.forEach(ref => {
            let item = fullBib[ref.id]
            if (!item) {
                item = {
                    fields: {"title":[{"type":"text", "text":"Deleted"}]},
                    bib_type: "misc",
                    entry_key: "FidusWriter"
                }
                addAlert('warning', gettext('Could not find bibliography entry.'))
            }
            item = Object.assign({}, item)
            delete item.entry_cat
            shrunkBib[ref.id] = item
        })
    }
    if (node.content) {
        node.content.forEach(childNode => {
            recreateBibliography(shrunkBib, fullBib, childNode)
        })
    }
}
