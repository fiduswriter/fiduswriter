import {configureCitationTemplate, citationItemTemplate, selectedCitationTemplate} from "./templates"
import {BibEntryForm} from "../../../bibliography/form"
import {addDropdownBox, setCheckableLabel} from "../../../common"
import {nameToText, litToText} from "../../../bibliography/tools"
import * as plugins from "../../../plugins/citation-dialog"

export class CitationDialog {
    constructor(mod) {
        this.editor = mod.editor
        this.initialReferences = []
        this.initialFormat = 'autocite'
        this.node = this.editor.currentPm.selection.node
        this.dialog = false
        this.diaButtons = []
        this.submitButtonText = gettext('Insert')
    }

    init() {
        if (this.node && this.node.type && this.node.type.name==='citation') {
            this.initialFormat = this.node.attrs.format
            this.initialReferences = this.node.attrs.references
        }

        this.diaButtons.push({
            text: gettext('Register new source'),
            click: () => this.registerNewSource(),
            class: 'fw-button fw-light fw-add-button register-new-bib-source'
        })

        if (this.node && this.node.type && this.node.type.name==='citation') {
            this.diaButtons.push({
                text: gettext('Remove'),
                click: () => {
                     this.editor.currentPm.tr.deleteSelection().apply()
                    this.dialog.dialog('close')
                },
                class: 'fw-button fw-orange'
            })
            this.submitButtonText = gettext('Update')
        }

        this.diaButtons.push({
            text: this.submitButtonText,
            click: () => {
                if (this.dialogSubmit()) {
                    this.dialog.dialog('close')
                }
            },
            class: "fw-button fw-dark insert-citation"
        })

        this.diaButtons.push({
            text: gettext('Cancel'),
            click: () => {
                this.dialog.dialog('close')
            },
            class: 'fw-button fw-orange'
        })

        this.dialog = jQuery(this.citationDialogHTML())

        this.dialog.dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 836,
            height: 540,
            modal: true,
            buttons: this.diaButtons,
            create: () => this.dialogCreate(),
            close: () => {
                this.dialog.dialog('destroy').remove()
            }
        })

        jQuery('input').blur()

        jQuery('.fw-checkable').bind('click', function() {
            setCheckableLabel(jQuery(this))
        })

        this.activatePlugins()
    }

    activatePlugins() {
        // Add plugins
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin](this)
                this.plugins[plugin].init()
            }
        })
    }

    citationDialogHTML() {
        // Assemble the HTML of the 'citable' and 'cited' columns of the dialog,
        // and return the templated dialog HTML.
        let citableItemsHTML = '', citedItemsHTML = ''

        Object.keys(this.editor.bibDB.db).forEach(id => {

            let bibEntry = this.bibDBToBibEntry(id)
            citableItemsHTML += citationItemTemplate(bibEntry)

            let citEntry = this.initialReferences.find(bibRef => bibRef.id==id)

            if (citEntry) {
                bibEntry.prefix = citEntry.prefix ?  citEntry.prefix : ''
                bibEntry.locator = citEntry.locator ? citEntry.locator : ''
                citedItemsHTML += selectedCitationTemplate(bibEntry)
            }
        })

        return configureCitationTemplate({
            citableItemsHTML,
            citedItemsHTML,
            citeFormat: this.initialFormat
        })
    }

    registerNewSource() {
        let form = new BibEntryForm(this.editor.bibDB)
        form.init().then(
            idTranslations => {
                let ids = idTranslations.map(idTrans => idTrans[1])
                this.addToCitableItems(ids)
                jQuery('.fw-checkable').unbind('click')
                jQuery('.fw-checkable').bind('click', function() {
                    setCheckableLabel(jQuery(this))
                })
            }
        )
    }

    bibDBToBibEntry(id) {
        let bib =  this.editor.bibDB.db[id]
        let bibauthors = bib.fields.author || bib.fields.editor
        return {
            id,
            bib_type: bib.bib_type,
            title: bib.fields.title ? litToText(bib.fields.title) : gettext('Untitled'),
            author: bibauthors ? nameToText(bibauthors) : ''
        }
    }

    // Update the citation dialog with new items in 'citable' column.
    // Not when dialog is first opened.
    addToCitableItems(ids) {
        ids.forEach(id => {
            let citeItemData = this.bibDBToBibEntry(id)
            jQuery('#cite-source-table > tbody').append(citationItemTemplate(citeItemData))
            this.addToCitedItems([citeItemData])
        })
        jQuery('#cite-source-table').trigger('update')
    }

    // Update the citation dialog with new items in 'cited' column.
    // Not when dialog is first opened.
    addToCitedItems(items) {
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

    dialogCreate() {

        jQuery('#cite-source-table').bind('update', function() {
            let autocomplete_tags = []
            if (jQuery(this).hasClass('dataTable')) {
                jQuery(this).dataTable({
                    "bRetrieve": true,
                })
            } else {
                jQuery(this).dataTable({
                    "bPaginate": false,
                    "bLengthChange": false,
                    "bFilter": true,
                    "bInfo": false,
                    "bAutoWidth": false,
                    "oLanguage": {
                        "sSearch": ''
                    },
                })
            }
            jQuery('#cite-source-table_filter input').attr('placeholder', gettext('Search bibliography'))

            jQuery('#cite-source-table .fw-searchable').each(function() {
                autocomplete_tags.push(this.textContent)
            })
            autocomplete_tags = _.uniq(autocomplete_tags)
            jQuery("#cite-source-table_filter input").autocomplete({
                source: autocomplete_tags
            })
        })

        jQuery('#cite-source-table').trigger('update')

        addDropdownBox(jQuery('#citation-style-label'), jQuery('#citation-style-pulldown'))
        jQuery('#citation-style-pulldown .fw-pulldown-item').bind('mousedown', function() {
            jQuery('#citation-style-label label').html(jQuery(this).html())
            jQuery('#citation-style-label').attr('data-style', jQuery(this).data('style'))
        })

        jQuery('#add-cite-book').bind('click', () => {
            let checkedElements = jQuery('#cite-source-table .fw-checkable.checked'),
                selectedItems = []
            checkedElements.each(function() {
                let id = jQuery(this).data('id')
                if (jQuery('#selected-source-' + id).length) {
                    return
                }
                selectedItems.push({
                    'id': id,
                    'type': jQuery(this).data('type'),
                    'title': jQuery(this).data('title'),
                    'author': jQuery(this).data('author')
                })
            })
            checkedElements.removeClass('checked')
            this.addToCitedItems(selectedItems)
        })

        jQuery(this.dialog).on('click', '.selected-source .delete', function() {
            let sourceWrapperId = '#selected-source-' + jQuery(this).data('id')
            jQuery(sourceWrapperId).remove()
        })
    }

    dialogSubmit() {
        let citeItems = [].slice.call(
                document.querySelectorAll('#selected-cite-source-table .fw-cite-parts-table')
            ),
            references = citeItems.map(bibRef => {
                let returnObj = {
                    id: jQuery(bibRef).find('.delete').data('id')
                }
                let prefix = jQuery(bibRef).find('.fw-cite-text').val()
                if (prefix.length) {
                    returnObj['prefix'] = prefix
                }
                let locator = jQuery(bibRef).find('.fw-cite-page').val()
                if (locator.length) {
                    returnObj['locator'] = locator
                }
                return returnObj
            })

        if (0 === citeItems.length) {
            window.alert(gettext('Please select at least one citation source!'))
            return false
        }

        let format = jQuery('#citation-style-label').data('style')

        if (
            JSON.stringify(references) === JSON.stringify(this.initialReferences) &&
            format == this.initialFormat
        ) {
            // Nothing has been changed, so we just close the dialog again
            return true
        }
        let nodeType =  this.editor.currentPm.schema.nodes['citation']
         this.editor.currentPm.tr.replaceSelection(
            nodeType.createAndFill({format, references})
        ).apply()
        return true
    }
}
