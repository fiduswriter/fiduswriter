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
        bibliographyHelpers = {};

    bibliographyHelpers.serverBibItemToBibDB = function (item, aBibDB) {
        var id = item['id'];
        aBibDB[id] = jQuery.parseJSON(item['fields']);
        aBibDB[id]['entry_type'] = item['entry_type'];
        aBibDB[id]['entry_key'] = item['entry_key'];
        aBibDB[id]['entry_cat'] = item['entry_cat'];
        return id;
    };

    bibliographyHelpers.addBibList = function (bibList) {
        // This takes a list of new bib entries and adds them to BibDB and the bibliography table
        var i, pks = [];
        for (i = 0; i < bibList.length; i++) {
            pks.push(bibliographyHelpers.serverBibItemToBibDB(bibList[i],BibDB));
        }

        if(jQuery('#bibliography').length > 0) {
            bibliographyHelpers.stopBibliographyTable();
            for (i = 0; i < pks.length; i++) {
                bibliographyHelpers.appendToBibTable(pks[i], BibDB[pks[i]]);
            }
            bibliographyHelpers.startBibliographyTable();
        }

        if(0 < jQuery('#add-cite-book').size()) {
            for (i = 0; i < pks.length; i++) {
                citationHelpers.appendToCitationDialog(pks[i], BibDB[pks[i]]);
            }
            jQuery("#cite-source-table").trigger("update");
        }
    };

    bibliographyHelpers.setCSLDB = function(aBibDB) {
        window.CSLDB = {};
        for(bib_id in aBibDB) {
            CSLDB[bib_id] = bibliographyHelpers.getCSLEntry(bib_id, aBibDB);
            CSLDB[bib_id].id = bib_id;
        }
    };

    bibliographyHelpers.getCSLEntry = function (id, aBibDB) {
        var bib = aBibDB[id],
            cslOutput = {},
            dateObject;

        this._reformDate = function (the_value) {
            //reform date-field
            var dates = the_value.split('/'),
                dates_value = [],
                i, len = dates.length,
                j, len2,
                each_date, date_parts, date_value, date_part;
            for (i = 0; i < len; i++) {
                each_date = dates[i];
                date_parts = each_date.split('-');
                date_value = [];
                len2 = date_parts.length;
                for (j = 0; j < len2; j++) {
                    date_part = date_parts[j];
                    if (date_part != parseInt(date_part))
                        break;
                    date_value[date_value.length] = date_part;
                }
                dates_value[dates_value.length] = date_value;
            }

            return {'date-parts': dates_value};
        };

        this._reformName = function (the_value) {
            //reform name-field
            var names = the_value.substring(1, the_value.length - 1).split(
                '} and {'),
                names_value = [],
                i, len = names.length,
                each_name, name_parts, name_value;
            for (i = 0; i < len; i++) {
                each_name = names[i];
                name_parts = each_name.split('} {');
                if (name_parts.length > 1) {
                    name_value = {
                        'family': name_parts[1].replace(/[{}]/g, ''),
                        'given': name_parts[0].replace(/[{}]/g, '')
                    };
                } else {
                    name_value = {
                        'literal': name_parts[0].replace(/[{}]/g, '')
                    };
                }
                names_value[names_value.length] = name_value;
            }

            return names_value;
        };

        for (f_key in bib) {
            if (bib[f_key] !== '' && f_key in BibFieldTypes && 'csl' in BibFieldTypes[f_key]) {
                var f_type = BibFieldTypes[f_key]['type'];
                if ('f_date' == f_type) {
                    cslOutput[BibFieldTypes[f_key]['csl']] = this._reformDate(
                        bib[f_key]);
                } else if ('l_name' == f_type) {
                    cslOutput[BibFieldTypes[f_key]['csl']] = this._reformName(
                        bib[f_key]);
                } else {
                    cslOutput[BibFieldTypes[f_key]['csl']] = bib[f_key];
                }
            }
        }
        cslOutput['type'] = BibEntryTypes[bib.entry_type].csl;
        return cslOutput;
    };

    bibliographyHelpers.bibLatexExport = function (pks, aBibDB) {
        this.bibtex_array = [];
        this.bibtex_str = '';
        if (typeof(aBibDB) === 'undefined' && typeof(window.BibDB) != 'undefined') {
            aBibDB = BibDB
        }

        this._reformDate = function (the_value, type_name) {
            //reform date-field
            var dates = the_value.split('/'),
                dates_value = [],
                i, len = dates.length,
                j, len2,
                each_date, date_parts, date_value, date_part;
            for (i = 0; i < len; i++) {
                each_date = dates[i];
                date_parts = each_date.split('-');
                date_value = [];
                len2 = date_parts.length;
                for (j = 0; j < len2; j++) {
                    date_part = date_parts[j];
                    if (date_part != parseInt(date_part))
                        break;
                    date_value[date_value.length] = date_part;
                }
                dates_value[dates_value.length] = date_value;
            }
            var value_list = {};
            var date_len = dates_value[0].length;
            if (1 < dates_value.length)
                date_len = Math.min(date_len, dates_value[1].length);
            if (3 == date_len) {
                the_value = dates_value[0].join('-');
                if (1 < dates_value.length)
                    the_value += '/' + dates_value[1].join('-');
                value_list[type_name] = the_value;
            } else if ('date' == type_name) {
                var year = dates_value[0][0];
                if (1 < dates_value.length)
                    year += '/' + dates_value[1][0];
                value_list.year = year;
                if (2 == date_len) {
                    var month = dates_value[0][1];
                    if (1 < dates_value.length)
                        month += '/' + dates_value[1][1];
                    value_list.month = month;
                }
            } else {
                if (date_len < dates_value[0].length)
                    dates_value[0].splice(date_len);
                the_value = dates_value[0].join('-');
                if (1 < dates_value.length) {
                    if (date_len < dates_value[1].length)
                        dates_value[1].splice(date_len);
                    the_value += '/' + dates_value[1].join('-');
                }
                value_list[type_name] = the_value;
            }
            return value_list;
        };

        this._escapeTexSpecialChars = function (the_value, pk) {
            if ('string' != typeof (the_value)) {
                console.log(the_value, pk);
            }
            var i, len = tex_special_chars.length;
            for (i = 0; i < len; i++) {
                the_value = the_value.replace(tex_special_chars[i].unicode,
                    tex_special_chars[i].tex);
            }
            return the_value;
        }

        this._getBibtexString = function (biblist) {
            var i, len = biblist.length,
                str = '',
                data, v_key;
            for (i = 0; i < len; i++) {
                if (0 < i) {
                    str += '\r\n\r\n';
                }
                data = biblist[i];
                str += '@' + data.type + '{' + data.key;
                for (v_key in data.values) {
                    str += ',\r\n' + v_key + ' = {' + data.values[v_key] + '}';
                }
                str += "\r\n}"
            }
            return str;
        }

        var i, len = pks.length,
            pk, bib, f_values,
            bib_entry, f_key, f_value, f_type;

        for (i = 0; i < len; i++) {
            pk = pks[i];
            bib = aBibDB[pk];
            bib_entry = {
                'type': BibEntryTypes[bib['entry_type']]['biblatex'],
                'key': bib['entry_key']
            };
            f_values = {};
            for (f_key in bib) {
                if ('entry_key' == f_key || 'id' == f_key || 'entry_type' ==
                    f_key || 'entry_owner' == f_key || 0 == f_key.indexOf(
                        'bibtype') ||
                    'entry_cat' == f_key)
                    continue;
                f_value = bib[f_key];
                if ("" == f_value)
                    continue;
                f_type = BibFieldTypes[f_key]['type'];
                if ('f_date' == f_type) {
                    var date_parts = this._reformDate(f_value, f_key);
                    for (var date_part in date_parts) {
                        f_values[date_part] = date_parts[date_part];
                    }
                    continue;
                }
                f_value = this._escapeTexSpecialChars(f_value, pk);
                f_values[BibFieldTypes[f_key]['biblatex']] = f_value;
            }
            bib_entry.values = f_values;
            this.bibtex_array[this.bibtex_array.length] = bib_entry;
        }
        this.bibtex_str = this._getBibtexString(this.bibtex_array);
    };

    bibliographyHelpers.bibtexParser = function () {
        this.pos = 0;
        this.input = "";

        this.entries = {};
        this.strings = {
            JAN: "January",
            FEB: "February",
            MAR: "March",
            APR: "April",
            MAY: "May",
            JUN: "June",
            JUL: "July",
            AUG: "August",
            SEP: "September",
            OCT: "October",
            NOV: "November",
            DEC: "December"
        };
        this.currentKey = "";
        this.currentEntry = "";
        this.currentType = "";

        this.month_name = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];

        this.setInput = function (t) {
            this.input = t;
        };

        this.getEntries = function () {
            return this.entries;
        };

        this.isWhitespace = function (s) {
            return (s == ' ' || s == '\r' || s == '\t' || s == '\n');
        };

        this.match = function (s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                this.pos += s.length;
            } else {
                console.log("Token mismatch, expected " + s +
                    ", found " + this.input
                    .substring(this.pos));
            }
            this.skipWhitespace();
        };

        this.tryMatch = function (s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                return true;
            } else {
                return false;
            }
            this.skipWhitespace();
        };

        this.skipWhitespace = function () {
            while (this.isWhitespace(this.input[this.pos])) {
                this.pos++;
            }
            if (this.input[this.pos] == "%") {
                while (this.input[this.pos] != "\n") {
                    this.pos++;
                }
                this.skipWhitespace();
            }
        };

        this.skipToNext = function () {
            while ((this.input.length > this.pos) && (this.input[this.pos] !=
                    "@")) {
                this.pos++
            }
            if (this.input.length == this.pos) {
                return false;
            } else {
                return true;
            }
        };

        this.reform_names = function (names) {
            //reform name
        };

        this.reform_dates = function (dates) {
            //reform date
        };

        this.value_braces = function () {
            var bracecount = 0;
            this.match("{");
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '}' && this.input[this.pos - 1] !=
                    '\\') {
                    if (bracecount > 0) {
                        bracecount--;
                    } else {
                        var end = this.pos;
                        this.match("}");
                        return this.input.substring(start, end);
                    }
                } else if (this.input[this.pos] == '{') {
                    bracecount++;
                } else if (this.pos == this.input.length - 1) {
                    console.log("Unterminated value");
                }
                this.pos++;
            }
        };

        this.value_quotes = function () {
            this.match('"');
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '"' && this.input[this.pos - 1] !=
                    '\\') {
                    var end = this.pos;
                    this.match('"');
                    return this.input.substring(start, end);
                } else if (this.pos == this.input.length - 1) {
                    console.log("Unterminated value:" + this.input.substring(
                            start));
                }
                this.pos++;
            }
        };

        this.single_value = function () {
            var start = this.pos;
            if (this.tryMatch("{")) {
                return this.value_braces();
            } else if (this.tryMatch('"')) {
                return this.value_quotes();
            } else {
                var k = this.key();
                if (this.strings[k.toUpperCase()]) {
                    return this.strings[k.toUpperCase()];
                } else if (k.match("^[0-9]+$")) {
                    return k;
                } else {
                    console.log("Value unexpected:" + this.input.substring(
                            start));
                }
            }
        };

        this.value = function () {
            var values = [];
            values.push(this.single_value());
            while (this.tryMatch("#")) {
                this.match("#");
                values.push(this.single_value());
            }
            return values.join("");
        };

        this.key = function () {
            var start = this.pos;
            while (true) {
                if (this.pos == this.input.length) {
                    console.log("Runaway key");
                }
                if (this.input[this.pos].match("[a-zA-Z0-9_:;`\\.\\\?+/-]")) {
                    this.pos++
                } else {
                    return this.input.substring(start, this.pos).toLowerCase();
                }
            }
        };

        this.key_equals_value = function () {
            var key = this.key();
            if (this.tryMatch("=")) {
                this.match("=");
                var val = this.value();
                return [key, val];
            } else {
                console.log(
                    "... = value expected, equals sign missing: " + this.input
                    .substring(this.pos));
            }
        };

        this.key_value_list = function () {
            var kv = this.key_equals_value();
            if (_.isUndefined(kv)) {
                // Entry has no fields, so we delete it.
                delete this.entries[this.currentEntry];
                return;
            }
            this.entries[this.currentEntry][kv[0]] = this.scan_bibtex_string(kv[
                1]);
            while (this.tryMatch(",")) {
                this.match(",");
                //fixes problems with commas at the end of a list
                if (this.tryMatch("}")) {
                    break;
                }
                kv = this.key_equals_value();
                val = this.scan_bibtex_string(kv[1]);
                switch (kv[0]) {
                case 'date':
                case 'month':
                case 'year':
                    this.entries[this.currentEntry].date[kv[0]] = val;
                    break;
                default:
                    this.entries[this.currentEntry][kv[0]] = val;
                }

            }
            var issued = this.entries[this.currentEntry].date.date;
            var date_format = 'd.m.Y';
            if ('undefined' == typeof (issued) || '' == issued) {
                if ('undefined' == typeof (this.entries[this.currentEntry].date
                        .month)) {
                    issued = ''
                    date_format = 'Y';
                } else {
                    issued = '-' + this.entries[this.currentEntry].date.month;
                    date_format = 'm.Y';
                }
                if ('undefined' == typeof (this.entries[this.currentEntry].date
                        .year)) {
                    issued = '';
                    date_format = '';
                } else {
                    issued = this.entries[this.currentEntry].date.year + issued;
                }
            } else {
                if (issued.indexOf('/') !== -1) {
                    // TODO: handle dates that have a from/to value
                    issued = issued.split('/')[0];
                }
                var dateDividers = issued.match(/-/g);
                if (!dateDividers) {
                    date_format = 'Y';
                } else if (1 === dateDividers.length) {
                    date_format = 'm.Y';
                }
            }
            issued = new Date(issued);
            if ('Invalid Date' == issued) {
                date_format = '';
            } else {
                date_format = date_format.replace('d', issued.getDate());
                date_format = date_format.replace('m', this.month_name[issued.getMonth()]);
                date_format = date_format.replace('Y', issued.getFullYear());
            }
            this.entries[this.currentEntry].date = date_format;
            //TODO: check the value type and reform the value, if needed.
            /*
            var f_type;
            for(var f_key in this.entries[this.currentEntry]) {
                if('bibtype' == f_key)
                    continue;
                f_type = BibFieldtypes[f_key];
                if('undefined' == typeof(f_type)) {
                    delete this.entries[this.currentEntry][f_key];
                    continue;
                }
                f_value = this.entries[this.currentEntry][f_key];
                switch(f_type) {
                    case 'l_name':
                        this.entries[this.currentEntry][f_key] = this.reform_names(f_value);
                        break;
                    case 'f_date':
                        this.entries[this.currentEntry][f_key] = this.reform_dates(f_value);
                        break;
                }
            }
            */
        };

        this.entry_body = function () {
            this.currentEntry = this.key();

            this.entries[this.currentEntry] = new Object();
            this.entries[this.currentEntry].bibtype = this.currentType;
            this.entries[this.currentEntry].date = {};
            this.match(",");
            this.key_value_list();
        };

        this.directive = function () {
            this.match("@");
            this.currentType = this.key();
            return "@" + this.currentType;
        };

        this.string = function () {
            var kv = this.key_equals_value();
            this.strings[kv[0].toUpperCase()] = kv[1];
        };

        this.preamble = function () {
            this.value();
        };

        this.entry = function () {
            this.entry_body();
        };

        this.scan_bibtex_string = function (value) {
            var len = tex_special_chars.length;
            for (var i = 0; i < len; i++) {
                special_char = tex_special_chars[i];
                while (-1 < value.indexOf(special_char.tex)) {
                    value = value.replace(special_char.tex, special_char.unicode);
                }
            }
            // Delete multiple spaces
            value = value.replace(/ +(?= )/g, '');
            //value = value.replace(/\{(.*?)\}/g, '$1');
            return value;
        };

        this.bibtex = function () {
            while (this.skipToNext()) {
                var d = this.directive();
                this.match("{");
                if (d == "@string") {
                    this.string();
                } else if (d == "@preamble") {
                    this.preamble();
                } else if (d == "@comment") {
                    continue;
                } else {
                    this.entry();
                }
                this.match("}");
            }
        };
    };

    bibliographyHelpers.createBibEntry = function (post_data) {
        $.activateWait();
        $.ajax({
                url: '/bibliography/save/',
                data: post_data,
                type: 'POST',
                dataType: 'json',
                success: function (response, textStatus, jqXHR) {
                    if (bibliographyHelpers.displayCreateBibEntryError(response.errormsg)) {
                        bibliographyHelpers.addBibList(response.values);
                        $.addAlert('success', gettext('The bibliography has been updated'));
                        jQuery("#createbook").dialog('close');
                    } else {
                        $.addAlert('error', gettext('Some errors are found. Please examine the form.'));
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', errorThrown);
                },
                complete: function () {
                    $.deactivateWait();
                }
            });
    };

    bibliographyHelpers.displayCreateBibEntryError = function (errors) {
        var noError = true,
            e_key;
        for (e_key in errors) {
            e_msg = '<div class="warning">' + errors[e_key] + '</div>';
            if ('error' == e_key) {
                jQuery('#createbook').prepend(e_msg);
            } else {
                jQuery('#id_' + e_key).after(e_msg);
            }
            noError = false;
        }
        return noError;
    };

    //save changes or create a new category
    bibliographyHelpers.createCategory = function (cats) {
        var post_data = {
            'ids[]': cats.ids,
            'titles[]': cats.titles
        };
        $.activateWait();
        $.ajax({
            url: '/bibliography/save_category/',
            data: post_data,
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                if (jqXHR.status == 201) {
                    var i, len = response.length;

                    BibCategories = [];
                    jQuery('#bib-category-list li').not(':first').remove();
                    bibliographyHelpers.addBibCategoryList(response);
                    $.addAlert('success', gettext('The categories have been updated'));
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText);
            },
            complete: function () {
                $.deactivateWait();
            }
        });
    };

    //delete a category
    bibliographyHelpers.deleteCategory = function (ids) {
        var post_data = {
            'ids[]': ids
        };
        $.ajax({
                url: '/bibliography/delete_category/',
                data: post_data,
                type: 'POST',
                dataType: 'json'
            });
    };

    //open a dialog for editing categories
    //var deleted_cat;
    bibliographyHelpers.createCategoryDialog = function () {
        var dialogHeader = gettext('Edit Categories');
        var dialogBody = tmp_editcategories({
                'dialogHeader': dialogHeader,
                'categories': tmp_categoryforms({
                        'categories': BibCategories
                    })
            });
        jQuery('body').append(dialogBody);
        var diaButtons = {};
        diaButtons[gettext('Submit')] = function () {
            var new_cat = {
                'ids': [],
                'titles': []
            };
            jQuery('#editCategories .category-form').each(function () {
                var this_val = jQuery.trim(jQuery(this).val());
                var this_id = jQuery(this).attr('data-id');
                if ('undefined' == typeof (this_id)) this_id = 0;
                if ('' != this_val) {
                    new_cat.ids.push(this_id);
                    new_cat.titles.push(this_val);
                } else if ('' == this_val && 0 < this_id) {
                    bibliographyHelpers.deleted_cat[bibliographyHelpers.deleted_cat
                    .length] = this_id;
                }
            });
            bibliographyHelpers.deleteCategory(bibliographyHelpers.deleted_cat);
            bibliographyHelpers.createCategory(new_cat);
            jQuery(this).dialog('close');
        };
        diaButtons[gettext('Cancel')] = function() { jQuery(this).dialog('close'); };

        jQuery("#editCategories").dialog({
            resizable: false,
            width: 350,
            height: 350,
            modal: true,
            buttons: diaButtons,
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close: function () {
                jQuery("#editCategories").dialog('destroy').remove();
            },
        });

        bibliographyHelpers.deleted_cat = [];
        bibliographyHelpers.addRemoveListHandler();

    }

    //open a dialog for creating or editing an entry
    bibliographyHelpers.createBibEntryDialog = function (id, type) {
        var entryType, rFields, oFields, eoFields, dialogHeader;
        if (null == id || 'undefined' === typeof (id)) {
            dialogHeader = gettext('Register New Source');
            id = 0;
            rFields = [];
            oFields = [];
            eoFields = [];
            entryCat = [];
        } else {
            dialogHeader = gettext('Edit Source');
            entryType = BibEntryTypes[type];
            rFields = entryType.required;
            oFields = entryType.optional;
            eoFields = entryType.eitheror;
            entryCat = BibDB[id]['entry_cat'].split(',');
        }
        //restore the categories and check if the category is selected
        var eCats = [];
        jQuery.each(BibCategories, function (i, eCat) {
            var len = eCats.length;
            eCats[len] = {
                'id': eCat.id,
                'category_title': eCat.category_title
            };
            if (0 <= jQuery.inArray(String(eCat.id), entryCat)) {
                eCats[len].checked = ' checked';
            } else {
                eCats[len].checked = '';
            }
        });
        //get html of select form for selecting a entry type
        //template function from underscore.js

        type_title = '';
        if ('' == type || typeof (type) === 'undefined') {
            type_title = gettext('Select source type');
        } else {
            type_title = BibEntryTypes[type]['title'];
        }

        var sourType = tmp_sourcetype({
            'fieldTitle': type_title,
            'fieldName': 'entrytype',
            'fieldValue': type,
            'options': BibEntryTypes
        });

        //get html of dialog body

        var dialogBody = tmp_create_bibitem({
            'dialogHeader': dialogHeader,
            'sourcetype': sourType,
            'requiredfields': bibliographyHelpers.getFieldForms(rFields, eoFields, id),
            'optionalfields': bibliographyHelpers.getFieldForms(oFields, [], id),
            'extras': tmp_category({
                'fieldTitle': gettext('Categories'),
                'categories': eCats
            })
        });
        jQuery('body').append(dialogBody);

        //open dropdown for selecting source type
        $.addDropdownBox(jQuery('#source-type-selection'), jQuery('#source-type-selection > .fw-pulldown'));
        jQuery('#source-type-selection .fw-pulldown-item').bind('click', function () {
            var source_type_title = jQuery(this).html(),
                source_type_id = jQuery(this).attr('data-value');
            jQuery(this).parent().siblings('.selected').removeClass('selected');
            jQuery(this).parent().addClass('selected');
            jQuery('#selected-source-type-title').html(source_type_title);
            jQuery('#id_entrytype').val(source_type_id).trigger('change');
        });

        //when the entry type is changed, the whole form has to be updated
        jQuery('#id_entrytype').bind('change', function () {
            var thisVal = jQuery(this).val();
            if ('' != thisVal) {
                bibliographyHelpers.updateBibEntryDialog(id, thisVal);
                type = thisVal;
            }
            jQuery('#bookoptionsTab').show();
        });

        //add and remove name list field
        bibliographyHelpers.addRemoveListHandler();
        var diaButtons = {};
        diaButtons[gettext('Submit')] = function () {
            if (type) {
                bibliographyHelpers.onCreateBibEntrySubmitHandler(id);
            }
        };
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close');
        };

        var dia_height = 500;
        jQuery("#createbook").dialog({
            draggable: false,
            resizable: false,
            width: 710,
            height: dia_height,
            modal: true,
            //position: ['center', 80],
            buttons: diaButtons,
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-dialog-buttonpane").addClass('createbook');
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close: function () {
                jQuery("#createbook").dialog('destroy').remove();
            }
        });

        // init ui tabs
        jQuery('#bookoptionsTab').tabs();

        // resize dialog height
        jQuery('#createbook .ui-tabs-panel').css('height', dia_height - 256);
        if ('' == jQuery('#id_entrytype').val())
            jQuery('#bookoptionsTab').hide();
        jQuery('.fw-checkable-label').bind('click', function () {
            $.setCheckableLabel(jQuery(this))
        });
    }

    bibliographyHelpers.onCreateBibEntrySubmitHandler = function (id) {
        //when submitted, the values in form elements will be restored
        var formValues = {
            'id': id,
            'entrytype': jQuery('#id_entrytype').val()
        };
        jQuery('.entryForm').each(function () {
            var $this = jQuery(this);
            var the_name = $this.attr('name') || $this.attr('data-field-name');
            var the_type = $this.attr('type') || $this.attr('data-type');
            var the_value = '';
            var isMust = (1 == $this.parents('#optionTab1').size());
            var eitheror = $this.parents('.eitheror');
            if (1 == eitheror.size()) {
                //if it is a either-or-field
                var field_names = eitheror.find('.field-names .fw-pulldown-item');
                field_names.each(function () {
                    if (jQuery(this).hasClass('selected')) {
                        the_name = 'eField' + jQuery(this).data('value');
                    } else {
                        formValues['eField' + jQuery(this).data('value')] = '';
                    }
                });
            }

            dataTypeSwitch: switch (the_type) {
                case 'fieldkeys':
                    var selected_key_item = $this.find('.fw-pulldown-item.selected');
                    if(0 == selected_key_item.size()) {
                        selected_key_item = $this.find('.fw-pulldown-item:eq(0)');
                    }
                    the_value = selected_key_item.data('value');
                    break;
                case 'date':
                    //if it is a date form, the values will be formatted yyyy-mm-dd
                    var y_val = $this.find('.select-year').val(),
                        m_val = $this.find('.select-month').val(),
                        d_val = $this.find('.select-date').val(),
                        y2_val = $this.find('.select-year2').val(),
                        m2_val = $this.find('.select-month2').val(),
                        d2_val = $this.find('.select-date2').val(),
                        date_format = $this.siblings('th').find('.fw-data-format-pulldown .fw-pulldown-item.selected').data('value'),
                        date_form = '',
                        date_val = '',
                        required_dates,
                        required_values,
                        date_objs = [],
                        i, len;

                    switch(date_format) {
                        case 'y':
                            required_values = required_dates = [y_val];
                            date_form = 'Y';
                            break;
                        case 'my':
                            required_values = [y_val, m_val];
                            required_dates = [y_val + '/' + m_val]
                            date_form = 'Y/m';
                            break;
                        case 'mdy':
                            required_values = [y_val, m_val, d_val];
                            required_dates = [y_val + '/' + m_val + '/' + d_val];
                            date_form = 'Y/m/d';
                            break;
                        case 'y/y':
                            required_values = required_dates = [y_val, y2_val];
                            date_form = 'Y-Y2';
                            break;
                        case 'my/my':
                            required_values = [y_val, y2_val, m_val, m2_val];
                            required_dates = [y_val + '/' + m_val, y2_val + '/' + m2_val];
                            date_form = 'Y/m-Y2/m2';
                            break;
                        case 'mdy/mdy':
                            required_values = [y_val, m_val, d_val, y2_val, m2_val, d2_val];
                            required_dates = [y_val + '/' + m_val + '/' + d_val,
                                y2_val + '/' + m2_val + '/' + d2_val];
                            date_form = 'Y/m/d-Y2/m2/d2';
                            break;
                    }

                    len = required_values.length;
                    for(i = 0; i < len; i ++) {
                        if('undefined' === typeof(required_values[i])
                        || null == required_values[i]
                        || '' == required_values[i]) {
                            the_value = '';
                            break dataTypeSwitch;
                        }
                    }

                    len = required_dates.length;
                    for(i = 0; i < len; i ++) {
                        var date_obj = new Date(required_dates[i]);
                        if('Invalid Date' == date_obj) {
                            the_value = '';
                            break dataTypeSwitch;
                        }
                        date_objs.push(date_obj);
                    }

                    date_form = date_form.replace('d', date_objs[0].getUTCDate());
                    date_form = date_form.replace('m', date_objs[0].getUTCMonth() + 1);
                    date_form = date_form.replace('Y', date_objs[0].getUTCFullYear());

                    if(2 == date_objs.length) {
                        date_form = date_form.replace('d2', date_objs[1].getUTCDate());
                        date_form = date_form.replace('m2', date_objs[1].getUTCMonth() + 1);
                        date_form = date_form.replace('Y2', date_objs[1].getUTCFullYear());
                    }

                    the_value = date_form;
                    break;
                case 'namelist':
                    the_value = [];
                    $this.find('.fw-list-input').each(function () {
                        $tr = jQuery(this);
                        var first_name = jQuery.trim($tr.find(
                                '.fw-name-input.fw-first').val());
                        var last_name = jQuery.trim($tr.find(
                                '.fw-name-input.fw-last').val());
                        var full_name = '';
                        if ('' == first_name && '' == last_name) {
                            return true;
                        } else if ('' == last_name) {
                            full_name = '{' + first_name + '}';
                        } else if ('' == first_name) {
                            full_name = '{' + last_name + '}';
                        } else {
                            full_name = '{' + first_name + '} {' + last_name + '}';
                        }
                        the_value[the_value.length] = full_name;
                    });
                    if (0 == the_value.length) {
                        the_value = '';
                    } else {
                        the_name += '[]';
                    }
                    break;
                case 'literallist':
                    the_value = [];
                    $this.find('.fw-list-input').each(function () {
                        var input_val = jQuery.trim(jQuery(this).find('.fw-input').val());
                        if ('' == input_val) return true;
                        the_value[the_value.length] = '{' + input_val + '}';
                    });
                    if (0 == the_value.length) {
                        the_value = '';
                    } else {
                        the_name += '[]';
                    }
                    break;
                case 'checkbox':
                    //if it is a checkbox, the value will be restored as an Array
                    the_name = the_name + '[]'
                    if (undefined == formValues[the_name]) formValues[the_name] = [];
                    if ($this.prop("checked")) formValues[the_name][formValues[
                        the_name].length] = $this.val();
                    return;
                default:
                    the_value = $this.val().replace(/(^\s+)|(\s+$)/g, "");
            }

            if (isMust && (undefined == the_value || '' == the_value)) {
                the_value = 'null';
            }
            formValues[the_name] = the_value;
        });
        bibliographyHelpers.createBibEntry(formValues);
        jQuery('#createbook .warning').detach();
    };

    bibliographyHelpers.addBibCategoryList = function (newBibCategories) {
        var i;
        BibCategories = BibCategories.concat(newBibCategories);
        for (i = 0; i < newBibCategories.length; i++) {
            bibliographyHelpers.appendToBibCatList(newBibCategories[i]);
        }
    };

    bibliographyHelpers.appendToBibCatList = function (bCat) {
        jQuery('#bib-category-list').append(tmp_bibliography_category_list_item({'bCat': bCat}));
    };

    bibliographyHelpers.addRemoveListHandler = function () {
        //add and remove name list field
        jQuery('.fw-add-input').bind('click', function () {
            var $parent = jQuery(this).parents('.fw-list-input');
            if (0 == $parent.next().size()) {
                var $parent_clone = $parent.clone(true);
                $parent_clone.find('input, select').val('').removeAttr(
                    'data-id');
                $parent_clone.insertAfter($parent);
            } else {
                var $the_prev = jQuery(this).prev();
                if ($the_prev.hasClass("category-form")) {
                    var this_id = $the_prev.attr('data-id');
                    if ('undefined' != typeof (this_id))
                        bibliographyHelpers.deleted_cat[bibliographyHelpers.deleted_cat
                        .length] = this_id;
                }
                $parent.remove();
            }
        });

        // init dropdown for eitheror field names
        jQuery('.fw-bib-field-pulldown').each(function() {
            jQuery.addDropdownBox(jQuery(this), jQuery(this).children('.fw-pulldown'));
        });
        jQuery('.fw-bib-field-pulldown .fw-pulldown-item').bind('click', function () {
            var selected_title = jQuery(this).html(),
                selected_value = jQuery(this).data('value');
            jQuery(this).parent().parent().find('.fw-pulldown-item.selected').removeClass('selected');
            jQuery(this).addClass('selected');
            jQuery(this).parent().parent().parent().siblings('label').html(selected_title);
        });

        // init dropdown for date format pulldown
        jQuery('.fw-data-format-pulldown').each(function() {
            jQuery.addDropdownBox(jQuery(this), jQuery(this).children('.fw-pulldown'));
        });
        jQuery('.fw-data-format-pulldown .fw-pulldown-item').bind('click', function () {
            var selected_title = jQuery(this).html(),
                selected_value = jQuery(this).data('value');
            jQuery(this).parent().parent().find('.fw-pulldown-item.selected').removeClass('selected');
            jQuery(this).addClass('selected');
            jQuery(this).parent().parent().parent().siblings('label').children('span').html('(' + selected_title + ')');
            jQuery(this).parent().parent().parent().parent().parent().parent().attr('data-format', selected_value);
        });

        // nit dropdown for f_key selection
        jQuery('.fw-bib-select-pulldown').each(function() {
            jQuery.addDropdownBox(jQuery(this), jQuery(this).children('.fw-pulldown'));
        });
        jQuery('.fw-bib-select-pulldown .fw-pulldown-item').bind('click', function () {
            var selected_title = jQuery(this).html(),
                selected_value = jQuery(this).data('value');
            jQuery(this).parent().parent().find('.fw-pulldown-item.selected').removeClass('selected');
            jQuery(this).addClass('selected');
            jQuery(this).parent().parent().parent().siblings('label').html(selected_title);
        });

        jQuery('.dk').dropkick();
    };

    bibliographyHelpers.createDateRnge = function (startR, endR) {
        var ret = Array();
        for (var i = startR; i <= endR; i++) {
            ret.push(i);
        }
        return ret;
    };

    //return html with form elements for the book dialog
    bibliographyHelpers.getFieldForms = function (fields, eitheror, id) {
        if(null == eitheror || undefined == eitheror) { eitheror = []; }
        var ret = '';
        var eitheror_fields = [],
            the_value;

        jQuery.each(fields, function () {
            //if the fieldtype must be "either or", then save it in the array
            if (0 === id) {
                the_value = '';
            } else {
                the_value = BibDB[id][BibFieldTypes[this].name];
                if ('undefined' === typeof (the_value)) {
                    the_value = '';
                }
            }
            //get html with template function of underscore.js
            if('f_date' == BibFieldTypes[this].type) {
                var date_form_html = bibliographyHelpers.getFormPart(BibFieldTypes[this], this, the_value),
                    date_format = date_form_html[1];
                ret += tmp_dateinput_tr({
                    'fieldTitle': BibFieldTypes[this].title,
                    'format': date_format,
                    'inputForm': date_form_html[0]
                });
            } else {
                ret += tmp_input_tr({
                    'fieldTitle': BibFieldTypes[this].title,
                    'inputForm': bibliographyHelpers.getFormPart(BibFieldTypes[this], this, the_value)
                });
            }
        });

        jQuery.each(eitheror, function () {
            eitheror_fields.push(BibFieldTypes[this]);
        });

        if (1 < eitheror.length) {
            var selected_field = eitheror_fields[0];
            jQuery.each(eitheror_fields, function () {
                //if the field has value, get html with template function of underscore.js
                if (0 !== id) {
                    var current_val = BibDB[id][this.name];
                    if(null != current_val && 'undefined' != typeof(current_val) && '' != current_val) {
                        selected_field = this;
                        return false;
                    }
                }
            });

            if (0 === id) {
                the_value = '';
            } else {
                the_value = BibDB[id][selected_field.name]
                if ('undefined' === typeof (the_value)) {
                    the_value = '';
                }
            }

            ret = tmp_eitheror_tr({
                'fields': eitheror_fields,
                'selected': selected_field,
                'inputForm': bibliographyHelpers.getFormPart(selected_field, id, the_value)
            }) + ret;
        }
        return ret;
    };

    bibliographyHelpers.getFormPart = function (form_info, the_id, the_value) {
        var the_type = form_info.type;
        var field_name = 'eField' + the_id;
        switch (the_type) {
            case 'f_date':
                the_value = citationHelpers.formatDateString(the_value);
                var dates = the_value.split('-'),
                    y_val = ['', ''],
                    m_val = ['', ''],
                    d_val = ['', ''],
                    min_date_length = 3,
                    date_format,
                    i, len = dates.length;

                for(i = 0; i < len; i++) {
                    var values = dates[i].split('/'),
                        values_len = values.length;

                    y_val[i] = values[0];
                    if(1 < values_len) { m_val[i] = values[1]; }
                    if(2 < values_len) { d_val[i] = values[2]; }
                    if(values_len < min_date_length) { min_date_length = values_len; }
                }

                if(1 < len) {
                    if(2 < min_date_length) {
                        date_format = 'mdy/mdy';
                    }else if(1 < min_date_length) {
                        date_format = 'my/my';
                    } else {
                        date_format = 'y/y';
                    }
                } else {
                    if(2 < min_date_length) {
                        date_format = 'mdy';
                    }else if(1 < min_date_length) {
                        date_format = 'my';
                    } else {
                        date_format = 'y';
                    }
                }

                return [
                    tmp_dateinput({
                        'fieldName': field_name,
                        'dateSelect': tmp_dateselect({
                            'type': 'date',
                            'fomrname': 'date' + the_id,
                            'value': d_val[0]
                        }),
                        'monthSelect': tmp_dateselect({
                            'type': 'month',
                            'fomrname': 'month' + the_id,
                            'value': m_val[0]
                        }),
                        'yearSelect': tmp_dateselect({
                            'type': 'year',
                            'fomrname': 'year' + the_id,
                            'value': y_val[0]
                        }),
                        'date2Select': tmp_dateselect({
                            'type': 'date2',
                            'fomrname': 'date2' + the_id,
                            'value': d_val[1]
                        }),
                        'month2Select': tmp_dateselect({
                            'type': 'month2',
                            'fomrname': 'month2' + the_id,
                            'value': m_val[1]
                        }),
                        'year2Select': tmp_dateselect({
                            'type': 'year2',
                            'fomrname': 'year2' + the_id,
                            'value': y_val[1]
                        })
                    }),
                    date_format
                ];
                break;
            case 'l_name':
                var names = the_value.split('} and {'),
                    name_values = [];

                for (var i = 0; i < names.length; i++) {
                    var name_parts = names[i].split('} {'),
                        f_name = name_parts[0].replace('{', '').replace('}', ''),
                        l_name = (1 < name_parts.length) ? name_parts[1].replace('}', '') : '';
                    name_values[name_values.length] = {
                        'first': f_name,
                        'last': l_name
                    };
                }

                if (0 == name_values.length) {
                    name_values[0] = {
                        'first': '',
                        'last': ''
                    };
                }
                return tmp_list_input({
                        'filedType': 'namelist',
                        'fieldName': field_name,
                        'inputForm': tmp_namelist_input({
                                'fieldValue': name_values
                            })
                    });
                break;
            case 'l_key':
            case 'l_literal':
                var literals = the_value.split('} and {');
                var literal_values = [];
                for (var i = 0; i < literals.length; i++) {
                    literal_values[literal_values.length] = literals[i].replace('{',
                        '').replace('}', '');
                }
                if (0 == literal_values.length)
                    literal_values[0] = '';
                return tmp_list_input({
                        'filedType': 'literallist',
                        'fieldName': field_name,
                        'inputForm': tmp_literallist_input({
                                'fieldValue': literal_values
                            })
                    });
            case 'f_key':
                if ('undefined' != typeof(form_info.localization)) {
                    var l_keys = _.select(LocalizationKeys, function (obj) {
                        return obj.type == form_info.localization;
                    }),
                        key_options = [],
                        selected_value_title = '';
                    jQuery.each(l_keys, function () {
                        if(this.name == the_value) {
                            selected_value_title = this.title;
                        }
                        key_options.push({
                            'value': this.name,
                            'title': this.title
                        });
                    });
                    return tmp_select({
                            'fieldName': field_name,
                            'fieldTitle': selected_value_title,
                            'fieldValue': the_value,
                            'fieldDefault': {
                                'value': '',
                                'title': ''
                            },
                            'options': key_options
                        });
                    break;
                }

            default:
                return tmp_input({
                        'fieldType': 'text',
                        'fieldName': field_name,
                        'fieldValue': the_value
                    });
        }
    };

    bibliographyHelpers.updateBibEntryDialog = function (id, type) {
        var entryType = BibEntryTypes[type];

        jQuery('#optionTab1 > table > tbody').html(bibliographyHelpers.getFieldForms(
            entryType.required,
            entryType.eitheror,
            id
        ));

        jQuery('#optionTab2 > table > tbody').html(bibliographyHelpers.getFieldForms(
            entryType.optional,
            [],
            id
        ));

        bibliographyHelpers.addRemoveListHandler();
    };

    //delete bib entry
    bibliographyHelpers.deleteBibEntry = function (ids) {
        for (var i = 0; i < ids.length; i++) {
            ids[i] = parseInt(ids[i]);
        }
        var post_data = {
            'ids[]': ids
        };
        $.activateWait();
        $.ajax({
                url: '/bibliography/delete/',
                data: post_data,
                type: 'POST',
                success: function (response, textStatus, jqXHR) {
                    var i, len = ids.length,
                        j, len2;
                    bibliographyHelpers.stopBibliographyTable();
                    for (i = 0; i < len; i++) {
                        delete BibDB[ids[i]];
                    }
                    var elements_id = '#Entry_' + ids.join(', #Entry_');
                    jQuery(elements_id).detach();
                    bibliographyHelpers.startBibliographyTable();
                    $.addAlert('success', gettext(
                            'The bibliography item(s) have been deleted'));
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', jqXHR.responseText);
                },
                complete: function () {
                    $.deactivateWait();
                }
            });
    };

    bibliographyHelpers.deleteBibEntryDialog = function (ids) {
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
                'Confirm deletion') + '"><p>' + gettext(
                'Delete the bibliography item(s)') + '?</p></div>');
        diaButtons = {};
        diaButtons[gettext('Delete')] = function () {
            bibliographyHelpers.deleteBibEntry(ids);
            jQuery(this).dialog('close');
        };
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close');
        };
        jQuery("#confirmdeletion").dialog({
                resizable: false,
                height: 180,
                modal: true,
                buttons: diaButtons,
                create: function () {
                    var $the_dialog = jQuery(this).closest(".ui-dialog");
                    $the_dialog.find(".ui-button:first-child").addClass(
                        "fw-button fw-dark");
                    $the_dialog.find(".ui-button:last").addClass(
                        "fw-button fw-orange");
                },
                close: function () {
                    jQuery("#confirmdeletion").dialog('destroy').remove();
                }
            });
    };

    bibliographyHelpers.exportBibliographyBL = function (ids) {
        var bib_export = new bibliographyHelpers.bibLatexExport(ids),
            export_obj = [{
                    'filename': 'bibliography.bib',
                    'contents': bib_export.bibtex_str
                }
            ];
        exporter.zipFileCreator(export_obj, [], 'bibliography.zip')
    };

    bibliographyHelpers.importBibliography2 = function (e) {
        var bib_data = new bibliographyHelpers.bibtexParser(), bib_entries, bib_keylist, totalChunks, currentChunkNumber;
        bib_data.setInput(e.target.result);
        bib_data.bibtex();
        bib_entries = bib_data.getEntries();
        if (_.isEmpty(bib_entries)) {
            $.deactivateWait();
            $.addAlert('error', gettext('No bibliography entries could be found in import file.'));
            return;
        } else {
            bib_keylist = Object.keys(bib_entries);
            totalChunks = Math.ceil(bib_keylist.length/50);
            currentChunkNumber = 0;
            
            function processChunk() {
                var currentChunk;
                if (currentChunkNumber < totalChunks) {
                    currentChunk = {};
                    for (var i = currentChunkNumber; i < currentChunkNumber + 50; i++) {
                        currentChunk[bib_keylist[i]]= bib_entries[bib_keylist[i]];
                    }
                    bibliographyHelpers.importBibliography3(currentChunk, function() {
                        currentChunkNumber++;
                        processChunk();
                    });  
                } else {
                    $.deactivateWait();
                }
            }
            processChunk();
        }
        
    };
    
    bibliographyHelpers.importBibliography3 = function (bib_entries, callback) {
        
        var post_data = {
            'bibs': $.toJSON(bib_entries)
        };
        
        $.ajax({
            url: '/bibliography/import_bibtex/',
            type: 'post',
            data: post_data,
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {

                bibliographyHelpers.addBibList(response.bibs);
                var errors = response.errors,
                    warnings = response.warning,
                    len = errors.length, i;
                for (i = 0; i < len; i++) {
                    $.addAlert('error', errors[i]);
                }
                len = warnings.length;
                for (i = 0; i < len; i++) {
                    $.addAlert('warning', warnings[i]);
                }

            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText);
            },
            complete: function () {
                callback();
            }
        });
    };

    bibliographyHelpers.importBibliography = function () {
        jQuery('body').append(tmp_import_bib());
        diaButtons = {};
        diaButtons[gettext('Import')] = function () {
            var bib_file = jQuery('#bib-uploader')[0].files;
            if (0 == bib_file.length) {
                console.log('no file found');
                return false;
            }
            bib_file = bib_file[0];
            if (1048576 < bib_file.size) {
                console.log('file too big');
                return false;
            }
            $.activateWait();
            var reader = new FileReader();
            reader.onerror = function (e) {
                console.log('error', e.target.error.code);
            };
            reader.onload = bibliographyHelpers.importBibliography2;
            reader.readAsText(bib_file);
            jQuery(this).dialog('close');
        };
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close');
        };
        jQuery("#importbibtex").dialog({
                resizable: false,
                height: 180,
                modal: true,
                buttons: diaButtons,
                create: function () {
                    var $the_dialog = jQuery(this).closest(".ui-dialog");
                    $the_dialog.find(".ui-button:first-child").addClass(
                        "fw-button fw-dark");
                    $the_dialog.find(".ui-button:last").addClass(
                        "fw-button fw-orange");
                    jQuery('#bib-uploader').bind('change', function () {
                        jQuery('#import-bib-name').html(jQuery(this).val().replace(
                                /C:\\fakepath\\/i, ''));
                    });
                    jQuery('#import-bib-btn').bind('click', function () {
                        jQuery('#bib-uploader').trigger('click');
                    });
                },
                close: function () {
                    jQuery("#importbibtex").dialog('destroy').remove();
                }
            });
    };

    bibliographyHelpers._and_others = gettext(' and others');

    bibliographyHelpers.appendToBibTable = function (pk, bib_info) {
        var allowEdit;
        var $tr = jQuery('#Entry_' + pk);
        //reform author field
        var bibauthor = bib_info.author || bib_info.editor;
        // If neither author nor editor were registered, use an empty string instead of nothing.
        // TODO: Such entries should likely not be accepted by the importer.
        if (typeof bibauthor === 'undefined') bibauthor = '';
        var bibauthors = bibauthor.split('} and {');
        //if there are more authors, add "and others" behind.
        var and_others = (1 < bibauthors.length) ? bibliographyHelpers._and_others : '';
        bibauthor = bibauthors[0];
        var bibauthor_list = bibauthor.split('} {');
        if (1 < bibauthor_list.length) {
            bibauthor = bibauthor_list[1] + ', ' + bibauthor_list[0];
        } else {
            bibauthor = bibauthor_list[0];
        }
        bibauthor = bibauthor.replace(/[{}]/g, '');
        bibauthor += and_others;
        // If title is undefined, set it to an empty string.
        // TODO: Such entries should likely not be accepted by the importer.
        if (typeof bib_info.title === 'undefined') bib_info.title = '';

        // theDocument will be undefined (on the bibliography index page).
        // Add edit options to bibliography table if the current user either is the owner of the
        // current document or he is accessing his bibliography manager directly.

        if (typeof (theDocument) === 'undefined' || theDocument.is_owner) {
            allowEdit = true;
        } else {
            allowEdit = false;
        }

        if (0 < $tr.size()) { //if the entry exists, update
            $tr.replaceWith(tmp_bibtable({
                        'id': pk,
                        'cats': bib_info.entry_cat.split(','),
                        'type': bib_info.entry_type,
                        'typetitle': BibEntryTypes[bib_info.entry_type]['title'],
                        'title': bib_info.title.replace(/[{}]/g, ''),
                        'author': bibauthor,
                        'published': citationHelpers.formatDateString(bib_info.date),
                        'allowEdit': allowEdit
                    }));
        } else { //if this is the new entry, append
            jQuery('#bibliography > tbody').append(tmp_bibtable({
                        'id': pk,
                        'cats': bib_info.entry_cat.split(','),
                        'type': bib_info.entry_type,
                        'typetitle': BibEntryTypes[bib_info.entry_type]['title'],
                        'title': bib_info.title.replace(/[{}]/g, ''),
                        'author': bibauthor,
                        'published': citationHelpers.formatDateString(bib_info.date),
                        'allowEdit': allowEdit
                    }));
        }
    };

    bibliographyHelpers.getABibDB = function(ownerId, callback) {
        // Get the BibDB of one specific user and call the callback with it.
            var aBibDB={};
            $.ajax({
                    url: '/bibliography/biblist/',
                    data: {
                        'owner_id': ownerId
                    },
                    type: 'POST',
                    dataType: 'json',
                    success: function (response, textStatus, jqXHR) {
                        for (i=0;i<response.bibList.length;i++) {
                            bibliographyHelpers.serverBibItemToBibDB(response.bibList[i],aBibDB);
                        }
                        if (callback) {
                            callback(aBibDB);
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        $.addAlert('error', jqXHR.responseText);
                    },
                    complete: function () {
                        $.deactivateWait();
                    }
                });

    };

    bibliographyHelpers.getBibDB = function(callback) {
        // Get the BibDB of the page.
        var documentOwnerId, lastModified = localStorage.getItem('last_modified_biblist'), numberOfEntries = localStorage.getItem('number_of_entries');

        window.BibDB = {};
        window.BibCategories = [];
        window.BibFieldTranslations = {};
        // A dictionary to look up bib fields by their fw type name. Needed for translation to CSL and Biblatex.
        //jQuery('#bibliography').dataTable().fnDestroy();
        //Fill BibDB
        if (typeof (theDocument) === 'undefined') {
            documentOwnerId = 0;
        } else {
            documentOwnerId = theDocument.owner.id;
        }
        
        if (_.isNull(lastModified)) {
            lastModified = -1;
        }
        
        if (_.isNull(numberOfEntries)) {
            numberOfEntries = -1;
        }

        $.activateWait();

        $.ajax({
            url: '/bibliography/biblist/',
            data: {
                'owner_id': documentOwnerId,
                'last_modified': lastModified,
                'number_of_entries': numberOfEntries,
            },
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {

                bibliographyHelpers.addBibCategoryList(response.bibCategories);
                if (response.hasOwnProperty('bibList')) {
                    bibliographyHelpers.addBibList(response.bibList);
                    try {
                        localStorage.setItem('biblist',JSON.stringify(response.bibList));
                        localStorage.setItem('last_modified_biblist',response.last_modified);
                        localStorage.setItem('number_of_entries',response.number_of_entries);
                    } catch (error) {
                        // The local storage was likely too small
                    }
                } else {
                    var bibList = JSON.parse(localStorage.getItem('biblist'));
                    bibliographyHelpers.addBibList(bibList);
                }
                
                jQuery(document.body).trigger("bibliography_ready");
                if (callback) { callback(); }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText);
            },
            complete: function () {
                $.deactivateWait();
            }
        });
    };

    bibliographyHelpers.stopBibliographyTable = function () {
        jQuery('#bibliography').dataTable().fnDestroy();
    };

    bibliographyHelpers.startBibliographyTable = function () {
        // The sortable table seems not to have an option to accept new data added to the DOM. Instead we destroy and recreate it.
        jQuery('#bibliography').dataTable({
            "bPaginate": false,
            "bLengthChange": false,
            "bFilter": true,
            "bInfo": false,
            "bAutoWidth": false,
            "oLanguage": {
                "sSearch": ''
            },
            "aoColumnDefs": [{
                "bSortable": false,
                "aTargets": [0, 5]
            }],
        });
        jQuery('#bibliography_filter input').attr('placeholder', gettext('Search for Bibliography'));

        jQuery('#bibliography_filter input').unbind('focus, blur');
        jQuery('#bibliography_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus');
        });
        jQuery('#bibliography_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus');
        });

        var autocomplete_tags = [];
        jQuery('#bibliography .fw-searchable').each(function() {
            autocomplete_tags.push(this.innerText);
        });
        autocomplete_tags = _.uniq(autocomplete_tags);
        jQuery("#bibliography_filter input").autocomplete({
            source: autocomplete_tags
        });
    };
    
    //var bibliography_data_table;
    bibliographyHelpers.init = function () {

        jQuery(document).on('click', '.delete-bib', function () {
            var BookId = jQuery(this).attr('data-id');
            bibliographyHelpers.deleteBibEntryDialog([BookId]);
        });
        jQuery('#edit-category').bind('click', bibliographyHelpers.createCategoryDialog);

        jQuery(document).on('click', '.edit-bib', function () {
            var eID = jQuery(this).attr('data-id');
            var eType = jQuery(this).attr('data-type');
            bibliographyHelpers.createBibEntryDialog(eID, eType);
        });

        //open dropdown for bib category
        $.addDropdownBox(jQuery('#bib-category-btn'), jQuery('#bib-category-pulldown'));
        jQuery(document).on('click', '#bib-category-pulldown li > span', function () {
            jQuery('#bib-category-btn > label').html(jQuery(this).html());
            jQuery('#bib-category').val(jQuery(this).attr('data-id'));
            jQuery('#bib-category').trigger('change');
        });

        //filtering function for the list of bib entries
        jQuery('#bib-category').bind('change', function () {
            var cat_val = jQuery(this).val();
            if (0 == cat_val) {
                jQuery('#bibliography > tbody > tr').show();
            } else {
                jQuery('#bibliography > tbody > tr').hide();
                jQuery('#bibliography > tbody > tr.cat_' + cat_val).show();
            }
        });

        //select all entries
        jQuery('#select-all-entry').bind('change', function () {
            var new_bool = false;
            if (jQuery(this).prop("checked"))
                new_bool = true;
            jQuery('.entry-select').each(function () {
                this.checked = new_bool
            });
        });

        //open dropdown for selecting action
        $.addDropdownBox(jQuery('#select-action-dropdown'), jQuery('#action-selection-pulldown'));

        //import a bib file
        jQuery('.import-bib').bind('click', bibliographyHelpers.importBibliography);

        //submit entry actions
        jQuery('#action-selection-pulldown li > span').bind('click', function () {
            var action_name = jQuery(this).attr('data-action'),
                ids = [];

            if ('' == action_name || 'undefined' == typeof (action_name)) { return; }

            jQuery('.entry-select:checked').each(function () {
                ids[ids.length] = jQuery(this).attr('data-id');
            });

            if (0 == ids.length) { return; }

            switch (action_name) {
                case 'delete':
                    bibliographyHelpers.deleteBibEntryDialog(ids);
                    break;
                case 'export':
                    bibliographyHelpers.exportBibliographyBL(ids);
                    break;
            }
        });

        bibliographyHelpers.getBibDB(function(){
            if (window.hasOwnProperty('theDocument')) {
                citationHelpers.formatCitationsInDoc();
            }
        });
    };

    bibliographyHelpers.bind = function () {
        jQuery(document).ready(function () {

            bibliographyHelpers.init();

        });

    };

    exports.bibliographyHelpers = bibliographyHelpers;

}).call(this);
