/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit bibliography-overview.es6.js and run ./es6-transpile.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _overview = require("./es6_modules/bibliography/overview/overview");

var theBibOverview = new _overview.BibliographyOverview();

window.theBibOverview = theBibOverview;

},{"./es6_modules/bibliography/overview/overview":5}],2:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FW_LOCALSTORAGE_VERSION = "1.0";

var BibliographyDB = exports.BibliographyDB = (function () {
    function BibliographyDB(docOwnerId, useLocalStorage, oldBibDB, oldBibCats) {
        _classCallCheck(this, BibliographyDB);

        this.docOwnerId = docOwnerId; // theEditor.doc.owner.id || 0
        this.useLocalStorage = useLocalStorage; // Whether to use local storage to cache result
        if (oldBibDB) {
            this.bibDB = oldBibDB;
        } else {
            this.bibDB = {};
        }
        if (oldBibCats) {
            this.bibCats = oldBibCats;
        } else {
            this.bibCats = [];
        }
    }

    // EXPORT
    /** Get the bibliography from the server and create as window.BibDB.
     * @function getBibDB
     * @param callback Will be called afterward.
     */

    _createClass(BibliographyDB, [{
        key: 'getBibDB',
        value: function getBibDB(callback) {

            var lastModified = -1,
                numberOfEntries = -1,
                that = this;

            if (this.useLocalStorage) {
                var _lastModified = parseInt(localStorage.getItem('last_modified_biblist')),
                    _numberOfEntries = parseInt(localStorage.getItem('number_of_entries')),
                    localStorageVersion = localStorage.getItem('version'),
                    localStorageOwnerId = parseInt(localStorage.getItem('owner_id'));
                that = this;

                // A dictionary to look up bib fields by their fw type name. Needed for translation to CSL and Biblatex.
                //jQuery('#bibliography').dataTable().fnDestroy()
                //Fill BibDB

                if (_.isNaN(_lastModified)) {
                    _lastModified = -1;
                }

                if (_.isNaN(_numberOfEntries)) {
                    _numberOfEntries = -1;
                }

                if (localStorageVersion != FW_LOCALSTORAGE_VERSION || localStorageOwnerId != this.docOwnerId) {
                    _lastModified = -1;
                    _numberOfEntries = -1;
                }
            }

            $.activateWait();

            $.ajax({
                url: '/bibliography/biblist/',
                data: {
                    'owner_id': that.docOwnerId,
                    'last_modified': lastModified,
                    'number_of_entries': numberOfEntries
                },
                type: 'POST',
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {

                    var newBibCats = response.bibCategories;
                    newBibCats.forEach(function (bibCat) {
                        that.bibCats.push(bibCat);
                    });

                    var bibList = [];

                    if (that.useLocalStorage) {
                        if (response.hasOwnProperty('bibList')) {
                            bibList = response.bibList;
                            try {
                                localStorage.setItem('biblist', JSON.stringify(response.bibList));
                                localStorage.setItem('last_modified_biblist', response.last_modified);
                                localStorage.setItem('number_of_entries', response.number_of_entries);
                                localStorage.setItem('owner_id', response.that.docOwnerId);
                                localStorage.setItem('version', FW_LOCALSTORAGE_VERSION);
                            } catch (error) {
                                // The local storage was likely too small
                            }
                        } else {
                                bibList = JSON.parse(localStorage.getItem('biblist'));
                            }
                    } else {
                        bibList = response.bibList;
                    }
                    var newBibPks = [];
                    for (var i = 0; i < bibList.length; i++) {
                        newBibPks.push(that.serverBibItemToBibDB(bibList[i]));
                    }
                    if (callback) {
                        callback(newBibPks, newBibCats);
                    }
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', jqXHR.responseText);
                },
                complete: function complete() {
                    $.deactivateWait();
                }
            });
        }

        /** Converts a bibliography item as it arrives from the server to a BibDB object.
         * @function serverBibItemToBibDB
         * @param item The bibliography item from the server.
         */
        // NO EXPORT!

    }, {
        key: 'serverBibItemToBibDB',
        value: function serverBibItemToBibDB(item) {
            var id = item['id'];
            var aBibDBEntry = JSON.parse(item['fields']);
            aBibDBEntry['entry_type'] = item['entry_type'];
            aBibDBEntry['entry_key'] = item['entry_key'];
            aBibDBEntry['entry_cat'] = item['entry_cat'];
            this.bibDB[id] = aBibDBEntry;
            return id;
        }

        /** Saves a bibliography entry to the database on the server.
         * @function createBibEntry
         * @param post_data The bibliography data to send to the server.
         */

    }, {
        key: 'createBibEntry',
        value: function createBibEntry(postData, callback) {
            var that = this;
            $.activateWait();
            $.ajax({
                url: '/bibliography/save/',
                data: postData,
                type: 'POST',
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {
                    if (that.displayCreateBibEntryError(response.errormsg)) {
                        $.addAlert('success', gettext('The bibliography has been updated'));
                        var newBibPks = [];
                        var bibList = response.values;
                        for (var i = 0; i < bibList.length; i++) {
                            newBibPks.push(that.serverBibItemToBibDB(bibList[i]));
                        }
                        if (callback) {
                            callback(newBibPks);
                        }
                    } else {
                        $.addAlert('error', gettext('Some errors are found. Please examine the form.'));
                    }
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', errorThrown);
                },
                complete: function complete() {
                    $.deactivateWait();
                }
            });
        }

        /** Displays an error on bibliography entry creation
         * @function displayCreateBibEntryError
         * @param errors Errors to be displayed
         */

    }, {
        key: 'displayCreateBibEntryError',
        value: function displayCreateBibEntryError(errors) {
            var noError = true;
            for (var eKey in errors) {
                eMsg = '<div class="warning">' + errors[eKey] + '</div>';
                if ('error' == eKey) {
                    jQuery('#createbook').prepend(eMsg);
                } else {
                    jQuery('#id_' + eKey).after(eMsg);
                }
                noError = false;
            }
            return noError;
        }

        /** Update or create new category
         * @function createCategory
         * @param cats The category objects to add.
         */

    }, {
        key: 'createCategory',
        value: function createCategory(cats, callback) {
            var that = this;
            var postData = {
                'ids[]': cats.ids,
                'titles[]': cats.titles
            };
            $.activateWait();
            $.ajax({
                url: '/bibliography/save_category/',
                data: postData,
                type: 'POST',
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {
                    if (jqXHR.status == 201) {
                        var bibCats = response.entries; // We receive both existing and new categories.
                        // Replace the old with the new categories, but don't lose the link to the array (so delete each, then add each).
                        while (that.bibCats.length > 0) {
                            that.bibCats.pop();
                        }
                        while (bibCats.length > 0) {
                            that.bibCats.push(bibCats.pop());
                        }

                        $.addAlert('success', gettext('The categories have been updated'));
                        if (callback) {
                            callback(that.bibCats);
                        }
                    }
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', jqXHR.responseText);
                },
                complete: function complete() {
                    $.deactivateWait();
                }
            });
        }

        /** Delete a categories
         * @function deleteCategory
         * @param ids A list of ids to delete.
         */

    }, {
        key: 'deleteCategory',
        value: function deleteCategory(ids, callback) {

            var postData = {
                'ids[]': ids
            },
                that = this;
            $.ajax({
                url: '/bibliography/delete_category/',
                data: postData,
                type: 'POST',
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {
                    var deletedPks = ids.slice();
                    var deletedBibCats = [];
                    that.bibCats.forEach(function (bibCat) {
                        if (ids.indexOf(bibCat.id) !== -1) {
                            deletedBibCats.push(bibCat);
                        }
                    });
                    deletedBibCats.forEach(function (bibCat) {
                        var index = that.bibCats.indexOf(bibCat);
                        that.bibCats.splice(index, 1);
                    });
                    if (callback) {
                        callback(deletedPks);
                    }
                }
            });
        }

        /** Delete a list of bibliography items both locally and on the server.
         * @function deleteBibEntry
         * @param ids A list of bibliography item ids that are to be deleted.
         */

    }, {
        key: 'deleteBibEntry',
        value: function deleteBibEntry(ids, callback) {
            var that = this;
            for (var i = 0; i < ids.length; i++) {
                ids[i] = parseInt(ids[i]);
            }
            var postData = {
                'ids[]': ids
            };
            $.activateWait();
            $.ajax({
                url: '/bibliography/delete/',
                data: postData,
                type: 'POST',
                success: function success(response, textStatus, jqXHR) {
                    for (var i = 0; i < ids.length; i++) {
                        delete that.bibDB[ids[i]];
                    }
                    $.addAlert('success', gettext('The bibliography item(s) have been deleted'));
                    if (callback) {
                        callback(ids);
                    }
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', jqXHR.responseText);
                },
                complete: function complete() {
                    $.deactivateWait();
                }
            });
        }
    }]);

    return BibliographyDB;
})();

},{}],3:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibEntryForm = undefined;

var _tools = require("../tools");

var _templates = require("./templates");

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BibEntryForm = exports.BibEntryForm = (function () {
    function BibEntryForm(itemId, sourceType, bibDB, bibCats, callback) {
        _classCallCheck(this, BibEntryForm);

        this.itemId = itemId; // The id of the bibliography item (if available).
        this.sourceType = sourceType; // The id of the type of source (a book, an article, etc.).
        this.bibDB = bibDB;
        this.bibCats = bibCats;
        this.callback = callback;
        this.createBibEntryDialog();
    }

    /** Opens a dialog for creating or editing a bibliography entry.
     */

    _createClass(BibEntryForm, [{
        key: "createBibEntryDialog",
        value: function createBibEntryDialog() {
            var rFields = undefined,
                oFields = undefined,
                eoFields = undefined,
                dialogHeader = undefined,
                id = this.itemId,
                type = this.sourceType,
                entryCat = undefined,
                that = this;
            if (!id) {
                dialogHeader = gettext('Register New Source');
                id = 0;
                rFields = [];
                oFields = [];
                eoFields = [];
                entryCat = [];
            } else {
                dialogHeader = gettext('Edit Source');
                var entryType = BibEntryTypes[type];
                rFields = entryType.required;
                oFields = entryType.optional;
                eoFields = entryType.eitheror;
                entryCat = this.bibDB[id]['entry_cat'].split(',');
            }
            //restore the categories and check if the category is selected
            var eCats = [];
            jQuery.each(this.bibCats, function (i, eCat) {
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

            var typeTitle = '';
            if ('' == type || typeof type === 'undefined') {
                typeTitle = gettext('Select source type');
            } else {
                typeTitle = BibEntryTypes[type]['title'];
            }

            var sourType = (0, _templates.sourcetypeTemplate)({
                'fieldTitle': typeTitle,
                'fieldName': 'entrytype',
                'fieldValue': type,
                'options': BibEntryTypes
            });

            //get html of dialog body

            var dialogBody = (0, _templates.createBibitemTemplate)({
                'dialogHeader': dialogHeader,
                'sourcetype': sourType,
                'requiredfields': this.getFieldForms(rFields, eoFields, id),
                'optionalfields': this.getFieldForms(oFields, [], id),
                'extras': (0, _templates.categoryTemplate)({
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
                    that.updateBibEntryDialog(id, thisVal);
                    type = thisVal;
                }
                jQuery('#bookoptionsTab').show();
            });

            //add and remove name list field
            (0, _tools.addRemoveListHandler)();
            var diaButtons = {};
            diaButtons[gettext('Submit')] = function () {
                if (type) {
                    that.onCreateBibEntrySubmitHandler(id);
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
                create: function create() {
                    var $the_dialog = jQuery(this).closest(".ui-dialog");
                    $the_dialog.find(".ui-dialog-buttonpane").addClass('createbook');
                    $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                    $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
                },
                close: function close() {
                    jQuery("#createbook").dialog('destroy').remove();
                }
            });

            // init ui tabs
            jQuery('#bookoptionsTab').tabs();

            // resize dialog height
            jQuery('#createbook .ui-tabs-panel').css('height', dia_height - 256);
            if ('' == jQuery('#id_entrytype').val()) jQuery('#bookoptionsTab').hide();
            jQuery('.fw-checkable-label').bind('click', function () {
                $.setCheckableLabel(jQuery(this));
            });
        }

        /** Return html with form elements for the bibliography entry dialog.
         * @function getFieldForms
         * @param fields A list of the fields
         * @param eitheror Fields of which either entry A or B is obligatory.
         * @param id The id of the bibliography entry.
         */

    }, {
        key: "getFieldForms",
        value: function getFieldForms(fields, eitheror, id) {
            var that = this;
            if (null == eitheror || undefined == eitheror) {
                eitheror = [];
            }
            var ret = '';
            var eitheror_fields = [],
                the_value = undefined;

            jQuery.each(fields, function () {
                //if the fieldtype must be "either or", then save it in the array
                if (0 === id) {
                    the_value = '';
                } else {
                    the_value = that.bibDB[id][BibFieldTypes[this].name];
                    if ('undefined' === typeof the_value) {
                        the_value = '';
                    }
                }
                //get html with template function of underscore.js
                if ('f_date' == BibFieldTypes[this].type) {
                    var date_form_html = that.getFormPart(BibFieldTypes[this], this, the_value),
                        date_format = date_form_html[1];
                    ret += (0, _templates.dateinputTrTemplate)({
                        'fieldTitle': BibFieldTypes[this].title,
                        'format': date_format,
                        'inputForm': date_form_html[0],
                        dateFormat: _tools.dateFormat
                    });
                } else {
                    ret += (0, _templates.inputTrTemplate)({
                        'fieldTitle': BibFieldTypes[this].title,
                        'inputForm': that.getFormPart(BibFieldTypes[this], this, the_value)
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
                        var current_val = that.bibDB[id][this.name];
                        if (null != current_val && 'undefined' != typeof current_val && '' != current_val) {
                            selected_field = this;
                            return false;
                        }
                    }
                });

                if (0 === id) {
                    the_value = '';
                } else {
                    the_value = that.bibDB[id][selected_field.name];
                    if ('undefined' === typeof the_value) {
                        the_value = '';
                    }
                }

                ret = (0, _templates.eitherorTrTemplate)({
                    'fields': eitheror_fields,
                    'selected': selected_field,
                    'inputForm': that.getFormPart(selected_field, id, the_value)
                }) + ret;
            }
            return ret;
        }

        /** Change the type of the bibliography item in the form (article, book, etc.)
         * @function updateBibEntryDialog
         * @param id The id of the bibliography entry.
         * @param type The new type of the bibliography entry.
         */

    }, {
        key: "updateBibEntryDialog",
        value: function updateBibEntryDialog(id, type) {
            var entryType = BibEntryTypes[type];

            jQuery('#optionTab1 > table > tbody').html(this.getFieldForms(entryType.required, entryType.eitheror, id));

            jQuery('#optionTab2 > table > tbody').html(this.getFieldForms(entryType.optional, [], id));

            (0, _tools.addRemoveListHandler)();
        }

        /** Handles the submission of the bibliography entry form.
         * @function onCreateBibEntrySubmitHandler
         * @param id The id of the bibliography item.
         */

    }, {
        key: "onCreateBibEntrySubmitHandler",
        value: function onCreateBibEntrySubmitHandler(id) {
            //when submitted, the values in form elements will be restored
            var formValues = {
                'id': id,
                'entrytype': jQuery('#id_entrytype').val()
            };

            if (window.hasOwnProperty('theEditor') && !theEditor.docInfo.is_owner) {
                formValues['owner_id'] = theEditor.doc.owner.id;
            }
            jQuery('.entryForm').each(function () {
                var $this = jQuery(this);
                var the_name = $this.attr('name') || $this.attr('data-field-name');
                var the_type = $this.attr('type') || $this.attr('data-type');
                var the_value = '';
                var isMust = 1 == $this.parents('#optionTab1').size();
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
                            required_dates = undefined,
                            required_values = undefined,
                            date_objs = [],
                            i = undefined,
                            len = undefined;

                        switch (date_format) {
                            case 'y':
                                required_values = required_dates = [y_val];
                                date_form = 'Y';
                                break;
                            case 'my':
                                required_values = [y_val, m_val];
                                required_dates = [y_val + '/' + m_val];
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
                                required_dates = [y_val + '/' + m_val + '/' + d_val, y2_val + '/' + m2_val + '/' + d2_val];
                                date_form = 'Y/m/d-Y2/m2/d2';
                                break;
                        }

                        len = required_values.length;
                        for (i = 0; i < len; i++) {
                            if ('undefined' === typeof required_values[i] || null == required_values[i] || '' == required_values[i]) {
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
                            var $tr = jQuery(this);
                            var first_name = jQuery.trim($tr.find('.fw-name-input.fw-first').val());
                            var last_name = jQuery.trim($tr.find('.fw-name-input.fw-last').val());
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
                        the_name = the_name + '[]';
                        if (undefined == formValues[the_name]) formValues[the_name] = [];
                        if ($this.prop("checked")) formValues[the_name][formValues[the_name].length] = $this.val();
                        return;
                    default:
                        the_value = $this.val().replace(/(^\s+)|(\s+$)/g, "");
                }

                if (isMust && (undefined == the_value || '' == the_value)) {
                    the_value = 'null';
                }
                formValues[the_name] = the_value;
            });
            this.callback(formValues);
            jQuery('#createbook .warning').detach();
            jQuery("#createbook").dialog('close');
        }

        /** Recover the current value of a certain field in the bibliography item form.
         * @function getFormPart
         * @param form_info Information about the field -- such as it's type (date, text string, etc.)
         * @param the_id The id specifying the field.
         * @param the_value The current value of the field.
         */

    }, {
        key: "getFormPart",
        value: function getFormPart(form_info, the_id, the_value) {
            var the_type = form_info.type;
            var field_name = 'eField' + the_id;
            switch (the_type) {
                case 'f_date':
                    the_value = (0, _tools.formatDateString)(the_value);
                    var dates = the_value.split('-'),
                        y_val = ['', ''],
                        m_val = ['', ''],
                        d_val = ['', ''],
                        min_date_length = 3,
                        date_format = undefined,
                        len = dates.length;

                    for (var i = 0; i < len; i++) {
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

                    return [(0, _templates.dateinputTemplate)({
                        'fieldName': field_name,
                        'dateSelect': (0, _templates.dateselectTemplate)({
                            'type': 'date',
                            'formname': 'date' + the_id,
                            'value': d_val[0]
                        }),
                        'monthSelect': (0, _templates.dateselectTemplate)({
                            'type': 'month',
                            'formname': 'month' + the_id,
                            'value': m_val[0]
                        }),
                        'yearSelect': (0, _templates.dateselectTemplate)({
                            'type': 'year',
                            'formname': 'year' + the_id,
                            'value': y_val[0]
                        }),
                        'date2Select': (0, _templates.dateselectTemplate)({
                            'type': 'date2',
                            'formname': 'date2' + the_id,
                            'value': d_val[1]
                        }),
                        'month2Select': (0, _templates.dateselectTemplate)({
                            'type': 'month2',
                            'formname': 'month2' + the_id,
                            'value': m_val[1]
                        }),
                        'year2Select': (0, _templates.dateselectTemplate)({
                            'type': 'year2',
                            'formname': 'year2' + the_id,
                            'value': y_val[1]
                        })
                    }), date_format];
                    break;
                case 'l_name':
                    var names = the_value.split('} and {'),
                        name_values = [];

                    for (var i = 0; i < names.length; i++) {
                        var name_parts = names[i].split('} {'),
                            f_name = name_parts[0].replace('{', '').replace('}', ''),
                            l_name = 1 < name_parts.length ? name_parts[1].replace('}', '') : '';
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
                    return (0, _templates.listInputTemplate)({
                        'filedType': 'namelist',
                        'fieldName': field_name,
                        'inputForm': (0, _templates.namelistInputTemplate)({
                            'fieldValue': name_values
                        })
                    });
                    break;
                case 'l_key':
                case 'l_literal':
                    var literals = the_value.split('} and {');
                    var literal_values = [];
                    for (var i = 0; i < literals.length; i++) {
                        literal_values[literal_values.length] = literals[i].replace('{', '').replace('}', '');
                    }
                    if (0 == literal_values.length) literal_values[0] = '';
                    return (0, _templates.listInputTemplate)({
                        'filedType': 'literallist',
                        'fieldName': field_name,
                        'inputForm': (0, _templates.literallistInputTemplate)({
                            'fieldValue': literal_values
                        })
                    });
                case 'f_key':
                    if ('undefined' != typeof form_info.localization) {
                        var _ret = (function () {
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
                            return {
                                v: (0, _templates.selectTemplate)({
                                    'fieldName': field_name,
                                    'fieldTitle': selected_value_title,
                                    'fieldValue': the_value,
                                    'fieldDefault': {
                                        'value': '',
                                        'title': ''
                                    },
                                    'options': key_options
                                })
                            };
                        })();

                        if ((typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object") return _ret.v;
                    } else {
                        // TODO: Check if we really want this template here.
                        return (0, _templates.inputTemplate)({
                            'fieldType': 'text',
                            'fieldName': field_name,
                            'fieldValue': the_value
                        });
                    }
                    break;
                default:
                    return (0, _templates.inputTemplate)({
                        'fieldType': 'text',
                        'fieldName': field_name,
                        'fieldValue': the_value
                    });
            }
        }
    }]);

    return BibEntryForm;
})();

},{"../tools":7,"./templates":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template to select the bibliography item source type */
var sourcetypeTemplate = exports.sourcetypeTemplate = _.template('<div id="source-type-selection" class="fw-button fw-white fw-large">\
        <input type="hidden" id="id_<%- fieldName %>" name="<%- fieldName %>" value="<%- fieldValue %>" />\
        <span id="selected-source-type-title"><%= fieldTitle %></span>\
        <span class="icon-down-dir"></span>\
        <div class="fw-pulldown fw-center">\
            <ul><% _.each(_.sortBy(options, function(source_type){ return source_type.order; }), function(opt) { %>\
                <li>\
                    <span class="fw-pulldown-item" data-value="<%- opt.id %>"><%= gettext(opt.title) %></span>\
                </li>\
            <% }) %></ul>\
        </div>\
    </div>');

/** A template for the bibliography item edit dialog. */
var createBibitemTemplate = exports.createBibitemTemplate = _.template('\
    <div id="createbook" title="<%- dialogHeader %>">\
        <%= sourcetype %>\
        <div id="bookoptionsTab">\
            <ul>\
                <li><a href="#optionTab1" class="fw-button fw-large">' + gettext('Required Fields') + '</a></li>\
                <li><a href="#optionTab2" class="fw-button fw-large">' + gettext('Optional Fields') + '</a></li>\
                <li><a href="#optionTab3" class="fw-button fw-large">' + gettext('Extras') + '</a></li>\
            </ul>\
            <div id="optionTab1"><table class="fw-dialog-table"><tbody><%= requiredfields %></tbody></table></div>\
            <div id="optionTab2"><table class="fw-dialog-table"><tbody><%= optionalfields %></tbody></table></div>\
            <div id="optionTab3"><table class="fw-dialog-table"><tbody><%= extras %></tbody></table></div>\
        </div>\
    </div>');

/* A template to show the category selection pane of the bibliography item edit dialog. */
var categoryTemplate = exports.categoryTemplate = _.template('\
    <tr>\
        <th><h4 class="fw-tablerow-title"><%- fieldTitle %></h4></th>\
        <td><% _.each(categories, function(cat) { %>\
            <label class="fw-checkable fw-checkable-label<%- cat.checked %>" for="entryCat<%- cat.id %>"><%- cat.category_title %></label>\
            <input class="fw-checkable-input entryForm entry-cat" type="checkbox" id="entryCat<%- cat.id %>" name="entryCat" value="<%- cat.id %>"<%- cat.checked %> />\
        <% }) %></td>\
    </tr>');

/** A template of a date input row of the bibliography item edit form. */
var dateinputTrTemplate = exports.dateinputTrTemplate = _.template('<tr class="date-input-tr" data-format="<%= format %>">\
        <th>\
            <div class="fw-data-format-pulldown fw-bib-form-pulldown">\
                <label><%- fieldTitle %> <span>(<%- dateFormat[format] %>)</span></label>\
                <span class="icon-down-dir"></span>\
                <div class="fw-pulldown fw-left">\
                    <ul><% _.each(dateFormat, function(format_title, key) { %>\
                        <li>\
                            <span class="fw-pulldown-item<% if(key == format) { %> selected<% } %>"\
                                data-value="<%= key %>">\
                                <%- format_title %>\
                            </span>\
                        </li>\
                    <% }) %></ul>\
                </div>\
            </div>\
        </th>\
        <%= inputForm %>\
    </tr>');

/** A template for each input field row of the bibliography item edit form. */
var inputTrTemplate = exports.inputTrTemplate = _.template('\
    <tr>\
        <th><h4 class="fw-tablerow-title"><%- gettext(fieldTitle) %></h4></th>\
        <%= inputForm %>\
    </tr>');

/** A template for either-or fields in the bibliography item edit form. */
var eitherorTrTemplate = exports.eitherorTrTemplate = _.template('<tr class="eitheror">\
        <th>\
            <div class="fw-bib-field-pulldown fw-bib-form-pulldown">\
                <label><%- selected.title %></label>\
                <span class="icon-down-dir"></span>\
                <div class="fw-pulldown field-names fw-left">\
                    <ul><% _.each(fields, function(field) { %>\
                        <li>\
                            <span class="fw-pulldown-item<% if(selected.id == field.id) { %> selected<% } %>"\
                                data-value="<%= field.name %>">\
                                <%- field.title %>\
                            </span>\
                        </li>\
                    <% }) %></ul>\
                </div>\
            </div>\
        </th>\
        <%= inputForm %>\
    </tr>');

/** A template for date input fields in the bibliography item edit form. */
var dateinputTemplate = exports.dateinputTemplate = _.template('<td class="entryForm fw-date-form" data-type="date" data-field-name="<%- fieldName %>">\
        <table class="fw-bib-date-table"><tr>\
            <td class="month-td"><input <%= monthSelect %> placeholder="Month" /></td>\
            <td class="day-td"><input <%= dateSelect %> placeholder="Day" /></td>\
            <td class="year-td"><input <%= yearSelect %> placeholder="Year" /></td>\
            <td class="fw-date-separator">-</td>\
            <td class="month-td2"><input <%= month2Select %> placeholder="Month" /></td>\
            <td class="day-td2"><input <%= date2Select %> placeholder="Day" /></td>\
            <td class="year-td2"><input <%= year2Select %> placeholder="Year" /></td>\
        </tr></table>\
    </td>');

/** A template for each item (year, date, month) of a date input fields in the bibliography item edit form. */
var dateselectTemplate = exports.dateselectTemplate = _.template('type="text" name="<%- formname %>" class="select-<%- type %>" value="<%- value %>"');

var listInputTemplate = exports.listInputTemplate = _.template('<td class="entryForm" data-type="<%- filedType %>" data-field-name="<%- fieldName %>">\
        <%= inputForm %>\
    </td>');

/** A template for name list fields (authors, editors) in the bibliography item edit form. */
var namelistInputTemplate = exports.namelistInputTemplate = _.template('<% _.each(fieldValue, function(val) { %>\
        <div class="fw-list-input">\
            <input type="text" class="fw-name-input fw-first" value="<%= val.first %>" placeholder="' + gettext('First Name') + '" />\
            <input type="text" class="fw-name-input fw-last" value="<%= val.last %>" placeholder="' + gettext('Last Name') + '" />\
            <span class="fw-add-input icon-addremove"></span>\
        </div>\
    <% }) %>');

/** A template for name list field items in the bibliography item edit form. */
var literallistInputTemplate = exports.literallistInputTemplate = _.template('<% _.each(fieldValue, function(val) { %>\
        <div class="fw-list-input"><input class="fw-input" type="text" value="<%= val %>" /><span class="fw-add-input icon-addremove"></span></div>\
    <% }) %>');

/** A template for selection fields in the bibliography item edit form. */
var selectTemplate = exports.selectTemplate = _.template('<td>\
        <div class="fw-bib-select-pulldown fw-button fw-white">\
            <label><% if("" == fieldValue) { %><%- fieldDefault.title %><% } else { %><%- fieldTitle %><% } %></label>\
            <span class="icon-down-dir"></span>\
            <div class="fw-pulldown fw-left">\
                <ul class="entryForm" data-field-name="<%- fieldName %>" data-type="fieldkeys" id="id_<%- fieldName %>">\
                    <% if("" != fieldDefault.value) { %>\
                        <li><span\
                            class="fw-pulldown-item<% if("" == fieldValue || fieldDefault.value == fieldValue) { %> selected<% } %>"\
                            data-value="<%- fieldDefault.value %>">\
                            <%- fieldDefault.title %>\
                        </span></li>\
                    <% } %>\
                    <% _.each(options, function(option) { %>\
                        <li><span\
                            class="fw-pulldown-item<% if(option.value == fieldValue) { %> selected<% } %>"\
                            data-value="<%- option.value %>">\
                            <%- option.title %>\
                        </span></li>\
                    <% }) %>\
                </ul>\
            </div>\
        </div>\
    </td>');

/** A template for each input field of the bibliography item edit form. */
var inputTemplate = exports.inputTemplate = _.template('<td>\
        <input class="entryForm" type="<%- fieldType %>" name="<%- fieldName %>" id="id_<%- fieldName %>" value="<%- fieldValue %>" />\
    </td>');

},{}],5:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibliographyOverview = undefined;

var _tools = require("../tools");

var _form = require("../form/form");

var _templates = require("./templates");

var _database = require("../database");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BibliographyOverview = exports.BibliographyOverview = (function () {
    function BibliographyOverview() {
        _classCallCheck(this, BibliographyOverview);

        this.getBibDB();
        this.bind();
    }

    /* load data from the bibliography */

    _createClass(BibliographyOverview, [{
        key: "getBibDB",
        value: function getBibDB(callback) {
            var that = this;
            var docOwnerId = 0; // 0 = current user.
            this.db = new _database.BibliographyDB(docOwnerId, true, false, false);

            this.db.getBibDB(function (bibPks, bibCats) {

                that.addBibCategoryList(bibCats);
                that.addBibList(bibPks);
                if (callback) {
                    callback();
                }
            });
        }

        /** Adds a list of bibliography categories to current list of bibliography categories.
         * @function addBibCategoryList
         * @param newBibCategories The new categories which will be added to the existing ones.
         */

    }, {
        key: "addBibCategoryList",
        value: function addBibCategoryList(newBibCategories) {
            for (var i = 0; i < newBibCategories.length; i++) {
                this.appendToBibCatList(newBibCategories[i]);
            }
        }

        /** Add an item to the HTML list of bibliography categories.
         * @function appendToBibCatList
         * @param bCat Category to be appended.
         */

    }, {
        key: "appendToBibCatList",
        value: function appendToBibCatList(bCat) {
            jQuery('#bib-category-list').append((0, _templates.bibliographyCategoryListItemTemplate)({
                'bCat': bCat
            }));
        }

        /** This takes a list of new bib entries and adds them to BibDB and the bibliography table
         * @function addBibList
         */

    }, {
        key: "addBibList",
        value: function addBibList(pks) {
            //if (jQuery('#bibliography').length > 0) {
            this.stopBibliographyTable();
            for (var i = 0; i < pks.length; i++) {
                this.appendToBibTable(pks[i], this.db.bibDB[pks[i]]);
            }
            this.startBibliographyTable();
            //}
        }

        /** Opens a dialog for editing categories.
         * @function createCategoryDialog
         */

    }, {
        key: "createCategoryDialog",
        value: function createCategoryDialog() {
            var that = this;
            var dialogHeader = gettext('Edit Categories');
            var dialogBody = (0, _templates.editCategoriesTemplate)({
                'dialogHeader': dialogHeader,
                'categories': (0, _templates.categoryFormsTemplate)({
                    'categories': this.db.bibCats
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
                    if ('undefined' == typeof this_id) this_id = 0;
                    if ('' != this_val) {
                        new_cat.ids.push(this_id);
                        new_cat.titles.push(this_val);
                    } else if ('' == this_val && 0 < this_id) {
                        that.deleted_cat[that.deleted_cat.length] = this_id;
                    }
                });
                that.db.deleteCategory(that.deleted_cat);
                that.createCategory(new_cat);
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
                create: function create() {
                    var $the_dialog = jQuery(this).closest(".ui-dialog");
                    $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                    $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
                },
                close: function close() {
                    jQuery("#editCategories").dialog('destroy').remove();
                }
            });

            this.deleted_cat = [];
            (0, _tools.addRemoveListHandler)();
        }

        /** Dialog to confirm deletion of bibliography items.
         * @function deleteBibEntryDialog
              * @param ids Ids of items that are to be deleted.
         */

    }, {
        key: "deleteBibEntryDialog",
        value: function deleteBibEntryDialog(ids) {
            var that = this;
            jQuery('body').append('<div id="confirmdeletion" title="' + gettext('Confirm deletion') + '"><p>' + gettext('Delete the bibliography item(s)') + '?</p></div>');
            diaButtons = {};
            diaButtons[gettext('Delete')] = function () {
                that.deleteBibEntry(ids);
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
                create: function create() {
                    var $the_dialog = jQuery(this).closest(".ui-dialog");
                    $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                    $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
                },
                close: function close() {
                    jQuery("#confirmdeletion").dialog('destroy').remove();
                }
            });
        }

        /** Add or update an item in the bibliography table (HTML).
         * @function appendToBibTable
              * @param pk The pk specifying the bibliography item.
         * @param bib_info An object with the current information about the bibliography item.
         */

    }, {
        key: "appendToBibTable",
        value: function appendToBibTable(pk, bib_info) {
            var allowEdit = undefined;
            var $tr = jQuery('#Entry_' + pk);
            //reform author field
            var bibauthor = bib_info.author || bib_info.editor;
            // If neither author nor editor were registered, use an empty string instead of nothing.
            // TODO: Such entries should likely not be accepted by the importer.
            if (typeof bibauthor === 'undefined') bibauthor = '';
            var bibauthors = bibauthor.split('} and {');
            //if there are more authors, add "and others" behind.
            var and_others = 1 < bibauthors.length ? gettext(' and others') : '';
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

            if (typeof theEditor === 'undefined' || theEditor.docInfo.is_owner) {
                allowEdit = true;
            } else {
                allowEdit = false;
            }

            if (0 < $tr.size()) {
                //if the entry exists, update
                $tr.replaceWith((0, _templates.bibtableTemplate)({
                    'id': pk,
                    'cats': bib_info.entry_cat.split(','),
                    'type': bib_info.entry_type,
                    'typetitle': BibEntryTypes[bib_info.entry_type]['title'],
                    'title': bib_info.title.replace(/[{}]/g, ''),
                    'author': bibauthor,
                    'published': (0, _tools.formatDateString)(bib_info.date),
                    'allowEdit': allowEdit
                }));
            } else {
                //if this is the new entry, append
                jQuery('#bibliography > tbody').append((0, _templates.bibtableTemplate)({
                    'id': pk,
                    'cats': bib_info.entry_cat.split(','),
                    'type': bib_info.entry_type,
                    'typetitle': BibEntryTypes[bib_info.entry_type]['title'],
                    'title': bib_info.title.replace(/[{}]/g, ''),
                    'author': bibauthor,
                    'published': (0, _tools.formatDateString)(bib_info.date),
                    'allowEdit': allowEdit
                }));
            }
        }

        /** Stop the interactive parts of the bibliography table.
         * @function stopBibliographyTable
              */

    }, {
        key: "stopBibliographyTable",
        value: function stopBibliographyTable() {
            jQuery('#bibliography').dataTable().fnDestroy();
        }
        /** Start the interactive parts of the bibliography table.
         * @function startBibliographyTable
              */

    }, {
        key: "startBibliographyTable",
        value: function startBibliographyTable() {
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
                }]
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
        }
        /** Bind the init function to jQuery(document).ready.
         * @function bind
         */

    }, {
        key: "bind",
        value: function bind() {
            var that = this;
            jQuery(document).ready(function () {
                that.bindEvents();
            });
        }

        /** Initialize the bibliography table and bind interactive parts.
         * @function init
              */

    }, {
        key: "bindEvents",
        value: function bindEvents() {
            var that = this;
            jQuery(document).on('click', '.delete-bib', function () {
                var BookId = jQuery(this).attr('data-id');
                that.deleteBibEntryDialog([BookId]);
            });
            jQuery('#edit-category').bind('click', function () {
                that.createCategoryDialog();
            });

            jQuery(document).on('click', '.edit-bib', function () {
                var eID = jQuery(this).attr('data-id');
                var eType = jQuery(this).attr('data-type');
                new _form.BibEntryForm(eID, eType, that.db.bibDB, that.db.bibCats, function (bibEntryData) {
                    that.createBibEntry(bibEntryData);
                });
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
                if (jQuery(this).prop("checked")) new_bool = true;
                jQuery('.entry-select').each(function () {
                    this.checked = new_bool;
                });
            });

            //open dropdown for selecting action
            $.addDropdownBox(jQuery('#select-action-dropdown'), jQuery('#action-selection-pulldown'));

            //import a bib file
            jQuery('.import-bib').bind('click', function () {
                new BibLatexImporter(function (bibs) {
                    that.addBibList(bibs);
                });
            });

            //submit entry actions
            jQuery('#action-selection-pulldown li > span').bind('mousedown', function () {
                var action_name = jQuery(this).attr('data-action'),
                    ids = [];

                if ('' == action_name || 'undefined' == typeof action_name) {
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
                        that.deleteBibEntryDialog(ids);
                        break;
                    case 'export':
                        new BibLatexExporter(ids, window.BibDB, true);
                        break;
                }
            });
        }
    }, {
        key: "createCategory",
        value: function createCategory(cats) {
            var that = this;
            this.db.createCategory(cats, function (bibCats) {
                jQuery('#bib-category-list li').not(':first').remove();
                that.addBibCategoryList(bibCats);
            });
        }
    }, {
        key: "deleteBibEntry",
        value: function deleteBibEntry(ids) {
            var that = this;
            this.db.deleteBibEntry(ids, function (ids) {
                that.stopBibliographyTable();
                var elements_id = '#Entry_' + ids.join(', #Entry_');
                jQuery(elements_id).detach();
                that.startBibliographyTable();
            });
        }
    }, {
        key: "createBibEntry",
        value: function createBibEntry(bibEntryData) {
            var that = this;
            this.db.createBibEntry(bibEntryData, function (newBibPks) {
                that.addBibList(newBibPks);
            });
        }
    }]);

    return BibliographyOverview;
})();

},{"../database":2,"../form/form":3,"../tools":7,"./templates":6}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template for the editing of bibliography categories list. */
var editCategoriesTemplate = exports.editCategoriesTemplate = _.template('\
    <div id="editCategories" title="<%- dialogHeader %>">\
        <table id="editCategoryList" class="fw-dialog-table"><tbody><%= categories %></tbody></table>\
    </div>');

/** A template for each category in the category list edit of the bibliography categories list. */
var categoryFormsTemplate = exports.categoryFormsTemplate = _.template('\
    <% _.each(categories, function(cat) { %>\
    <tr id="categoryTr_<%- cat.id %>" class="fw-list-input">\
        <td>\
            <input type="text" class="category-form" id="categoryTitle_<%- cat.id %>" value="<%= cat.category_title %>" data-id="<%- cat.id %>" />\
            <span class="fw-add-input icon-addremove"></span>\
        </td>\
    </tr>\
    <% }) %>\
    <tr class="fw-list-input">\
        <td>\
            <input type="text" class="category-form" />\
            <span class="fw-add-input icon-addremove"></span>\
        </td>\
    </tr>');

/* A template for the overview list of bibliography items. */
var bibtableTemplate = exports.bibtableTemplate = _.template('\
    <tr id="Entry_<%- id %>" class="<% _.each(cats, function(cat) { %>cat_<%- cat %> <% }) %>">\
        <td width="30">\
            <span class="fw-inline"><input type="checkbox" class="entry-select" data-id="<%- id %>" /></span>\
        </td>\
        <td width="235">\
            <span class="fw-document-table-title fw-inline">\
                <i class="icon-book"></i>\
                <% if ( allowEdit ){ %>\
                    <span class="edit-bib fw-link-text fw-searchable" data-id="<%- id %>" data-type="<%- type %>">\
                        <% if (title.length>0) { %>\
                            <%- title %>\
                        <% } else { %>\
                            <i>' + gettext('Untitled') + '</i>\
                        <% } %>\
                    </span>\
                <% } else { %>\
                    <span class="fw-searchable">\
                        <% if (title.length>0) { %>\
                            <%- title %>\
                        <% } else { %>\
                            <i>' + gettext('Untitled') + '</i>\
                        <% } %>\
                    </span>\
                <% } %>\
            </span>\
        </td>\
        <td width="170" class="type"><span class="fw-inline"><%- gettext(typetitle) %></span></td>\
        <td width="175" class="author"><span class="fw-inline fw-searchable"><%- author %></span></td>\
        <td width="100" class="publised"><span class="fw-inline"><%- published %></span></td>\
        <td width="50" align="center">\
            <% if ( allowEdit ){ %>\
                <span class="delete-bib fw-inline fw-link-text" data-id="<%- id %>" data-title="<%= title %>">\
                    <i class="icon-trash"></i>\
                </span>\
            <% } %>\
        </td>\
    </tr>');

/** A template of a bibliography category list item. */
var bibliographyCategoryListItemTemplate = exports.bibliographyCategoryListItemTemplate = _.template('\
    <li>\
        <span class="fw-pulldown-item" data-id="<%- bCat.id %>">\
            <%- bCat.category_title %>\
        </span>\
    </li>\
');

},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var formatDateString = exports.formatDateString = function formatDateString(dateString) {
    // This mirrors the formatting of the date as returned by Python in bibliography/models.py
    if ('undefined' == typeof dateString) return '';
    var dates = dateString.split('/');
    var newValue = [];
    for (var x = 0; x < dates.length; x++) {
        var dateParts = dates[x].split('-');
        newValue.push('');
        for (var i = 0; i < dateParts.length; i++) {
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

/** Add and remove name list field.
 * @function addRemoveListHandler
 */
var addRemoveListHandler = exports.addRemoveListHandler = function addRemoveListHandler() {
    jQuery('.fw-add-input').bind('click', function () {
        var $parent = jQuery(this).parents('.fw-list-input');
        if (0 == $parent.next().size()) {
            var $parent_clone = $parent.clone(true);
            $parent_clone.find('input, select').val('').removeAttr('data-id');
            $parent_clone.insertAfter($parent);
        } else {
            var $the_prev = jQuery(this).prev();
            if ($the_prev.hasClass("category-form")) {
                var this_id = $the_prev.attr('data-id');
                if ('undefined' != typeof this_id) {
                    // TODO: Figure out what this was about
                    //        bibliographyHelpers.deleted_cat[bibliographyHelpers.deleted_cat // KEEP
                    //                .length] = this_id
                }
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

/** Dictionary of date selection options for bibliography item editor (localized).
 */
var dateFormat = exports.dateFormat = {
    'y': gettext('Year'),
    'y/y': gettext('Year - Year'),
    'my': gettext('Month/Year'),
    'my/my': gettext('M/Y - M/Y'),
    'mdy': gettext('Month/Day/Year'),
    'mdy/mdy': gettext('M/D/Y - M/D/Y')
};

},{}]},{},[1]);
