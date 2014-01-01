/**
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm.
 *
 * @license This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <a href='http://www.gnu.org/licenses'>http://www.gnu.org/licenses</a>.
 *
 */
// toolbar cite
jQuery(document).on('mousedown', '#button-cite, .citation', function (event) {

    var ids,
        selection = rangy.getSelection(),
        range,
        bibEntryStart,
        bibFormatStart = 'autocite',
        bibBeforeStart,
        bibPageStart,
        books = '',
        cited_books = '',
        cited_ids = [],
        cited_prefixes,
        cited_pages,
        citeSpan,
        citationNode;
        
    event.preventDefault();

    
    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
    } else {
        range = rangy.createRange();
    }
    
    
    if (jQuery(this).is('.citation')) {
        citationNode = this;
        range.selectNode(citationNode);
        range.collapse();
        bibFormatStart = jQuery(citationNode).attr('data-bib-format');
        bibEntryStart = jQuery(citationNode).attr('data-bib-entry');
        bibBeforeStart = jQuery(citationNode).attr('data-bib-before');
        bibPageStart = jQuery(citationNode).attr('data-bib-page');
        cited_ids = bibEntryStart.split(',');
        cited_prefixes = bibBeforeStart.split(',,,');
        cited_pages = bibPageStart.split(',,,');        
    }
    
    function dialogSubmit() {
        var cite_items = jQuery('#selected-cite-source-table .fw-cite-parts-table'),
            cite_ids = [],
            cite_prefixes = [],
            cite_pages = [],
            bibFormat,
            bibEntry,
            bibPage,
            bibBefore,
            emptySpaceNode;

        if (0 === cite_items.size()) {
            alert(gettext('Please select at least one citation source!'));
            return false;
        }

        cite_items.each(function () {
            cite_ids.push(jQuery(this).find('.delete').data('id'));
            cite_pages.push(jQuery(this).find('.fw-cite-page').val());
            cite_prefixes.push(jQuery(this).find('.fw-cite-text').val());
        });

        bibFormat = jQuery('#citation-style-label').data('style');
        bibEntry = cite_ids.join(',');
        bibPage = cite_pages.join(',,,');
        bibBefore = cite_prefixes.join(',,,');

        if (bibEntry === bibEntryStart && bibBefore === bibBeforeStart && bibPage == bibPageStart && bibFormat == bibFormatStart) {
            // Nothing has been changed, so we just close the dialog again
            return true;
        }

        if (citationNode) {
            manualEdits.remove(citationNode, false);
            citationNode = false;
        }

        citeSpan = nodeConverter.createCiteView();
        citeSpan.setAttribute('data-bib-entry', bibEntry);
        citeSpan.setAttribute('data-bib-before', bibBefore);
        citeSpan.setAttribute('data-bib-page', bibPage);
        citeSpan.setAttribute('data-bib-format', bibFormat);

        // Make sure to get out of any track changes node if tracking is disabled.
        range = dom.noTrackIfDisabled(range);
        // Make sure to get out of any citation node.
        range = dom.noCitationOrLinkNode(range);
        // Insert the citation
        manualEdits.insert(citeSpan, range);




        citationHelpers.formatCitationsInDoc();

        citeSpan.parentNode.insertBefore(nodeConverter.afterNode(), citeSpan.nextSibling);
        return true;
    };

    _.each(BibDB, function (bibs, index) {
        var this_book = {
            'id': index,
            'type': bibs.entry_type,
            'title': bibs.title || '',
            'author': bibs.author || bibs.editor || ''
        };

        this_book.title = this_book.title.replace(/[{}]/g, '');
        this_book.author = this_book.author.replace(/[{}]/g, '');
        books += tmp_citation_book(this_book);

        var cited_id = _.indexOf(cited_ids, index);
        if (0 <= cited_id) {
            this_book.prefix = cited_prefixes[cited_id];
            this_book.page = cited_pages[cited_id];
            cited_books += tmp_selected_citation(this_book);
        }
    });


    var diaButtons = [];
    diaButtons.push({
        text: gettext('Register new source'),
        click: function () {
            bibliographyHelpers.createBibEntryDialog();
        },
        class: 'fw-button fw-light fw-add-button'
    });

    if (citationNode) {
        diaButtons.push({
            text: gettext('Remove'),
            click: function () {
                manualEdits.remove(citationNode, range);
                citationNode = false;
                citeSpan = false;
                dialog.dialog('close');
            },
            class: 'fw-button fw-orange'
        });
    }

    var submit_button_text = citationNode ? 'Update' : 'Insert';

    diaButtons.push({
        text: gettext(submit_button_text),
        click: function () {
            if (dialogSubmit()) {
                dialog.dialog('close');
            }
        },
        class: "fw-button fw-dark"
    });

    diaButtons.push({
        text: gettext('Cancel'),
        click: function () {
            dialog.dialog('close');
        },
        class: 'fw-button fw-orange'
    });

    jQuery('#cite-source-table').bind('update', function () {
        if (jQuery(this).hasClass('dataTable')) {
            jQuery(this).dataTable({
                "bRetrieve": true,
            });
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
            });
        }
        jQuery('#cite-source-table_filter input').attr('placeholder', gettext('Search for Bibliography'));

        var autocomplete_tags = [];
        jQuery('#cite-source-table .fw-searchable').each(function () {
            autocomplete_tags.push(this.textContent);
        });
        autocomplete_tags = _.uniq(autocomplete_tags);
        jQuery("#cite-source-table_filter input").autocomplete({
            source: autocomplete_tags
        });
    });

    dialog = jQuery(
        tmp_configure_citation({
            'books': books,
            'selectedbooks': cited_books,
            'citeformat': bibFormatStart
        })
    );

    dialog.dialog({
        draggable: false,
        resizable: false,
        top: 10,
        width: 820,
        height: 540,
        modal: true,
        buttons: diaButtons,
        create: function () {
            var $the_dialog = jQuery(this).closest(".ui-dialog");

            jQuery('#cite-source-table').trigger('update');

            $.addDropdownBox(jQuery('#citation-style-label'), jQuery('#citation-style-pulldown'));
            jQuery('#citation-style-pulldown .fw-pulldown-item').bind('mousedown', function () {
                jQuery('#citation-style-label label').html(jQuery(this).html());
                jQuery('#citation-style-label').attr('data-style', jQuery(this).data('style'));
            });

            jQuery('#add-cite-book').bind('click', function () {
                var selected_sources = jQuery('#cite-source-table .fw-checkable.checked'),
                    selected_books = [];
                selected_sources.each(function () {
                    var id = jQuery(this).data('id');
                    if (jQuery('#selected-source-' + id).size()) {
                        return;
                    }
                    selected_books.push({
                        'id': id,
                        'type': jQuery(this).data('type'),
                        'title': jQuery(this).data('title'),
                        'author': jQuery(this).data('author')
                    });
                });
                selected_sources.removeClass('checked');
                citationHelpers.appendToCitedBooks(selected_books);
            });

            jQuery('.selected-source .delete').bind('click', function () {
                var source_wrapper_id = '#selected-source-' + jQuery(this).data('id');
                jQuery(source_wrapper_id).remove();
            });
        },

        close: function () {
            if (citeSpan) {
                range.selectNode(citeSpan);
            } else if (citationNode) {
                range.selectNode(citationNode);
            }
            range.collapse();
            selection.removeAllRanges();
            selection.addRange(range);
            jQuery(this).dialog('destroy').remove();
        }
    });
    
    jQuery('input').blur();
    
    jQuery('.fw-checkable').bind('click', function () {
        $.setCheckableLabel($(this));
    });
});