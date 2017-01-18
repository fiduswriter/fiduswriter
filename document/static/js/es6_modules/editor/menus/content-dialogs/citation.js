import {configureCitationTemplate, citationItemTemplate, selectedCitationTemplate} from "./templates"
import {BibEntryForm} from "../../../bibliography/form"
import {addDropdownBox, setCheckableLabel} from "../../../common"
import {nameToText, litToText} from "../../../bibliography/tools"

// TODO: turn into class (like FigureDialog)
export let citationDialog = function (mod) {

    let editor = mod.editor,
        initialReferences = [],
        initialFormat = 'autocite',
        citableItemsHTML = '',
        citedItemsHTML = '',
        diaButtons = [],
        node = editor.currentPm.selection.node


    if (node && node.type && node.type.name==='citation') {
        initialFormat = node.attrs.format
        initialReferences = node.attrs.references
    }

    function dialogSubmit() {
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
            JSON.stringify(references) === JSON.stringify(initialReferences) &&
            format == initialFormat
        ) {
            // Nothing has been changed, so we just close the dialog again
            return true
        }
        let nodeType = editor.currentPm.schema.nodes['citation']
        editor.currentPm.tr.replaceSelection(
            nodeType.createAndFill({format, references})
        ).apply()
        return true
    }

    _.each(editor.bibDB.db, function(bib, id) {
        let bibauthors = bib.fields.author || bib.fields.editor
        let bibEntry = {
                id: id,
                bib_type: bib.bib_type,
                title: bib.fields.title ? litToText(bib.fields.title) : gettext('Untitled'),
                author: bibauthors? nameToText(bibauthors) : ''
            }

        citableItemsHTML += citationItemTemplate(bibEntry)

        let citEntry = initialReferences.find(bibRef => bibRef.id==id)

        if (citEntry) {
            bibEntry.prefix = citEntry.prefix ?  citEntry.prefix : ''
            bibEntry.locator = citEntry.locator ? citEntry.locator : ''
            citedItemsHTML += selectedCitationTemplate(bibEntry)
        }
    })

    diaButtons.push({
        text: gettext('Register new source'),
        click: function() {
            let form = new BibEntryForm(undefined, editor.bibDB)
            form.init().then(
                newBibPks => {
                    editor.mod.menus.citation.appendManyToCitationDialog(newBibPks)
                    jQuery('.fw-checkable').unbind('click')
                    jQuery('.fw-checkable').bind('click', function() {
                        setCheckableLabel(jQuery(this))
                    })
                }
            )
        },
        class: 'fw-button fw-light fw-add-button register-new-bib-source'
    })

    if (node && node.type && node.type.name==='citation') {
        diaButtons.push({
            text: gettext('Remove'),
            click: function() {
                editor.currentPm.tr.deleteSelection().apply()
                dialog.dialog('close')
            },
            class: 'fw-button fw-orange'
        })
    }

    let submitButtonText = (node && node.type && node.type.name==='citation') ? gettext('Update') : gettext('Insert')

    diaButtons.push({
        text: submitButtonText,
        click: function() {
            if (dialogSubmit()) {
                dialog.dialog('close')
            }
        },
        class: "fw-button fw-dark insert-citation"
    })

    diaButtons.push({
        text: gettext('Cancel'),
        click: function() {
            dialog.dialog('close')
        },
        class: 'fw-button fw-orange'
    })


    let dialog = jQuery(
        configureCitationTemplate({
            citableItemsHTML,
            citedItemsHTML,
            citeFormat: initialFormat
        })
    )

    dialog.dialog({
        draggable: false,
        resizable: false,
        top: 10,
        width: 836,
        height: 540,
        modal: true,
        buttons: diaButtons,
        create: function() {
            let theDialog = jQuery(this).closest(".ui-dialog")

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

            jQuery('#add-cite-book').bind('click', function() {
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
                mod.citation.appendToCitedItems(selectedItems)
            })

            jQuery(theDialog).on('click', '.selected-source .delete', function() {
                let sourceWrapperId = '#selected-source-' + jQuery(this).data('id')
                jQuery(sourceWrapperId).remove()
            })
        },

        close: function() {
            jQuery(this).dialog('destroy').remove()
        }
    })

    jQuery('input').blur()

    jQuery('.fw-checkable').bind('click', function() {
        setCheckableLabel(jQuery(this))
    })

}
