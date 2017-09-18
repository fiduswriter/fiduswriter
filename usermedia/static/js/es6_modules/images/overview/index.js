import {ImageUploadDialog} from "../upload-dialog"
import {ImageDB} from "../database"
import {ImageOverviewCategories} from "./categories"
import {addDropdownBox, activateWait, deactivateWait, addAlert, csrfToken} from "../../common"
import {SiteMenu} from "../../menu"
import {OverviewMenuView} from "../../common"
import {menuModel} from "./menu"
import {usermediaCategoryListItem, usermediaTableTemplate} from "./templates"
import * as plugins from "../../plugins/images-overview"
 /** Helper functions for user added images/SVGs.*/

export class ImageOverview {
    constructor() {
        this.mod = {}
        new ImageOverviewCategories(this)
        let smenu = new SiteMenu("images")
        smenu.init()
        this.menu = new OverviewMenuView(this, menuModel)
        this.menu.init()
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
        let imageGetter = new ImageDB()
        imageGetter.getDB().then(ids => {
            this.imageDB = imageGetter
            this.mod.categories.setImageCategoryList(imageGetter.cats)
            this.addImageDB(ids)
        })
    }

    // get IDs of selected bib entries
    getSelected() {
        return [].slice.call(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
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
            let id = parseInt(jQuery(this).attr('data-id'))
            let imageUpload = new ImageUploadDialog(
                that.imageDB,
                id
            )
            imageUpload.init().then(
                imageId => {
                    that.stopUsermediaTable()
                    that.appendToImageTable(imageId)
                    that.startUsermediaTable()
                }
            )

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
