import {ImageUploadDialog} from "../upload-dialog/upload-dialog"
import {ImageDB} from "../database"
import {ImageOverviewCategories} from "./categories"

import {usermediaCategoryListItem, usermediaTableTemplate} from "./templates"
 /** Helper functions for user added images/SVGs.*/

export class ImageOverview {
    constructor() {
        this.mod = {}
        new ImageOverviewCategories(this)
        this.bind()
    }

    //delete image
    deleteImage(ids) {
        let that = this
        for (let i = 0; i < ids.length; i++) {
            ids[i] = parseInt(ids[i])
        }
        let post_data = {
            'ids[]': ids
        }
        $.activateWait()
        $.ajax({
            url: '/usermedia/delete/',
            data: post_data,
            type: 'POST',
            success: function (response, textStatus, jqXHR) {

                that.stopUsermediaTable()
                let len = ids.length
                for (let i = 0; i < len; i++) {
                    delete that.imageDB[ids[i]]
                }
                let elements_id = '#Image_' + ids.join(', #Image_')
                jQuery(elements_id).detach()
                that.startUsermediaTable()
                $.addAlert('success', gettext('The image(s) have been deleted'))
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                $.deactivateWait()
            }
        })
    }

    deleteImageDialog(ids) {
        let that = this
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
                'Confirm deletion') + '"><p>' + gettext(
                'Delete the image(s)') +
            '?</p></div>')
        let diaButtons = {}
        diaButtons[gettext('Delete')] = function () {
            that.deleteImage(ids)
            jQuery(this).dialog('close')
        }
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close')
        }
        jQuery("#confirmdeletion").dialog({
            resizable: false,
            height: 180,
            modal: true,
            buttons: diaButtons,
            create: function () {
                let $the_dialog = jQuery(this).closest(".ui-dialog")
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            },
            close: function () {
                jQuery("#confirmdeletion").dialog('destroy').remove()
            }
        })
    }

    addImageDB(imagePks) {
        for (let i = 0; i < imagePks.length; i++) {
            this.appendToImageTable(imagePks[i])
        }
        this.startUsermediaTable()


    }

    appendToImageTable(pk) {
        let image_info = this.imageDB.db[pk]
        let $tr = jQuery('#Image_' + pk),
            file_type = image_info.file_type.split('/')

        if(1 < file_type.length) {
            file_type = file_type[1].toUpperCase()
        } else {
            file_type = file_type[0].toUpperCase()
        }

        if (0 < $tr.size()) { //if the image entry exists, update
            $tr.replaceWith(usermediaTableTemplate({
                'pk': pk,
                'cats': image_info.cats,
                'file_type': file_type,
                'title': image_info.title,
                'thumbnail': image_info.thumbnail,
                'image': image_info.image,
                'height': image_info.height,
                'width': image_info.width,
                'added': image_info.added
            }))
        } else { //if this is the new image, append
            jQuery('#imagelist > tbody').append(usermediaTableTemplate({
                'pk': pk,
                'cats': image_info.cats,
                'file_type': file_type,
                'title': image_info.title,
                'thumbnail': image_info.thumbnail,
                'image': image_info.image,
                'height': image_info.height,
                'width': image_info.width,
                'added': image_info.added
            }))
        }
    }

    getImageDB(callback) {
        let that = this

        let imageGetter = new ImageDB(0)
        imageGetter.getDB(function(pks){
            that.imageDB = imageGetter
            that.mod.categories.addImageCategoryList(imageGetter.cats)

            that.addImageDB(pks)
            if (callback) {
                callback()
            }
        })

    }

    stopUsermediaTable() {
        jQuery('#imagelist').dataTable().fnDestroy()
    }

    startUsermediaTable() {
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
        })
        jQuery('#imagelist_filter input').attr('placeholder', gettext('Search for Filename'))

        jQuery('#imagelist_filter input').unbind('focus, blur')
        jQuery('#imagelist_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus')
        })
        jQuery('#imagelist_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus')
        })

        let autocomplete_tags = []
        jQuery('#imagelist .fw-searchable').each(function() {
            autocomplete_tags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocomplete_tags = _.uniq(autocomplete_tags)
        jQuery("#imagelist_filter input").autocomplete({
            source: autocomplete_tags
        })
    }



    bindEvents() {
        let that = this
        jQuery(document).on('click', '.delete-image', function () {
            let ImageId = jQuery(this).attr('data-id')
            that.deleteImageDialog([ImageId])
        })

        jQuery(document).on('click', '.edit-image', function () {
            let iID = parseInt(jQuery(this).attr('data-id'))
            let iType = jQuery(this).attr('data-type')
            new ImageUploadDialog(that.imageDB, iID, 0, function(imageId){
                that.stopUsermediaTable()
                that.appendToImageTable(imageId)
                that.startUsermediaTable()
            })

        })
        jQuery('#edit-category').bind('click', that.mod.categories.createCategoryDialog)
        //open dropdown for image category
        $.addDropdownBox(jQuery('#image-category-btn'), jQuery(
            '#image-category-pulldown'))
        jQuery(document).on('mousedown', '#image-category-pulldown li > span',
            function () {
                jQuery('#image-category-btn > label').html(jQuery(this).html())
                jQuery('#image-category').val(jQuery(this).attr('data-id'))
                jQuery('#image-category').trigger('change')
            })
        //filtering function for the list of images
        jQuery('#image-category').bind('change', function () {
            let cat_val = jQuery(this).val()
            if (0 == cat_val) {
                jQuery('#imagelist > tbody > tr').show()
            } else {
                jQuery('#imagelist > tbody > tr').hide()
                jQuery('#imagelist > tbody > tr.cat_' + cat_val).show()
            }
        })
        //select all entries
        jQuery('#select-all-entry').bind('change', function () {
            let new_bool = false
            if (jQuery(this).prop("checked"))
                new_bool = true
            jQuery('.entry-select').each(function () {
                this.checked = new_bool
            })
        })
        //open dropdown for selecting action
        $.addDropdownBox(jQuery('#select-action-dropdown'), jQuery(
            '#action-selection-pulldown'))
        //submit image actions
        jQuery('#action-selection-pulldown li > span').bind('mousedown', function () {
            let action_name = jQuery(this).attr('data-action'),
                ids = []
            if ('' == action_name || 'undefined' == typeof (action_name))
                return
            jQuery('.entry-select:checked').each(function () {
                ids[ids.length] = jQuery(this).attr('data-id')
            })
            if (0 == ids.length)
                return
            switch (action_name) {
            case 'delete':
                that.deleteImageDialog(ids)
                break
            }
        })
    }

    init(callback) {
        this.bindEvents()
        this.getImageDB(callback)
    }

    bind() {
        let that = this
        jQuery(document).ready(function () {
            that.init()
        })
    }

}
