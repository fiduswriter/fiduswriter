import {citationItemTemplate, selectedCitationTemplate} from "./toolbar_items/templates"

/* Functions for the Citation add dialog */
export class ModMenusCitation {
    constructor(mod) {
        mod.citation = this
        this.mod = mod
    }

    appendToCitationDialog(pk, bib_info) {
        // If neither author nor editor were registered, use an empty string instead of nothing.
        // TODO: Such entries should likely not be accepted by the importer.
        let bibauthor = bib_info.editor || bib_info.author || ''

        // If title is undefined, set it to an empty string.
        // TODO: Such entries should likely not be accepted by the importer.
        if (typeof bib_info.title === 'undefined') bib_info.title = ''

        let citeItemData = {
            'id': pk,
            'type': bib_info.entry_type,
            'title': bib_info.title.replace(/[{}]/g, ''),
            'author': bibauthor.replace(/[{}]/g, '')
        }

        jQuery('#cite-source-table > tbody').append(citationItemTemplate(citeItemData))
        jQuery('#cite-source-table').trigger('update')
        this.appendToCitedItems([citeItemData])
    }

    appendToCitedItems(books) {
        let len = books.length
        for(let i = 0; i < len; i ++) {
            $('#selected-cite-source-table .fw-document-table-body').append(selectedCitationTemplate({
                'id': books[i].id,
                'type': books[i].type,
                'title': books[i].title,
                'author': books[i].author,
                'page': '',
                'prefix': ''
            }))
        }
    }

}
