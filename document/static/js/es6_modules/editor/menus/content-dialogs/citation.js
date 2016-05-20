import {configureCitationTemplate, citationItemTemplate, selectedCitationTemplate} from "./templates"
import {BibEntryForm} from "../../../bibliography/form/form"


// TODO: turn into class (like FigureDialog)
export let citationDialog = function (mod) {

    let editor = mod.editor,
        ids,
        bibEntryStart,
        bibFormatStart = 'autocite',
        bibBeforeStart,
        bibPageStart,
        citableItemsHTML = '',
        citedItemsHTML = '',
        cited_ids = [],
        cited_prefixes,
        cited_pages,
        diaButtons = [],
        submit_button_text,
        node = editor.currentPm.selection.node


    if (node && node.type && node.type.name==='citation') {
        bibFormatStart = node.attrs.bibFormat
        bibEntryStart = node.attrs.bibEntry
        bibBeforeStart = node.attrs.bibBefore
        bibPageStart = node.attrs.bibPage
        cited_ids = bibEntryStart.split(',')
        cited_prefixes = bibBeforeStart.split(',,,')
        cited_pages = bibPageStart.split(',,,')
    }

    function dialogSubmit() {
        let cite_items = jQuery('#selected-cite-source-table .fw-cite-parts-table'),
            cite_ids = [],
            cite_prefixes = [],
            cite_pages = [],
            bibFormat,
            bibEntry,
            bibPage,
            bibBefore,
            emptySpaceNode

        if (0 === cite_items.size()) {
            alert(gettext('Please select at least one citation source!'))
            return false
        }

        cite_items.each(function() {
            cite_ids.push(jQuery(this).find('.delete').data('id'))
            cite_pages.push(jQuery(this).find('.fw-cite-page').val())
            cite_prefixes.push(jQuery(this).find('.fw-cite-text').val())
        })

        bibFormat = jQuery('#citation-style-label').data('style')
        bibEntry = cite_ids.join(',')
        bibPage = cite_pages.join(',,,')
        bibBefore = cite_prefixes.join(',,,')

        if (bibEntry === bibEntryStart && bibBefore === bibBeforeStart &&
            bibPage == bibPageStart && bibFormat == bibFormatStart) {
            // Nothing has been changed, so we just close the dialog again
            return true
        }

        editor.currentPm.execCommand('citation:insert', [bibFormat, bibEntry, bibBefore, bibPage])
        return true
    }

    _.each(editor.bibDB.bibDB, function(bib, index) {
        let bibEntry = {
                'id': index,
                'type': bib.entry_type,
                'title': bib.title || '',
                'author': bib.author || bib.editor || ''
            },
            cited_id

        bibEntry.title = bibEntry.title.replace(/[{}]/g, '')
        bibEntry.author = bibEntry.author.replace(/[{}]/g, '')
        citableItemsHTML += citationItemTemplate(bibEntry)

        cited_id = _.indexOf(cited_ids, index)
        if (-1 < cited_id) {
            bibEntry.prefix = cited_prefixes[cited_id]
            bibEntry.page = cited_pages[cited_id]
            citedItemsHTML += selectedCitationTemplate(bibEntry)
        }
    })

    diaButtons.push({
        text: gettext('Register new source'),
        click: function() {
            new BibEntryForm(false, false, editor.bibDB.bibDB, editor.bibDB.bibCats, editor.doc.owner.id,
                    function(bibEntryData){
                editor.bibDB.createBibEntry(bibEntryData, function(newBibPks) {
                    editor.mod.menus.citation.appendManyToCitationDialog(newBibPks)
                    jQuery('.fw-checkable').unbind('click')
                    jQuery('.fw-checkable').bind('click', function() {
                        $.setCheckableLabel($(this))
                    })
                })
            })
        },
        class: 'fw-button fw-light fw-add-button'
    })

    if (node && node.type && node.type.name==='citation') {
        diaButtons.push({
            text: gettext('Remove'),
            click: function() {
                editor.currentPm.execCommand('deleteSelection')
                dialog.dialog('close')
            },
            class: 'fw-button fw-orange'
        })
    }

    submit_button_text = (node && node.type && node.type.name==='citation') ? 'Update' : 'Insert'

    diaButtons.push({
        text: gettext(submit_button_text),
        click: function() {
            if (dialogSubmit()) {
                dialog.dialog('close')
            }
        },
        class: "fw-button fw-dark"
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
            'citableItemsHTML': citableItemsHTML,
            'citedItemsHTML': citedItemsHTML,
            'citeFormat': bibFormatStart
        })
    )

    dialog.dialog({
        draggable: false,
        resizable: false,
        top: 10,
        width: 820,
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

            $.addDropdownBox(jQuery('#citation-style-label'), jQuery('#citation-style-pulldown'))
            jQuery('#citation-style-pulldown .fw-pulldown-item').bind('mousedown', function() {
                jQuery('#citation-style-label label').html(jQuery(this).html())
                jQuery('#citation-style-label').attr('data-style', jQuery(this).data('style'))
            })

            jQuery('#add-cite-book').bind('click', function() {
                let checkedElements = jQuery('#cite-source-table .fw-checkable.checked'),
                    selectedItems = []
                checkedElements.each(function() {
                    let id = jQuery(this).data('id')
                    if (jQuery('#selected-source-' + id).size()) {
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
        $.setCheckableLabel($(this))
    })

}
