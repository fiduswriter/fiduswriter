/* TODO: merge this into dialogs/citation and make the list of citation
 * sources load every time the citation dialog is opened rather than keeping it
 * constantly available.
 */
import {nameToText, litToText} from "../../bibliography/tools"
import {citationItemTemplate, selectedCitationTemplate} from "./dialogs/templates"

/* Functions for the Citation add dialog */
export class ModMenusCitation {
    constructor(mod) {
        mod.citation = this
        this.mod = mod
    }

    appendToCitationDialog(pk, bibInfo) {
        let bibauthors = bibInfo.fields.author || bibInfo.fields.editor

        let citeItemData = {
            'id': pk,
            'bib_type': bibInfo.bib_type,
            'title': bibInfo.fields.title ? litToText(bibInfo.fields.title) : gettext('Untitled'),
            'author': bibauthors ? nameToText(bibauthors) : ''
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
            jQuery('#selected-cite-source-table .fw-document-table-body').append(
                selectedCitationTemplate({
                    'id': item.id,
                    'bib_type': item.bib_type,
                    'title': item.title,
                    'author': item.author,
                    'locator': '',
                    'prefix': ''
                })
            )
        }
    }

}
