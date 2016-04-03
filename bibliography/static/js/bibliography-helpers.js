/**
 * @file Functions related to the bibliography.
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
/** The version number of Bibliography local storage. Needs to be increased when large changes are made to force reload. */


(function () {
    var exports = this,
        /**
         * Helper functions for the bibliography.
         * @namespace bibliographyHelpers
         */
        bibliographyHelpers = {};


    var formatDateString = function(dateString) {
        // This mirrors the formatting of the date as returned by Python in bibliography/models.py
        if ('undefined' == typeof(dateString)) return '';
        var dates = dateString.split('/');
        var newValue = [];
        var x, i, dataParts;
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


    /** Dictionary of date selection options for bibliography item editor (localized).
     * @constant date_format
     * @memberof bibliographyHelpers
     */
    bibliographyHelpers.date_format = {
        'y': gettext('Year'),
        'y/y': gettext('Year - Year'),
        'my': gettext('Month/Year'),
        'my/my': gettext('M/Y - M/Y'),
        'mdy': gettext('Month/Day/Year'),
        'mdy/mdy': gettext('M/D/Y - M/D/Y')
    };


    /** Converts a BibDB to a DB of the CSL type. The output is written to window.CSLDB.
     * @function setCSLDB
     * @memberof bibliographyHelpers
     * @param aBibDB The bibliography database to convert.
     *
     */
    bibliographyHelpers.setCSLDB = function (aBibDB) {
        window.CSLDB = {};
        for (bib_id in aBibDB) {
            CSLDB[bib_id] = bibliographyHelpers.getCSLEntry(bib_id, aBibDB);
            CSLDB[bib_id].id = bib_id;
        }
    };
    /** Converts one BibDB entry to CSL format.
     * @function getCSLEntry
     * @memberof bibliographyHelpers
     * @param id The id identifying the bibliography entry.
     * @param aBibDB The BibDB from which the entry is recovered.
     *
     */
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

            return {
                'date-parts': dates_value
            };
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



    // EXPORT
    /** Adds a list of bibliography categories to current list of bibliography categories.
     * @function addBibCategoryList
     * @param newBibCategories The new categories which will be added to the existing ones.
     */
    bibliographyHelpers.addBibCategoryList = function(newBibCategories) {
        for (let i = 0; i < newBibCategories.length; i++) {
            bibliographyHelpers.appendToBibCatList(newBibCategories[i]);
        }
    };

    /** Add an item to the HTML list of bibliography categories.
     * @function appendToBibCatList
     * @param bCat Category to be appended.
     */
    // NO EXPORT
    bibliographyHelpers.appendToBibCatList = function(bCat) {
        jQuery('#bib-category-list').append(tmp_bibliography_category_list_item({
            'bCat': bCat
        }));
    };

    /** This takes a list of new bib entries and adds them to BibDB and the bibliography table
     * @function addBibList
     * @memberof bibliographyHelpers
     * @param bibList The list of bibliography items from the server.
     */
    // EXPORT
    bibliographyHelpers.addBibList = function(pks) {

        if (jQuery('#bibliography').length > 0) {
            bibliographyHelpers.stopBibliographyTable(); // KEEP
            for (let i = 0; i < pks.length; i++) {
                bibliographyHelpers.appendToBibTable(pks[i], BibDB[pks[i]]); // KEEP
            }
            bibliographyHelpers.startBibliographyTable(); // KEEP
        }

        if (window.theEditor && 0 < jQuery('#add-cite-book').size()) {
            // We are in the editor view
            for (let i = 0; i < pks.length; i++) {
                theEditor.mod.menus.citation.appendToCitationDialog(pks[i], BibDB[pks[i]]);
            }
            jQuery("#cite-source-table").trigger("update");
        }
    };

    /** Opens a dialog for editing categories.
     * @function createCategoryDialog
     * @memberof bibliographyHelpers
     */
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
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close');
        };

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

    /** Opens a dialog for creating or editing a bibliography entry.
     * @function createBibEntryDialog
     * @memberof bibliographyHelpers
     * @param id The id of the bibliography item (if available).
     * @param type The id of the type of source (a book, an article, etc.).
     */
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
        jQuery('#source-type-selection .fw-pulldown-item').bind('mousedown', function () {
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
    /** Handles the submission of the bibliography entry form.
     * @function onCreateBibEntrySubmitHandler
     * @memberof bibliographyHelpers
     * @param id The id of the bibliography item.
     */
    bibliographyHelpers.onCreateBibEntrySubmitHandler = function (id) {
        //when submitted, the values in form elements will be restored
        var formValues = {
            'id': id,
            'entrytype': jQuery('#id_entrytype').val()
        };

        if (window.hasOwnProperty('theEditor') && !(theEditor.docInfo.is_owner)) {
            formValues['owner_id'] = theEditor.doc.owner.id;
        }
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
                if (0 == selected_key_item.size()) {
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

                switch (date_format) {
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
                        y2_val + '/' + m2_val + '/' + d2_val
                    ];
                    date_form = 'Y/m/d-Y2/m2/d2';
                    break;
                }

                len = required_values.length;
                for (i = 0; i < len; i++) {
                    if ('undefined' === typeof (required_values[i]) || null == required_values[i] || '' == required_values[i]) {
                        the_value = '';
                        break dataTypeSwitch;
                    }
                }

                len = required_dates.length;
                for (i = 0; i < len; i++) {
                    var date_obj = new Date(required_dates[i]);
                    if ('Invalid Date' == date_obj) {
                        the_value = '';
                        break dataTypeSwitch;
                    }
                    date_objs.push(date_obj);
                }

                date_form = date_form.replace('d', date_objs[0].getUTCDate());
                date_form = date_form.replace('m', date_objs[0].getUTCMonth() + 1);
                date_form = date_form.replace('Y', date_objs[0].getUTCFullYear());

                if (2 == date_objs.length) {
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

    /** Add and remove name list field.
     * @function addRemoveListHandler
     * @memberof bibliographyHelpers
     */
    bibliographyHelpers.addRemoveListHandler = function () {
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
        jQuery('.fw-bib-field-pulldown').each(function () {
            jQuery.addDropdownBox(jQuery(this), jQuery(this).children('.fw-pulldown'));
        });
        jQuery('.fw-bib-field-pulldown .fw-pulldown-item').bind('mousedown', function () {
            var selected_title = jQuery(this).html(),
                selected_value = jQuery(this).data('value');
            jQuery(this).parent().parent().find('.fw-pulldown-item.selected').removeClass('selected');
            jQuery(this).addClass('selected');
            jQuery(this).parent().parent().parent().siblings('label').html(selected_title);
        });

        // init dropdown for date format pulldown
        jQuery('.fw-data-format-pulldown').each(function () {
            jQuery.addDropdownBox(jQuery(this), jQuery(this).children('.fw-pulldown'));
        });
        jQuery('.fw-data-format-pulldown .fw-pulldown-item').bind('mousedown', function () {
            var selected_title = jQuery(this).html(),
                selected_value = jQuery(this).data('value');
            jQuery(this).parent().parent().find('.fw-pulldown-item.selected').removeClass('selected');
            jQuery(this).addClass('selected');
            jQuery(this).parent().parent().parent().siblings('label').children('span').html('(' + selected_title + ')');
            jQuery(this).parent().parent().parent().parent().parent().parent().attr('data-format', selected_value);
        });

        // nit dropdown for f_key selection
        jQuery('.fw-bib-select-pulldown').each(function () {
            jQuery.addDropdownBox(jQuery(this), jQuery(this).children('.fw-pulldown'));
        });
        jQuery('.fw-bib-select-pulldown .fw-pulldown-item').bind('mousedown', function () {
            var selected_title = jQuery(this).html(),
                selected_value = jQuery(this).data('value');
            jQuery(this).parent().parent().find('.fw-pulldown-item.selected').removeClass('selected');
            jQuery(this).addClass('selected');
            jQuery(this).parent().parent().parent().siblings('label').html(selected_title);
        });

        jQuery('.dk').dropkick();
    };

    /** Create an array with of numbers.
     * @function createDateRnge
     * @memberof bibliographyHelpers
     * @param startR Start number
     * @param endR End number
     */
    bibliographyHelpers.createDateRnge = function (startR, endR) {
        var ret = Array();
        for (var i = startR; i <= endR; i++) {
            ret.push(i);
        }
        return ret;
    };

    /** Return html with form elements for the bibliography entry dialog.
     * @function getFieldForms
     * @memberof bibliographyHelpers
     * @param fields A list of the fields
     * @param eitheror Fields of which either entry A or B is obligatory.
     * @param id The id of the bibliography entry.
     */
    bibliographyHelpers.getFieldForms = function (fields, eitheror, id) {
        if (null == eitheror || undefined == eitheror) {
            eitheror = [];
        }
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
            if ('f_date' == BibFieldTypes[this].type) {
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
                    if (null != current_val && 'undefined' != typeof (current_val) && '' != current_val) {
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
    /** Recover the current value of a certain field in the bibliography item form.
     * @function getFormPart
     * @memberof bibliographyHelpers
     * @param form_info Information about the field -- such as it's type (date, text string, etc.)
     * @param the_id The id specifying the field.
     * @param the_value The current value of the field.
     */
    bibliographyHelpers.getFormPart = function (form_info, the_id, the_value) {
        var the_type = form_info.type;
        var field_name = 'eField' + the_id;
        switch (the_type) {
        case 'f_date':
            the_value = formatDateString(the_value);
            var dates = the_value.split('-'),
                y_val = ['', ''],
                m_val = ['', ''],
                d_val = ['', ''],
                min_date_length = 3,
                date_format,
                i, len = dates.length;

            for (i = 0; i < len; i++) {
                var values = dates[i].split('/'),
                    values_len = values.length;

                y_val[i] = values[0];
                if (1 < values_len) {
                    m_val[i] = values[1];
                }
                if (2 < values_len) {
                    d_val[i] = values[2];
                }
                if (values_len < min_date_length) {
                    min_date_length = values_len;
                }
            }

            if (1 < len) {
                if (2 < min_date_length) {
                    date_format = 'mdy/mdy';
                } else if (1 < min_date_length) {
                    date_format = 'my/my';
                } else {
                    date_format = 'y/y';
                }
            } else {
                if (2 < min_date_length) {
                    date_format = 'mdy';
                } else if (1 < min_date_length) {
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
                        'formname': 'date' + the_id,
                        'value': d_val[0]
                    }),
                    'monthSelect': tmp_dateselect({
                        'type': 'month',
                        'formname': 'month' + the_id,
                        'value': m_val[0]
                    }),
                    'yearSelect': tmp_dateselect({
                        'type': 'year',
                        'formname': 'year' + the_id,
                        'value': y_val[0]
                    }),
                    'date2Select': tmp_dateselect({
                        'type': 'date2',
                        'formname': 'date2' + the_id,
                        'value': d_val[1]
                    }),
                    'month2Select': tmp_dateselect({
                        'type': 'month2',
                        'formname': 'month2' + the_id,
                        'value': m_val[1]
                    }),
                    'year2Select': tmp_dateselect({
                        'type': 'year2',
                        'formname': 'year2' + the_id,
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
            if ('undefined' != typeof (form_info.localization)) {
                var l_keys = _.select(LocalizationKeys, function (obj) {
                    return obj.type == form_info.localization;
                }),
                    key_options = [],
                    selected_value_title = '';
                jQuery.each(l_keys, function () {
                    if (this.name == the_value) {
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
    /** Change the type of the bibliography item in the form (article, book, etc.)
     * @function updateBibEntryDialog
     * @memberof bibliographyHelpers
     * @param id The id of the bibliography entry.
     * @param type The new type of the bibliography entry.
     */
    bibliographyHelpers.updateBibEntryDialog = function (id, type) {
        var entryType = BibEntryTypes[type];

        jQuery('#optionTab1 > table > tbody').html(bibliographyHelpers.getFieldForms(
            entryType.required,
            entryType.eitheror,
            id
        ));

        jQuery('#optionTab2 > table > tbody').html(bibliographyHelpers.getFieldForms(
            entryType.optional, [],
            id
        ));

        bibliographyHelpers.addRemoveListHandler();
    };

    /** Dialog to confirm deletion of bibliography items.
     * @function deleteBibEntryDialog
     * @memberof bibliographyHelpers
     * @param ids Ids of items that are to be deleted.
     */
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


    /** Translated text of " and others".
     * @constant _and_others
     * @memberof bibliographyHelpers
     */
    bibliographyHelpers._and_others = gettext(' and others');
    /** Add or update an item in the bibliography table (HTML).
     * @function appendToBibTable
     * @memberof bibliographyHelpers
     * @param pk The pk specifying the bibliography item.
     * @param bib_info An object with the current information about the bibliography item.
     */
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

        // theEditor will be undefined (on the bibliography index page).
        // Add edit options to bibliography table if the current user either is the owner of the
        // current document or he is accessing his bibliography manager directly.

        if (typeof (theEditor) === 'undefined' || theEditor.docInfo.is_owner) {
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
                'published': formatDateString(bib_info.date),
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
                'published': formatDateString(bib_info.date),
                'allowEdit': allowEdit
            }));
        }
    };

    /** Stop the interactive parts of the bibliography table.
     * @function stopBibliographyTable
     * @memberof bibliographyHelpers
     */
    bibliographyHelpers.stopBibliographyTable = function () {
        jQuery('#bibliography').dataTable().fnDestroy();
    };
    /** Start the interactive parts of the bibliography table.
     * @function startBibliographyTable
     * @memberof bibliographyHelpers
     */
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
        jQuery('#bibliography_filter input').bind('focus', function () {
            jQuery(this).parent().addClass('focus');
        });
        jQuery('#bibliography_filter input').bind('blur', function () {
            jQuery(this).parent().removeClass('focus');
        });

        var autocomplete_tags = [];
        jQuery('#bibliography .fw-searchable').each(function () {
            autocomplete_tags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''));
        });
        autocomplete_tags = _.uniq(autocomplete_tags);
        jQuery("#bibliography_filter input").autocomplete({
            source: autocomplete_tags
        });
    };
    /** Initialize the bibliography table and bind interactive parts.
     * @function init
     * @memberof bibliographyHelpers
     */
    bibliographyHelpers.bindEvents = function () {

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
        jQuery('.import-bib').bind('click', function () {
            new BibLatexImporter();
        });

        //submit entry actions
        jQuery('#action-selection-pulldown li > span').bind('mousedown', function () {
            var action_name = jQuery(this).attr('data-action'),
                ids = [];

            if ('' == action_name || 'undefined' == typeof (action_name)) {
                return;
            }

            jQuery('.entry-select:checked').each(function () {
                ids[ids.length] = jQuery(this).attr('data-id');
            });

            if (0 == ids.length) {
                return;
            }

            switch (action_name) {
            case 'delete':
                bibliographyHelpers.deleteBibEntryDialog(ids);
                break;
            case 'export':
                new BibLatexExporter(ids, window.BibDB, true);
                break;
            }
        });

    };

    /* These are temporal functions to replace the old getBibDB function.
    TODO: These functions should be entirely replaced when converting to ES6.
    */
    bibliographyHelpers.getBibDB = function(callback) {
        window.BibDB = {}
        window.BibCategories = []

        if (typeof (theEditor) === 'undefined') {
            docOwnerId = 0;
        } else {
            docOwnerId = theEditor.doc.owner.id;
        }

        window.theBibliographyDB = new BibliographyDB(docOwnerId, true, window.BibDB, window.BibCategories);

        theBibliographyDB.getBibDB(function(bibPks, bibCats){

            bibliographyHelpers.addBibCategoryList(bibCats);
            bibliographyHelpers.addBibList(bibPks);
            jQuery(document.body).trigger("bibliography_ready");
            if (callback) {
                callback()
            }
        })
    }

    bibliographyHelpers.getABibDB = function(docOwnerId, callback) {
        let aBibDB = new BibliographyDB(docOwnerId, false, false, false)
        aBibDB.getBibDB(function(bibPks, bibCats) {
            if (callback) {
                callback(aBibDB.bibDB)
            }
        })
    }

    bibliographyHelpers.createBibEntry = function(bibEntryData) {
        theBibliographyDB.createBibEntry(bibEntryData, function(newBibPks) {
             bibliographyHelpers.addBibList(newBibPks);
             jQuery("#createbook").dialog('close');
        });
    }

    bibliographyHelpers.createCategory = function(cats) {
        theBibliographyDB.createCategory(cats, function(bibCats){
            while (theBibliographyDB.bibCategories.length > 0) {
                theBibliographyDB.bibCategories.pop();
            }

            jQuery('#bib-category-list li').not(':first').remove();
            bibliographyHelpers.addBibCategoryList(bibCats);
        });
    }

    bibliographyHelpers.deleteCategory = function(cats) {
        theBibliographyDB.createCategory(cats);
    }

    bibliographyHelpers.deleteBibEntry = function(ids) {
        theBibliographyDB.deleteBibEntry(ids, function(ids){
            bibliographyHelpers.stopBibliographyTable();
            var elements_id = '#Entry_' + ids.join(', #Entry_');
            jQuery(elements_id).detach();
            bibliographyHelpers.startBibliographyTable();
        })
    }



    /* END ES-6 temporary functions. */


    bibliographyHelpers.initiate = function () {

        bibliographyHelpers.getBibDB(function () {
            if (window.hasOwnProperty('theEditor') && theEditor.pm) {
                theEditor.mod.citations.layoutCitations();
            }
            jQuery(document).trigger("bibliography_ready");
        });
    };
    /** Bind the init function to jQuery(document).ready.
     * @function bind
     * @memberof bibliographyHelpers
     */
    bibliographyHelpers.bind = function () {
        jQuery(document).ready(function () {
            bibliographyHelpers.bindEvents();
            bibliographyHelpers.initiate();

        });

    };

    exports.bibliographyHelpers = bibliographyHelpers;

}).call(this);
