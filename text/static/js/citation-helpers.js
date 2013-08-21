/**
 * This file is part of Fidus Writer <http://www.fiduswriter.org>
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm
 *
 * This program is free software: you can redistribute it and/or modify
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

(function () {
    var exports = this,
        citationHelpers = {};

    citationHelpers.formatDateString = function (dateString) {
        // This mirrors the formatting of the date as returned by Python in bibliography/models.py
        if('undefined' == typeof(dateString)) return '';
        var dates, newValue, dateParts, x, i;
        dates = dateString.split('/');
        newValue = [];
        for (x = 0; x < dates.length; x++) {
            dateParts = dates[x].split('-');
            newValue.push('');
            for (i = 0; i < dateParts.length; i++) {
                if (isNaN(dateParts[i])) {
                    break;
                }
                if (i > 0) {
                    newValue[x] += '/';
                }
                newValue[x] += dateParts[i];
            }
        }
        if (newValue[0] === '') {
            return '';
        } else if (newValue.length === 1) {
            return newValue[0];
        } else {
            return newValue[0] + '-' + newValue[1];
        }
    };

    citationHelpers.stripValues = function(bibValue) {
        return bibValue.replace(/[\{\}]/g, '');
    }

    citationHelpers.getAuthor = function(bibData) {
        var author = bibData.author, splitAuthor, returnObject={};
        if('' == author || 'undefined' == typeof(author)) {
            author = bibData.editor;
        }
        splitAuthor = author.split("{");
        if (splitAuthor.length > 2) {
            returnObject.firstName = author.split("{")[1].replace(/[\{\}]/g, '').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            returnObject.lastName = author.split("{")[2].replace(/[\{\}]/g, '').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        } else {
            returnObject.firstName = '';
            returnObject.lastName = author.split("{")[1].replace(/[\{\}]/g, '').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        }
        return returnObject;
    }

    citationHelpers.yearFromDateString = function (dateString) {
        // This mirrors the formatting of the date as returned by Python in bibliography/models.py
        var dates, newValue, dateParts, x, i;
        dates = dateString.split('/');
        newValue = [];
        for (x = 0; x < dates.length; x++) {
            dateParts = dates[x].split('-');
            // Only make use of the first value (to/from years), discarding month and day values
            if (isNaN(dateParts[0])) {
                break;
            }
            newValue.push(dateParts[0]);
        }
        if (newValue.length === 0) {
            return 'Unpublished';
        } else if (newValue.length === 1) {
            return newValue[0];
        } else {
            return newValue[0] + '-' + newValue[1];
        }
    };

    citationHelpers.formatCitationsInDoc = function () {
        jQuery('#document-bibliography').html(
            citationHelpers.formatCitations(
                jQuery('#document-editable')[0],
                theDocument.settings.citationstyle,
                BibDB
            )
        );
    };

    citationHelpers.formatCitations = function (contentElement, citationstyle, aBibDB) {
        var bibliographyHTML = '',
            allCitations = jQuery(contentElement).find('.citation'),
            allCitationsListed,
            listedWorksCounter = 0,
            j, len,
            citeproc_params = [],
            bib_formats = [],
            citations_ids = [],
            citeproc_obj;

        allCitations.each(function(i) {
            var entries = this.dataset.bibEntry.split(',');
            allCitationsListed = true;

            len = entries.length;
            for(j = 0; j < len; j ++) {
                if(aBibDB.hasOwnProperty(entries[j])) { continue; }
                allCitationsListed = false;
                break;
            }

            if(allCitationsListed) {
                var pages = this.dataset.bibPage.split(',,,'),
                    prefixes = this.dataset.bibBefore.split(',,,'),
                    //suffixes = this.dataset.bibAfter.split(',,,'),
                    citation_item,
                    citation_items = [];

                listedWorksCounter += entries.length;

                for(j = 0; j < len; j ++) {
                    citation_item = { id: entries[j] };
                    if('' != pages[j]) { citation_item.locator = pages[j]; }
                    if('' != prefixes[j]) { citation_item.prefix = prefixes[j]; }
                    //if('' != suffixes[j]) { citation_item.suffix = pages[j]; }
                    citation_items.push(citation_item);
                }

                citations_ids.push(i);
                bib_formats.push(this.dataset.bibFormat);
                citeproc_params.push({
                    citationItems: citation_items,
                    properties: {
                        noteIndex: citations_ids.length
                    }
                });
            }
        });

        if (listedWorksCounter == 0) {
            return '';
        }

        citeproc_obj = citeprocHelpers.getOutputs(citeproc_params, citationstyle, bib_formats, aBibDB);
        len = citeproc_obj.citations.length;
        for(j = 0; j < len; j ++) {
            var citation_text = citeproc_obj.citations[j][0][1];
            if('note' == citeproc_obj.citationtype) {
                citation_text = '<span class="pagination-footnote"><span><span>' + citation_text + '</span></span></span>';
            }
            allCitations[citations_ids[j]].innerHTML = ' ' + citation_text;
        }

        if ('note' == citeproc_obj.citationtype || lastStyleUsedFootnotes) {
            document.getElementById('flow').dispatchEvent(pagination.events.redoEscapes);
            if ('note' != citeproc_obj.citationtype) {
                lastStyleUsedFootnotes = false;
            }
        }

        bibliographyHTML += '<h1>' + gettext('Bibliography') + '</h1>';
        // Add entry to bibliography
        len = citeproc_obj.bibliography[1].length;
        for (j = 0; j < len; j ++) {
            bibliographyHTML += citeproc_obj.bibliography[1][j];
        }

        // Delete entries that are exactly the same
        //bibliographyHTML = _.unique(bibliographyHTML.split('<p>')).join('<p>')
        bibliographyHTML = bibliographyHTML.replace(/<div class="csl-entry">/g, '<p>');
        return bibliographyHTML.replace(/<\/div>/g, '</p>');
    };

    citationHelpers.bindEvents = function(openDialog) {
        jQuery(document).on('click', '.citation', function () {
            openDialog();
        });
    };

    citationHelpers.appendToCitedBooks = function(books) {
        var i, len = books.length;
        for(i = 0; i < len; i ++) {
            $('#selected-cite-source-table .fw-document-table-body').append(tmp_selected_citation({
                'id': books[i].id,
                'type': books[i].type,
                'title': books[i].title,
                'author': books[i].author,
                'page': '',
                'prefix': ''
            }));
        }
    }

    citationHelpers.appendToCitationDialog = function(pk, bib_info) {
        // If neither author nor editor were registered, use an empty string instead of nothing.
        // TODO: Such entries should likely not be accepted by the importer.
        var bibauthor = bib_info.editor || bib_info.author || '';

        // If title is undefined, set it to an empty string.
        // TODO: Such entries should likely not be accepted by the importer.
        if (typeof bib_info.title === 'undefined') bib_info.title = '';

        var book_data = {
            'id': pk,
            'type': bib_info.entry_type,
            'title': bib_info.title.replace(/[{}]/g, ''),
            'author': bibauthor.replace(/[{}]/g, '')
        };

        $('#cite-source-table > tbody').append(tmp_citation_book(book_data));
        citationHelpers.appendToCitedBooks([book_data]);
    }

    exports.citationHelpers = citationHelpers;
}).call(this);