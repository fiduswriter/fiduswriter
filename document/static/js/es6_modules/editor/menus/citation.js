/* TODO: merge this into content-dialogs/citation and make the list of citation
 * sources load every time the citation dialog is opened rather than keeping it
 * constantly available.
 */

import {citationItemTemplate, selectedCitationTemplate} from "./content-dialogs/templates"

/* Functions for the Citation add dialog */
export class ModMenusCitation {
    constructor(mod) {
        mod.citation = this
        this.mod = mod
    }

    appendToCitationDialog(pk, bibInfo) {
        // If neither author nor editor were registered, use an empty string instead of nothing.
        // TODO: Such entries should likely not be accepted by the importer.
        let bibauthor = bibInfo.editor || bibInfo.author || ''

        // If title is undefined, set it to an empty string.
        // TODO: Such entries should likely not be accepted by the importer.
        if (typeof bibInfo.title === 'undefined') bibInfo.title = ''

        let citeItemData = {
            'id': pk,
            'type': bibInfo.entry_type,
            'title': bibInfo.title.replace(/[{}]/g, ''),
            'author': bibauthor.replace(/[{}]/g, '')
        }

        jQuery('#cite-source-table > tbody').append(citationItemTemplate(citeItemData))
        jQuery('#cite-source-table').trigger('update')
        this.appendToCitedItems([citeItemData])
    }

    appendManyToCitationDialog(pks) {
        for (let i = 0; i < pks.length; i++) {
            this.appendToCitationDialog(pks[i], this.mod.editor.bibDB.db[pks[i]])
        }
        jQuery('#cite-source-table').trigger('update')
    }

    appendToCitedItems(items) {
        let len = items.length
        for(let i = 0; i < len; i ++) {
            let item = items[i]
            jQuery('#selected-cite-source-table .fw-document-table-body').append(selectedCitationTemplate({
                'id': item.id,
                'type': item.type,
                'title': item.title,
                'author': item.author,
                'page': '',
                'prefix': ''
            }))
        }
    }

}
