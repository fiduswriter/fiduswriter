import {ImageUploadDialog} from "./es6_modules/images/upload-dialog/upload-dialog"
import {ImageDB} from "./es6_modules/images/database"
 /** Helper functions for user added images/SVGs.
  * @namespace usermediaHelpers
  */
    let usermediaHelpers = {}
    let theImageOverview = {}

    //save changes or create a new category
    usermediaHelpers.createCategory = function (cats) {
        var post_data = {
            'ids[]': cats.ids,
            'titles[]': cats.titles
        };
        $.activateWait();
        $.ajax({
            url: '/usermedia/save_category/',
            data: post_data,
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                if (jqXHR.status == 201) {
                    // TODO: Why do we reload the entire list when one new category is created?
                    imageCategories = [];
                    jQuery('#image-category-list li').not(':first').remove();
                    usermediaHelpers.addImageCategoryList(response.entries);

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

    //delete an image category

    usermediaHelpers.deleteCategory = function (ids) {
        var post_data = {
            'ids[]': ids
        };
        $.ajax({
            url: '/usermedia/delete_category/',
            data: post_data,
            type: 'POST',
            dataType: 'json'
        });
    };

    //open a dialog for editing categories
    usermediaHelpers.createCategoryDialog = function () {
        var dialogHeader = gettext('Edit Categories');
        var dialogBody = tmp_usermedia_editcategories({
            'dialogHeader': dialogHeader,
            'categories': tmp_usermedia_categoryforms({
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
            jQuery('#editCategories .category-form').each(function () {
                var this_val = jQuery.trim(jQuery(this).val());
                var this_id = jQuery(this).attr('data-id');
                if ('undefined' == typeof (this_id)) this_id = 0;
                if ('' != this_val) {
                    new_cat.ids.push(this_id);
                    new_cat.titles.push(this_val);
                } else if ('' == this_val && 0 < this_id) {
                    usermediaHelpers.deleted_cat[usermediaHelpers.deleted_cat
                        .length] =
                        this_id;
                }
            });
            usermediaHelpers.deleteCategory(usermediaHelpers.deleted_cat);
            usermediaHelpers.createCategory(new_cat);
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
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
            },
            close: function () {
                jQuery("#editCategories").dialog('destroy').remove();
            },
        });
        usermediaHelpers.deleted_cat = [];
        usermediaHelpers.addRemoveListHandler();

    };

    //delete image
    usermediaHelpers.deleteImage = function (ids) {
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
            success: function (response, textStatus, jqXHR) {

                usermediaHelpers.stopUsermediaTable();
                var i, len = ids.length,
                    j;
                for (i = 0; i < len; i++) {
                    delete ImageDB[ids[i]];
                }
                var elements_id = '#Image_' + ids.join(', #Image_');
                jQuery(elements_id).detach();
                usermediaHelpers.startUsermediaTable();
                $.addAlert('success', gettext('The image(s) have been deleted'));
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText);
            },
            complete: function () {
                $.deactivateWait();
            }
        });
    };

    usermediaHelpers.deleteImageDialog = function (ids) {
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
                'Confirm deletion') + '"><p>' + gettext(
                'Delete the image(s)') +
            '?</p></div>');
        diaButtons = {};
        diaButtons[gettext('Delete')] = function () {
            usermediaHelpers.deleteImage(ids);
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

    usermediaHelpers.addImageDB = function (imagePks) {

        for (let i = 0; i < imagePks.length; i++) {
            usermediaHelpers.appendToImageTable(imagePks[i], window.ImageDB[imagePks[i]]);
        }
        usermediaHelpers.startUsermediaTable();


    };

    usermediaHelpers.addImageCategoryList = function (newimageCategories) {
        var i;
        imageCategories = imageCategories.concat(newimageCategories);
        for (i = 0; i < newimageCategories.length; i++) {
            usermediaHelpers.appendToImageCatList(newimageCategories[i]);
        }
    };


    usermediaHelpers.addRemoveListHandler = function () {
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
                        deleted_cat[deleted_cat.length] = this_id;
                }
                $parent.remove();
            }
        });
        jQuery('.dk').dropkick();
    };

    usermediaHelpers.appendToImageCatList = function (iCat) {
        jQuery('#image-category-list').append(
            tmp_usermedia_category_list_item({
                'iCat': iCat
            }));

    };

    usermediaHelpers.appendToImageTable = function (pk, image_info) {
        var $tr = jQuery('#Image_' + pk),
            file_type = image_info.file_type.split('/');

        if(1 < file_type.length) {
            file_type = file_type[1].toUpperCase();
        } else {
            file_type = file_type[0].toUpperCase();
        }

        if (0 < $tr.size()) { //if the image entry exists, update
            $tr.replaceWith(tmp_usermedia_table({
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
        } else { //if this is the new image, append
            jQuery('#imagelist > tbody').append(tmp_usermedia_table({
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
    };

    usermediaHelpers.getImageDB = function (callback) {
        //Fill ImageDB

        let imageGetter = new ImageDB(0)
        imageGetter.getDB(function(pks){
            theImageOverview.imageDB = imageGetter
            window.ImageDB = imageGetter.db
            window.imageCategories = imageGetter.cats
            usermediaHelpers.addImageCategoryList(imageGetter.cats);

            usermediaHelpers.addImageDB(pks);
            if (callback) {
                callback();
            }
        })

    };

    usermediaHelpers.stopUsermediaTable = function () {
        jQuery('#imagelist').dataTable().fnDestroy();
    };

    usermediaHelpers.startUsermediaTable = function () {
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
            }],
        });
        jQuery('#imagelist_filter input').attr('placeholder', gettext('Search for Filename'));

        jQuery('#imagelist_filter input').unbind('focus, blur');
        jQuery('#imagelist_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus');
        });
        jQuery('#imagelist_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus');
        });

        var autocomplete_tags = [];
        jQuery('#imagelist .fw-searchable').each(function() {
            autocomplete_tags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''));
        });
        autocomplete_tags = _.uniq(autocomplete_tags);
        jQuery("#imagelist_filter input").autocomplete({
            source: autocomplete_tags
        });
    };



    usermediaHelpers.bindEvents = function () {

        jQuery(document).on('click', '.delete-image', function () {
            var ImageId = jQuery(this).attr('data-id');
            usermediaHelpers.deleteImageDialog([ImageId]);
        });

        jQuery(document).on('click', '.edit-image', function () {
            let iID = parseInt(jQuery(this).attr('data-id'))
            let iType = jQuery(this).attr('data-type')
            new ImageUploadDialog(theImageOverview.imageDB, iID, 0, function(imageId){
                usermediaHelpers.stopUsermediaTable();
                usermediaHelpers.appendToImageTable(imageId, theImageOverview.imageDB.db[imageId]);
                usermediaHelpers.startUsermediaTable();
            })

        });
        jQuery('#edit-category').bind('click', usermediaHelpers.createCategoryDialog);

        //open dropdown for image category
        $.addDropdownBox(jQuery('#image-category-btn'), jQuery(
            '#image-category-pulldown'));
        jQuery(document).on('mousedown', '#image-category-pulldown li > span',
            function () {
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
            if (jQuery(this).prop("checked"))
                new_bool = true;
            jQuery('.entry-select').each(function () {
                this.checked = new_bool
            });
        });
        //open dropdown for selecting action
        $.addDropdownBox(jQuery('#select-action-dropdown'), jQuery(
            '#action-selection-pulldown'));
        //submit image actions
        jQuery('#action-selection-pulldown li > span').bind('mousedown', function () {
            var action_name = jQuery(this).attr('data-action'),
                ids = [];
            if ('' == action_name || 'undefined' == typeof (action_name))
                return;
            jQuery('.entry-select:checked').each(function () {
                ids[ids.length] = jQuery(this).attr('data-id');
            });
            if (0 == ids.length)
                return;
            switch (action_name) {
            case 'delete':
                usermediaHelpers.deleteImageDialog(ids);
                break;
            }
        });
    };

    usermediaHelpers.init = function(callback) {
        usermediaHelpers.bindEvents();
        usermediaHelpers.getImageDB(callback);
    };

    usermediaHelpers.bind = function () {
        jQuery(document).ready(function () {
            usermediaHelpers.init();

        });
    };
    window.usermediaHelpers = usermediaHelpers;
