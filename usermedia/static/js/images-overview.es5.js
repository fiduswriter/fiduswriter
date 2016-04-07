/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit images-overview.es6.js and run ./es6-transpile.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* A class that holds information about images uploaded by the user. */

var ImageDB = exports.ImageDB = function () {
    function ImageDB(userId) {
        _classCallCheck(this, ImageDB);

        this.userId = userId;
        this.db = {};
        this.cats = [];
    }

    _createClass(ImageDB, [{
        key: 'getDB',
        value: function getDB(callback) {
            var that = this;
            this.db = {};
            this.cats = [];

            $.activateWait();

            $.ajax({
                url: '/usermedia/images/',
                data: {
                    'owner_id': this.userId
                },
                type: 'POST',
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {
                    that.cats = response.imageCategories;
                    var pks = [];
                    for (var i = 0; i < response.images.length; i++) {
                        response.images[i].image = response.images[i].image.split('?')[0];
                        that.db[response.images[i]['pk']] = response.images[i];
                        pks.push(response.images[i]['pk']);
                    }
                    if (callback) {
                        callback(pks);
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
    }, {
        key: 'createImage',
        value: function createImage(postData, callback) {
            var that = this;
            $.activateWait();
            $.ajax({
                url: '/usermedia/save/',
                data: postData,
                type: 'POST',
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {
                    if (that.displayCreateImageError(response.errormsg)) {
                        that.db[response.values.pk] = response.values;
                        $.addAlert('success', gettext('The image has been uploaded'));
                        callback(response.values.pk);
                    } else {
                        $.addAlert('error', gettext('Some errors are found. Please examine the form.'));
                    }
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', jqXHR.responseText);
                },
                complete: function complete() {
                    $.deactivateWait();
                },
                cache: false,
                contentType: false,
                processData: false
            });
        }
    }, {
        key: 'displayCreateImageError',
        value: function displayCreateImageError(errors) {
            var noError = true;
            for (var e_key in errors) {
                e_msg = '<div class="warning">' + errors[e_key] + '</div>';
                if ('error' == e_key) {
                    jQuery('#createimage').prepend(e_msg);
                } else {
                    jQuery('#id_' + e_key).after(e_msg);
                }
                noError = false;
            }
            return noError;
        }
    }]);

    return ImageDB;
}();

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ImageOverviewCategories = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templates = require('./templates');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ImageOverviewCategories = exports.ImageOverviewCategories = function () {
    function ImageOverviewCategories(imageOverview) {
        _classCallCheck(this, ImageOverviewCategories);

        this.imageOverview = imageOverview;
        imageOverview.mod.categories = this;
    }
    //save changes or create a new category


    _createClass(ImageOverviewCategories, [{
        key: 'createCategory',
        value: function createCategory(cats) {
            var post_data = {
                'ids[]': cats.ids,
                'titles[]': cats.titles
            },
                that = this;
            $.activateWait();
            $.ajax({
                url: '/usermedia/save_category/',
                data: post_data,
                type: 'POST',
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {
                    if (jqXHR.status == 201) {
                        // TODO: Why do we reload the entire list when one new category is created?
                        imageCategories = [];
                        jQuery('#image-category-list li').not(':first').remove();
                        that.addImageCategoryList(response.entries);

                        $.addAlert('success', gettext('The categories have been updated'));
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
    }, {
        key: 'addImageCategoryList',
        value: function addImageCategoryList(newimageCategories) {
            //imageCategories = imageCategories.concat(newimageCategories)
            for (var i = 0; i < newimageCategories.length; i++) {
                this.appendToImageCatList(newimageCategories[i]);
            }
        }
    }, {
        key: 'appendToImageCatList',
        value: function appendToImageCatList(iCat) {
            jQuery('#image-category-list').append((0, _templates.usermediaCategoryListItemTemplate)({
                'iCat': iCat
            }));
        }

        //delete an image category

    }, {
        key: 'deleteCategory',
        value: function deleteCategory(ids) {
            var post_data = {
                'ids[]': ids
            };
            $.ajax({
                url: '/usermedia/delete_category/',
                data: post_data,
                type: 'POST',
                dataType: 'json'
            });
        }

        //open a dialog for editing categories

    }, {
        key: 'createCategoryDialog',
        value: function createCategoryDialog() {
            var that = this;
            var dialogHeader = gettext('Edit Categories');
            var dialogBody = (0, _templates.usermediaEditcategoriesTemplate)({
                'dialogHeader': dialogHeader,
                'categories': tmpUsermediaCategoryforms({
                    'categories': imageCategories
                })
            });
            jQuery('body').append(dialogBody);
            var diaButtons = {};
            diaButtons[gettext('Submit')] = function () {
                var new_cat = {
                    'ids': [],
                    'titles': []
                };
                var deletedCats = [];
                jQuery('#editCategories .category-form').each(function () {
                    var this_val = jQuery.trim(jQuery(this).val());
                    var this_id = jQuery(this).attr('data-id');
                    if ('undefined' == typeof this_id) this_id = 0;
                    if ('' != this_val) {
                        new_cat.ids.push(this_id);
                        new_cat.titles.push(this_val);
                    } else if ('' == this_val && 0 < this_id) {
                        deletedCats.push(this_id);
                    }
                });
                that.deleteCategory(deletedCats);
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
            this.addRemoveListHandler();
        }
    }, {
        key: 'addRemoveListHandler',
        value: function addRemoveListHandler() {
            //add and remove name list field
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
                        if ('undefined' != typeof this_id) deleted_cat[deleted_cat.length] = this_id;
                    }
                    $parent.remove();
                }
            });
            jQuery('.dk').dropkick();
        }
    }]);

    return ImageOverviewCategories;
}();

},{"./templates":4}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ImageOverview = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _uploadDialog = require("../upload-dialog/upload-dialog");

var _database = require("../database");

var _categories = require("./categories");

var _templates = require("./templates");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Helper functions for user added images/SVGs.*/

var ImageOverview = exports.ImageOverview = function () {
    function ImageOverview() {
        _classCallCheck(this, ImageOverview);

        this.mod = {};
        new _categories.ImageOverviewCategories(this);
        this.init();
    }

    //delete image


    _createClass(ImageOverview, [{
        key: "deleteImage",
        value: function deleteImage(ids) {
            var that = this;
            for (var i = 0; i < ids.length; i++) {
                ids[i] = parseInt(ids[i]);
            }
            var post_data = {
                'ids[]': ids
            };
            $.activateWait();
            $.ajax({
                url: '/usermedia/delete/',
                data: post_data,
                type: 'POST',
                success: function success(response, textStatus, jqXHR) {

                    that.stopUsermediaTable();
                    var len = ids.length;
                    for (var _i = 0; _i < len; _i++) {
                        delete that.imageDB[ids[_i]];
                    }
                    var elements_id = '#Image_' + ids.join(', #Image_');
                    jQuery(elements_id).detach();
                    that.startUsermediaTable();
                    $.addAlert('success', gettext('The image(s) have been deleted'));
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', jqXHR.responseText);
                },
                complete: function complete() {
                    $.deactivateWait();
                }
            });
        }
    }, {
        key: "deleteImageDialog",
        value: function deleteImageDialog(ids) {
            var that = this;
            jQuery('body').append('<div id="confirmdeletion" title="' + gettext('Confirm deletion') + '"><p>' + gettext('Delete the image(s)') + '?</p></div>');
            var diaButtons = {};
            diaButtons[gettext('Delete')] = function () {
                that.deleteImage(ids);
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
    }, {
        key: "addImageDB",
        value: function addImageDB(imagePks) {
            for (var i = 0; i < imagePks.length; i++) {
                this.appendToImageTable(imagePks[i]);
            }
            this.startUsermediaTable();
        }
    }, {
        key: "appendToImageTable",
        value: function appendToImageTable(pk) {
            var image_info = this.imageDB.db[pk];
            var $tr = jQuery('#Image_' + pk),
                file_type = image_info.file_type.split('/');

            if (1 < file_type.length) {
                file_type = file_type[1].toUpperCase();
            } else {
                file_type = file_type[0].toUpperCase();
            }

            if (0 < $tr.size()) {
                //if the image entry exists, update
                $tr.replaceWith((0, _templates.usermediaTableTemplate)({
                    'pk': pk,
                    'cats': image_info.cats,
                    'file_type': file_type,
                    'title': image_info.title,
                    'thumbnail': image_info.thumbnail,
                    'image': image_info.image,
                    'height': image_info.height,
                    'width': image_info.width,
                    'added': image_info.added
                }));
            } else {
                //if this is the new image, append
                jQuery('#imagelist > tbody').append((0, _templates.usermediaTableTemplate)({
                    'pk': pk,
                    'cats': image_info.cats,
                    'file_type': file_type,
                    'title': image_info.title,
                    'thumbnail': image_info.thumbnail,
                    'image': image_info.image,
                    'height': image_info.height,
                    'width': image_info.width,
                    'added': image_info.added
                }));
            }
        }
    }, {
        key: "getImageDB",
        value: function getImageDB(callback) {
            var that = this;

            var imageGetter = new _database.ImageDB(0);
            imageGetter.getDB(function (pks) {
                that.imageDB = imageGetter;
                that.mod.categories.addImageCategoryList(imageGetter.cats);

                that.addImageDB(pks);
                if (callback) {
                    callback();
                }
            });
        }
    }, {
        key: "stopUsermediaTable",
        value: function stopUsermediaTable() {
            jQuery('#imagelist').dataTable().fnDestroy();
        }
    }, {
        key: "startUsermediaTable",
        value: function startUsermediaTable() {
            /* The sortable table seems not to have an option to accept new data
            added to the DOM. Instead we destroy and recreate it.
            */

            jQuery('#imagelist').dataTable({
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
                    "aTargets": [0, 2, 4]
                }]
            });
            jQuery('#imagelist_filter input').attr('placeholder', gettext('Search for Filename'));

            jQuery('#imagelist_filter input').unbind('focus, blur');
            jQuery('#imagelist_filter input').bind('focus', function () {
                jQuery(this).parent().addClass('focus');
            });
            jQuery('#imagelist_filter input').bind('blur', function () {
                jQuery(this).parent().removeClass('focus');
            });

            var autocomplete_tags = [];
            jQuery('#imagelist .fw-searchable').each(function () {
                autocomplete_tags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''));
            });
            autocomplete_tags = _.uniq(autocomplete_tags);
            jQuery("#imagelist_filter input").autocomplete({
                source: autocomplete_tags
            });
        }
    }, {
        key: "bindEvents",
        value: function bindEvents() {
            var that = this;
            jQuery(document).on('click', '.delete-image', function () {
                var ImageId = jQuery(this).attr('data-id');
                that.deleteImageDialog([ImageId]);
            });

            jQuery(document).on('click', '.edit-image', function () {
                var iID = parseInt(jQuery(this).attr('data-id'));
                var iType = jQuery(this).attr('data-type');
                new _uploadDialog.ImageUploadDialog(that.imageDB, iID, 0, function (imageId) {
                    that.stopUsermediaTable();
                    that.appendToImageTable(imageId);
                    that.startUsermediaTable();
                });
            });
            jQuery('#edit-category').bind('click', that.mod.categories.createCategoryDialog);

            //open dropdown for image category
            $.addDropdownBox(jQuery('#image-category-btn'), jQuery('#image-category-pulldown'));
            jQuery(document).on('mousedown', '#image-category-pulldown li > span', function () {
                jQuery('#image-category-btn > label').html(jQuery(this).html());
                jQuery('#image-category').val(jQuery(this).attr('data-id'));
                jQuery('#image-category').trigger('change');
            });
            //filtering function for the list of images
            jQuery('#image-category').bind('change', function () {
                var cat_val = jQuery(this).val();
                if (0 == cat_val) {
                    jQuery('#imagelist > tbody > tr').show();
                } else {
                    jQuery('#imagelist > tbody > tr').hide();
                    jQuery('#imagelist > tbody > tr.cat_' + cat_val).show();
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
            //submit image actions
            jQuery('#action-selection-pulldown li > span').bind('mousedown', function () {
                var action_name = jQuery(this).attr('data-action'),
                    ids = [];
                if ('' == action_name || 'undefined' == typeof action_name) return;
                jQuery('.entry-select:checked').each(function () {
                    ids[ids.length] = jQuery(this).attr('data-id');
                });
                if (0 == ids.length) return;
                switch (action_name) {
                    case 'delete':
                        that.deleteImageDialog(ids);
                        break;
                }
            });
        }
    }, {
        key: "init",
        value: function init(callback) {
            this.bindEvents();
            this.getImageDB(callback);
        }
    }, {
        key: "bind",
        value: function bind() {
            var that = this;
            jQuery(document).ready(function () {
                that.init();
            });
        }
    }]);

    return ImageOverview;
}();

},{"../database":1,"../upload-dialog/upload-dialog":6,"./categories":2,"./templates":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template to edit image categories. */
var usermediaEditcategoriesTemplate = exports.usermediaEditcategoriesTemplate = _.template('\
    <div id="editCategories" title="<%- dialogHeader %>">\
        <table id="editCategoryList" class="fw-dialog-table"><tbody><%= categories %></tbody></table>\
    </div>');

/** A template for the image category edit form. */
var usermediaCategoryformsTemplate = exports.usermediaCategoryformsTemplate = _.template('\
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

/** A template for image overview list. */
var usermediaTableTemplate = exports.usermediaTableTemplate = _.template('\
                <tr id="Image_<%- pk %>" class="<% _.each(cats, function(cat) { %>cat_<%- cat %> <% }) %>">\
                    <td width="30">\
                        <span class="fw-inline">\
                            <input type="checkbox" class="entry-select" data-id="<%- pk %>">\
                        </span>\
                    </td>\
                    <td width="350" class="title">\
                        <span class="fw-usermedia-image">\
                            <img src="<% if(thumbnail) { %><%- thumbnail %><% } else { %><%- image %><% } %>">\
                        </span>\
                        <span class="fw-inline fw-usermedia-title">\
                            <span class="edit-image fw-link-text fw-searchable" data-id="<%- pk %>">\
                                <%- title %>\
                            </span>\
                            <span class="fw-usermedia-type"><%- file_type %></span>\
                        </span>\
                    </td>\
                    <td width="170" class="type ">\
                        <span class="fw-inline"><%- width %> x <%- height %></span>\
                    </td>\
                    <td width="170" class="file_type ">\
                        <span class="fw-inline"><%= jQuery.localizeDate(added, true) %></span>\
                    </td>\
                    <td width="50" align="center">\
                        <span class="delete-image fw-inline fw-link-text" data-id="<%- pk %>" data-title="<%- title %>">\
                            <i class="icon-trash"></i>\
                        </span>\
                    </td>\
                </tr>');

/* A template for each image category list item */
var usermediaCategoryListItemTemplate = exports.usermediaCategoryListItemTemplate = _.template('\
    <li>\
        <span class="fw-pulldown-item" data-id="<%- iCat.id %>">\
            <%- iCat.category_title %>\
        </span>\
    </li>');

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/* A template for the form for the image upload dialog. */
var usermediaUploadTemplate = exports.usermediaUploadTemplate = _.template('<div id="uploadimage" class="fw-media-uploader" title="<%- action %>">\
    <form action="#" method="post" class="usermediaUploadForm">\
        <div>\
            <input name="title" class="fw-media-title fw-media-form" type="text" placeholder="' + gettext('Insert a title') + '" value="<%- title %>" />\
            <button type="button" class="fw-media-select-button fw-button fw-light">' + gettext('Select a file') + '</button>\
            <input name="image" type="file" class="fw-media-file-input fw-media-form">\
        </div>\
        <div class="figure-preview"><div>\
            <% if(image) { %><img src="<%- image %>" /><% } %>\
        </div></div>\
        <%= categories %>\
    </form></div>');

/* A template for the image category selection of the image selection dialog. */
var usermediaUploadCategoryTemplate = exports.usermediaUploadCategoryTemplate = _.template('<% if(0 < categories.length) { %>\
        <div class="fw-media-category">\
            <div><%- fieldTitle %></div>\
            <% _.each(categories, function(cat) { %>\
                <label class="fw-checkable fw-checkable-label<%- cat.checked %>" for="imageCat<%- cat.id %>">\
                    <%- cat.category_title %>\
                </label>\
                <input class="fw-checkable-input fw-media-form entry-cat" type="checkbox"\
                    id="imageCat<%- cat.id %>" name="imageCat" value="<%- cat.id %>"<%- cat.checked %>>\
            <% }); %>\
        </div>\
    <% } %>');

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ImageUploadDialog = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _templates = require('./templates');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ImageUploadDialog = exports.ImageUploadDialog = function () {
    function ImageUploadDialog(imageDB, imageId, ownerId, callback) {
        _classCallCheck(this, ImageUploadDialog);

        this.imageDB = imageDB;
        this.imageId = imageId;
        this.ownerId = ownerId;
        this.callback = callback;
        this.createImageUploadDialog();
    }

    //open a dialog for uploading an image


    _createClass(ImageUploadDialog, [{
        key: 'createImageUploadDialog',
        value: function createImageUploadDialog() {
            var that = this;
            var title = void 0,
                imageCat = void 0,
                thumbnail = void 0,
                image = void 0,
                action = void 0,
                longAction = void 0;
            if (this.imageId) {
                title = this.imageDB.db[this.imageId].title;
                thumbnail = this.imageDB.db[this.imageId].thumbnail;
                image = this.imageDB.db[this.imageId].image;
                imageCat = this.imageDB.db[this.imageId].cats;
                action = gettext('Update');
                longAction = gettext('Update image');
            } else {
                this.imageId = 0;
                title = '';
                imageCat = [];
                thumbnail = false;
                image = false;
                action = gettext('Upload');
                longAction = gettext('Upload image');
            }

            var iCats = [];
            jQuery.each(this.imageDB.cats, function (i, iCat) {
                var len = iCats.length;
                iCats[len] = {
                    'id': iCat.id,
                    'category_title': iCat.category_title
                };
                if (0 <= jQuery.inArray(String(iCat.id), imageCat)) {
                    iCats[len].checked = ' checked';
                } else {
                    iCats[len].checked = '';
                }
            });

            jQuery('body').append((0, _templates.usermediaUploadTemplate)({
                'action': longAction,
                'title': title,
                'thumbnail': thumbnail,
                'image': image,
                'categories': (0, _templates.usermediaUploadCategoryTemplate)({
                    'categories': iCats,
                    'fieldTitle': gettext('Select categories')
                })
            }));
            var diaButtons = {};
            diaButtons[action] = function () {
                that.onCreateImageSubmitHandler();
            };
            diaButtons[gettext('Cancel')] = function () {
                jQuery(this).dialog('close');
            };
            jQuery("#uploadimage").dialog({
                resizable: false,
                height: 'auto',
                width: 'auto',
                modal: true,
                buttons: diaButtons,
                create: function create() {
                    var $the_dialog = jQuery(this).closest(".ui-dialog");
                    $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                    $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
                    that.setMediaUploadEvents(jQuery('#uploadimage'));
                },
                close: function close() {
                    jQuery("#uploadimage").dialog('destroy').remove();
                }
            });

            jQuery('.fw-checkable-label').bind('click', function () {
                $.setCheckableLabel(jQuery(this));
            });
        }

        //add image upload events

    }, {
        key: 'setMediaUploadEvents',
        value: function setMediaUploadEvents(wrapper) {
            var select_button = wrapper.find('.fw-media-select-button'),
                media_input = wrapper.find('.fw-media-file-input'),
                media_previewer = wrapper.find('.figure-preview > div');

            select_button.bind('click', function () {
                media_input.trigger('click');
            });

            media_input.bind('change', function () {
                var file = jQuery(this).prop('files')[0],
                    fr = new FileReader();

                fr.onload = function () {
                    media_previewer.html('<img src="' + fr.result + '" />');
                };
                fr.readAsDataURL(file);
            });
        }
    }, {
        key: 'onCreateImageSubmitHandler',
        value: function onCreateImageSubmitHandler() {
            //when submitted, the values in form elements will be restored
            var formValues = new FormData(),
                checkboxValues = {};

            formValues.append('id', this.imageId);

            if (this.ownerId) {
                formValues.append('owner_id', this.ownerId);
            }

            jQuery('.fw-media-form').each(function () {
                var $this = jQuery(this);
                var the_name = $this.attr('name') || $this.attr('data-field-name');
                var the_type = $this.attr('type') || $this.attr('data-type');
                var the_value = '';

                switch (the_type) {
                    case 'checkbox':
                        //if it is a checkbox, the value will be restored as an Array
                        if (undefined == checkboxValues[the_name]) checkboxValues[the_name] = [];
                        if ($this.prop("checked")) {
                            checkboxValues[the_name].push($this.val());
                        }
                        return;
                    case 'file':
                        the_value = $this.get(0).files[0];
                        break;
                    default:
                        the_value = $this.val();
                }

                formValues.append(the_name, the_value);
            });

            // Add the values for check boxes
            for (key in checkboxValues) {
                formValues.append(key, checkboxValues[key].join(','));
            }
            this.createImage(formValues);
        }
    }, {
        key: 'createImage',
        value: function createImage(imageData) {
            var that = this;
            this.imageDB.createImage(imageData, function (imageId) {
                jQuery("#uploadimage").dialog('close');
                that.imageId = imageId;
                that.callback(imageId);
            });
        }
    }]);

    return ImageUploadDialog;
}();

},{"./templates":5}],7:[function(require,module,exports){
"use strict";

var _overview = require("./es6_modules/images/overview/overview");

var theImageOverview = new _overview.ImageOverview();

window.theImageOverview = theImageOverview;

},{"./es6_modules/images/overview/overview":3}]},{},[7]);
