import {ImageDB} from "../database"
import {ImageOverviewCategories} from "./categories"
import {activateWait, deactivateWait, addAlert, post} from "../../common"
import {SiteMenu} from "../../menu"
import {OverviewMenuView} from "../../common"
import {menuModel} from "./menu"
import {ImageEditDialog} from "../edit_dialog"
import {usermediaTableTemplate} from "./templates"
import * as plugins from "../../../plugins/images_overview"
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
        ids = ids.map(id => parseInt(id))

        activateWait()
        post(
            '/usermedia/delete/',
            {ids}
        ).then(
            () => {
                this.stopUsermediaTable()
                ids.forEach(id => {
                    delete this.imageDB[id]
                })
                let elementsId = '#Image_' + ids.join(', #Image_')

                Array.prototype.slice.call(document.querySelectorAll(elementsId)).forEach(
                    el => el.parentElement.removeChild(el)
                )
                this.startUsermediaTable()
                addAlert('success', gettext('The image(s) have been deleted'))
            }
        ).catch(
            () => addAlert('error', gettext('The image(s) could not be deleted'))
        ).then(
            () => deactivateWait()
        )
    }

    deleteImageDialog(ids) {
        document.body.insertAdjacentHTML(
            'beforeend',
            '<div id="confirmdeletion" title="' + gettext(
                'Confirm deletion') + '"><p>' + gettext(
                'Delete the image(s)') +
            '?</p></div>'
        )
        let that = this
        let buttons = [
            {
                text: gettext('Delete'),
                class: "fw-button fw-dark",
                click: function () {
                    that.deleteImage(ids)
                    jQuery(this).dialog('close')
                }
            },
            {
                text: gettext('Cancel'),
                class: "fw-button fw-orange",
                click: function () {
                    jQuery(this).dialog('close')
                }
            }
        ]
        jQuery("#confirmdeletion").dialog({
            resizable: false,
            height: 180,
            modal: true,
            buttons,
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

        let fileType = imageInfo.file_type.split('/')

        if(1 < fileType.length) {
            fileType = fileType[1].toUpperCase()
        } else {
            fileType = fileType[0].toUpperCase()
        }
        let tr = document.getElementById(`Image_${id}`)
        if (tr) { //if the image entry exists, update
            tr.insertAdjacentHTML(
                'afterend',
                usermediaTableTemplate({
                    id,
                    'cats': imageInfo.cats,
                    fileType,
                    'title': imageInfo.title,
                    'thumbnail': imageInfo.thumbnail,
                    'image': imageInfo.image,
                    'height': imageInfo.height,
                    'width': imageInfo.width,
                    'added': imageInfo.added
                })
            )
            tr.parentElement.removeChild(tr)
        } else { //if this is the new image, append
            document.querySelector('#imagelist > tbody').insertAdjacentHTML(
                'beforeend',
                usermediaTableTemplate({
                    id,
                    'cats': imageInfo.cats,
                    fileType,
                    'title': imageInfo.title,
                    'thumbnail': imageInfo.thumbnail,
                    'image': imageInfo.image,
                    'height': imageInfo.height,
                    'width': imageInfo.width,
                    'added': imageInfo.added
                })
            )
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
            let imageId = jQuery(this).attr('data-id')
            that.deleteImageDialog([imageId])
        })

        jQuery(document).on('click', '.edit-image', function () {
            let imageId = jQuery(this).attr('data-id')
            let dialog = new ImageEditDialog(that.imageDB, imageId)
            dialog.init().then(
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
