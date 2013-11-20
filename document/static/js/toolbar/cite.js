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
(function (jQuery) {
    return jQuery.widget("IKS.toolbarcite", {
        options: {
            editable: null,
            uuid: "cite",
            link: true,
            image: true,
            dialogOpts: {
                autoOpen: false,
                width: 600,
                height: 'auto',
                title: gettext('Configure citation'),
                modal: true,
                resizable: false,
                draggable: false,
                dialogClass: 'hallocite-dialog',

            },
            butonCssClass: null
        },

        populateToolbar: function (toolbar) {
            var buttonize,
                buttonset,
                button,
                dialog,
                dialogSubmitCb,
                bibEntryStart,
                bibFormatStart,
                bibBeforeStart,
                bibPageStart,
                widget,
                clickedNode,
                citationNode,
                citeSpan,
                range,
                selection,
                _this = widget = this,
                dialogId = "" + this.options.uuid + "-dialog",
                cite_source_table;

            urlInput = jQuery('input[name=url]', dialog).focus(function (e) {
                return this.select();
            });

            dialogSubmitCb = function () {
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
                    cite_ids.push($(this).find('.delete').data('id'));
                    cite_pages.push($(this).find('.fw-cite-page').val());
                    cite_prefixes.push($(this).find('.fw-cite-text').val());
                });

                bibFormat = jQuery('#citation-style-label').data('style');
                bibEntry = cite_ids.join(',');
                bibPage = cite_pages.join(',,,');
                bibBefore = cite_prefixes.join(',,,');

                if (bibEntry === bibEntryStart
                    && bibBefore === bibBeforeStart
                    && bibPage == bibPageStart
                    && bibFormat == bibFormatStart) {
                    // Nothing has been changed, so we just close the dialog again
                    return true;
                }

                if (citationNode) {
                    emptySpaceNode = document.createTextNode('\u180e');
                    citationNode.parentNode.insertBefore(emptySpaceNode, citationNode.nextSibling);
                    range.selectNode(emptySpaceNode);
                    range.collapse(true);
                    manualEdits.remove(citationNode, false);
                    citationNode = false;
                }

                citeSpan = document.createElement('span');
                citeSpan.classList.add('citation');
                citeSpan.setAttribute('data-bib-entry', bibEntry);
                citeSpan.setAttribute('data-bib-before', bibBefore);
                citeSpan.setAttribute('data-bib-page', bibPage);
                citeSpan.setAttribute('data-bib-format', bibFormat);
                citeSpan.innerHTML = ' ';
                // Make sure to get out of any track changes node if tracking is disabled.
                range = dom.noTrackIfDisabled(range);
                // Make sure to get out of any citation node.
                range = dom.noCitationOrLinkNode(range);
                // Insert the citation
                manualEdits.insert(citeSpan, range);

                if (emptySpaceNode) {
                    jQuery(emptySpaceNode).remove();
                }

                //widget.options.editable.element.trigger('change');
                console.log('cite 2');
                citationHelpers.formatCitationsInDoc();
                editorHelpers.documentHasChanged();
                return true;
            };

            //jQuery(document).on('click', '#addBibEntryButton', dialogSubmitCb);
            //dialog.find("form").submit(dialogSubmitCb);
            buttonset = $.Fidus.buttonset.prototype.createButtonset.call(
                this,
                widget.widgetName,
                1
            );

            buttonize = function (type) {
                var id = _this.options.uuid + "-" + type;

                button = jQuery('<button></button>');
                button.makebutton({
                    label: 'Cite',
                    icon: 'icon-quote-right',
                    editable: _this.options.editable,
                    queryState: false,
                    uuid: _this.options.uuid,
                    cssClass: _this.options.buttonCssClass
                });

                button.attr('class', 'fw-button fw-light fw-large fw-square disabled');
                buttonset.append(button);

                function openDialog(event) {
                    var ids;
                    selection = rangy.getSelection();
                    range = selection.getRangeAt(0);

                    clickedNode = range.startContainer;
                    citationNode = jQuery(clickedNode).closest('.citation')[0];
                    bibEntryStart = jQuery(citationNode).attr('data-bib-entry');
                    bibFormatStart = 'autocite';
                    bibBeforeStart = jQuery(citationNode).attr('data-bib-before');
                    bibPageStart = jQuery(citationNode).attr('data-bib-page');

                    var books = '',
                        cited_books = '',
                        cited_ids = [],
                        cited_prefixes,
                        cited_pages;

                    if(citationNode) {
                        cited_ids = bibEntryStart.split(',');
                        cited_prefixes = bibBeforeStart.split(',,,');
                        cited_pages = bibPageStart.split(',,,');
                        bibFormatStart = jQuery(citationNode).attr('data-bib-format');
                    }

                    _.each(BibDB, function(bibs, index) {
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
                        if(0 <= cited_id) {
                            this_book.prefix = cited_prefixes[cited_id];
                            this_book.page = cited_pages[cited_id];
                            cited_books += tmp_selected_citation(this_book);
                        }
                    });

                    var submit_button_text = citationNode ? 'Update' : 'Insert';

                    dialog = jQuery(
                        tmp_configure_citation({
                            'dialogId': dialogId,
                            'books': books,
                            'selectedbooks': cited_books,
                            'citeformat': bibFormatStart
                        })
                    );

                    $('body').append(dialog);

                    var diaButtons = {};
                    diaButtons[gettext('Register new source')] = function () {
                        bibliographyHelpers.createBibEntryDialog();
                    };

                    diaButtons[gettext(submit_button_text)] = function () {
                        if(dialogSubmitCb()) {
                            dialog.dialog('close');
                        }
                    };

                    diaButtons[gettext('Cancel')] = function () {
                        dialog.dialog('close');
                    };

                    $('#cite-source-table').bind('update', function () {
                        if ($(this).hasClass('dataTable')) {
                            $(this).dataTable({
                                "bRetrieve": true,
                            });
                        } else {
                            $(this).dataTable({
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
                        $('#cite-source-table_filter input').attr('placeholder', gettext('Search for Bibliography'));

                        var autocomplete_tags = [];
                        jQuery('#cite-source-table .fw-searchable').each(function() {
                            autocomplete_tags.push(this.innerText);
                        });
                        autocomplete_tags = _.uniq(autocomplete_tags);
                        $("#cite-source-table_filter input").autocomplete({
                            source: autocomplete_tags
                        });
                    });

                    //widget.options.editable.keepActivated(true);
                    dialog.dialog({
                        draggable : false,
                        resizable : false,
                        top: 10,
                        width : 820,
                        height : 540,
                        modal : true,
                        buttons : diaButtons,
                        create : function () {
                            var $the_dialog = $(this).closest(".ui-dialog");
                            $the_dialog.find(".ui-dialog-buttonset .ui-button:eq(0)").addClass("fw-button fw-light fw-add-button");
                            $the_dialog.find(".ui-dialog-buttonset .ui-button:eq(1)").addClass("fw-button fw-dark");
                            $the_dialog.find(".ui-dialog-buttonset .ui-button:eq(2)").addClass("fw-button fw-orange");

                            $('#cite-source-table').trigger('update');

                            $.addDropdownBox($('#citation-style-label'), $('#citation-style-pulldown'));
                            $(document).on('click','#citation-style-pulldown .fw-pulldown-item', function () {
                                $('#citation-style-label label').html($(this).html());
                                $('#citation-style-label').attr('data-style', $(this).data('style'));
                            });

                            $(document).on('click', '#add-cite-book', function() {
                                var selected_sources = $('#cite-source-table .fw-checkable.checked'),
                                    selected_books = [];
                                selected_sources.each(function() {
                                    var id = $(this).data('id');
                                    if($('#selected-source-' + id).size()) {
                                        return;
                                    }
                                    selected_books.push({
                                        'id': id,
                                        'type': $(this).data('type'),
                                        'title': $(this).data('title'),
                                        'author': $(this).data('author')
                                    });
                                });
                                selected_sources.removeClass('checked');
                                citationHelpers.appendToCitedBooks(selected_books);
                            });

                            $(document).on('click', '.selected-source .delete', function() {
                                var source_wrapper_id = '#selected-source-' + $(this).data('id');
                                $(source_wrapper_id).remove();
                            });
                        },

                        close : function() {
                            jQuery('label', button).removeClass('ui-state-active');
                            if (citeSpan) {
                                range.selectNode(citeSpan);
                            } else if (citationNode) {
                                range.selectNode(citationNode);
                            }
                            range.collapse();
                            selection.removeAllRanges();
                            selection.addRange(range);
                            widget.options.editable.element.focus();
                            widget.options.editable.keepActivated(false);
                            $(this).dialog('destroy').remove();
                        }
                    });

                    $('.fw-checkable').bind('click', function() { $.setCheckableLabel($(this)); });
                }

                function enableCitations() {
                    button.bind("click", openDialog);
                    button.removeClass('disabled');

                    citationHelpers.bindEvents(openDialog);
                    // Enable the exporter and citation style menus.
                    jQuery('.citationstyle-menu, .exporter-menu').each(function () {
                        jQuery.addDropdownBox(jQuery(this), jQuery(this).siblings('.fw-pulldown'));
                        jQuery(this).removeClass('disabled');
                        jQuery(this).removeClass('header-nav-item-disabled');
                        jQuery(this).addClass('header-nav-item');
                    });
                    //console.log('cite.js');
                    citationHelpers.formatCitationsInDoc();
                    editorHelpers.documentHasChanged();
                }

                if(jQuery.isEmptyObject(BibDB)) {
                    //Enable the various bibliography options once the bibliography data has been loaded.
                    jQuery('body').bind("bibliography_ready", function (event) {
                        //Enable the citation dialog now that the bibliography database is available.
                        enableCitations();
                    });
                } else {
                    enableCitations();
                }

                return _this.element.bind("keyup paste change mouseup", function (event) {
                    var nodeName, start;
                    start = jQuery(widget.options.editable.getSelection().startContainer);
                    nodeName = start.prop('nodeName') ? start.prop('nodeName') : start.parent().prop('nodeName');
                    if (nodeName && nodeName.toUpperCase() === "A") {
                        jQuery('label', button).addClass('ui-state-active');
                        return;
                    }
                    return jQuery('label', button).removeClass('ui-state-active');
                });
            };


            if (this.options.link) {
                buttonize("A");
            }
            if (this.options.link) {
                buttonset.buttonset();
                toolbar.append(buttonset);
                //return dialog.dialog(this.options.dialogOpts);
            }
        },

        _init: function () {}
    });
})(jQuery);