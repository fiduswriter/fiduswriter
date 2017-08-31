import {ImageUploadDialog} from "../upload-dialog"
import {ImageDB} from "../database"
import {ImageOverviewCategories} from "./categories"
import {addDropdownBox, activateWait, deactivateWait, addAlert, csrfToken} from "../../common"
import {Menu} from "../../menu"
import {usermediaCategoryListItem, usermediaTableTemplate} from "./templates"
import * as plugins from "../../plugins/images-overview"
 /** Helper functions for user added images/SVGs.*/

export class ImageOverview {
    constructor() {
        this.mod = {}
        new ImageOverviewCategories(this)
        new Menu("images")
        this.bind()
    }

    activatePlugins() {
        // Add plugins
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin](this)
                this.plugins[plugin].init()
            }
        })
    }

    //delete image
    deleteImage(ids) {
        for (let i = 0; i < ids.length; i++) {
            ids[i] = parseInt(ids[i])
        }
        let postData = {
            'ids[]': ids
        }
        activateWait()
        jQuery.ajax({
            url: '/usermedia/delete/',
            data: postData,
            type: 'POST',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: (response, textStatus, jqXHR) => {
                this.stopUsermediaTable()
                let len = ids.length
                for (let i = 0; i < len; i++) {
                    delete this.imageDB[ids[i]]
                }
                let elementsId = '#Image_' + ids.join(', #Image_')
                jQuery(elementsId).detach()
                this.startUsermediaTable()
                addAlert('success', gettext('The image(s) have been deleted'))
            },
            error: function (jqXHR, textStatus, errorThrown) {
                addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                deactivateWait()
            }
        })
    }

    deleteImageDialog(ids) {
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
                'Confirm deletion') + '"><p>' + gettext(
                'Delete the image(s)') +
            '?</p></div>')
        let diaButtons = {}
        let that = this
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
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
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

    appendToImageTable(id) {
        let imageInfo = this.imageDB.db[id]
        let $tr = jQuery(`#Image_${id}`)
        let fileType = imageInfo.file_type.split('/')

        if(1 < fileType.length) {
            fileType = fileType[1].toUpperCase()
        } else {
            fileType = fileType[0].toUpperCase()
        }

        if (0 < $tr.length) { //if the image entry exists, update
            $tr.replaceWith(usermediaTableTemplate({
                id,
                'cats': imageInfo.cats,
                fileType,
                'title': imageInfo.title,
                'thumbnail': imageInfo.thumbnail,
                'image': imageInfo.image,
                'height': imageInfo.height,
                'width': imageInfo.width,
                'added': imageInfo.added
            }))
        } else { //if this is the new image, append
            jQuery('#imagelist > tbody').append(usermediaTableTemplate({
                id,
                'cats': imageInfo.cats,
                fileType,
                'title': imageInfo.title,
                'thumbnail': imageInfo.thumbnail,
                'image': imageInfo.image,
                'height': imageInfo.height,
                'width': imageInfo.width,
                'added': imageInfo.added
            }))
        }
    }

    getImageDB() {
        let imageGetter = new ImageDB(0)
        imageGetter.getDB().then(ids => {
            this.imageDB = imageGetter
            this.mod.categories.addImageCategoryList(imageGetter.cats)
            this.addImageDB(ids)
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

        let autocompleteTags = []
        jQuery('#imagelist .fw-searchable').each(function() {
            autocompleteTags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocompleteTags = [...new Set(autocompleteTags)] // unique values
        jQuery("#imagelist_filter input").autocomplete({
            source: autocompleteTags
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
            let imageUpload = new ImageUploadDialog(
                that.imageDB,
                iID,
                0
            )
            imageUpload.init().then(
                imageId => {
                    that.stopUsermediaTable()
                    that.appendToImageTable(imageId)
                    that.startUsermediaTable()
                }
            )

        })
        jQuery('#edit-category').bind('click', () => {
            this.mod.categories.createCategoryDialog()
        })
        //open dropdown for image category
        addDropdownBox(jQuery('#image-category-btn'), jQuery(
            '#image-category-pulldown'))
        jQuery(document).on('mousedown', '#image-category-pulldown li > span',
            function () {
                jQuery('#image-category-btn > label').html(jQuery(this).html())
                jQuery('#image-category').val(jQuery(this).attr('data-id'))
                jQuery('#image-category').trigger('change')
            })
        //filtering function for the list of images
        jQuery('#image-category').bind('change', function () {
            let catVal = jQuery(this).val()
            if ('0' === catVal) {
                jQuery('#imagelist > tbody > tr').show()
            } else {
                jQuery('#imagelist > tbody > tr').hide()
                jQuery('#imagelist > tbody > tr.cat_' + catVal).show()
            }
        })
        //select all entries
        jQuery('#select-all-entry').bind('change', function () {
            let newBool = false
            if (jQuery(this).prop("checked"))
                newBool = true
            jQuery('.entry-select').each(function () {
                this.checked = newBool
            })
        })
        //open dropdown for selecting action
        addDropdownBox(jQuery('#select-action-dropdown'), jQuery(
            '#action-selection-pulldown'))
        //submit image actions
        jQuery('#action-selection-pulldown li > span').bind('mousedown', function () {
            let actionName = jQuery(this).attr('data-action'),
                ids = []
            if ('' === actionName || 'undefined' == typeof (actionName))
                return
            jQuery('.entry-select:checked').each(function () {
                ids[ids.length] = jQuery(this).attr('data-id')
            })
            if (0 === ids.length)
                return
            switch (actionName) {
            case 'delete':
                that.deleteImageDialog(ids)
                break
            }
        })
    }

    init() {
        this.activatePlugins()
        this.bindEvents()
        this.getImageDB()
    }

    bind() {
        jQuery(document).ready(() => {
            this.init()
        })
    }

}
