import {usermediaImageSelectionTemplate} from "./templates"
import {ImageUploadDialog} from "../upload-dialog"
import {cancelPromise} from "../../common"

export class ImageSelectionDialog {
    constructor(imageDB, userImageDB, imgId, ownerId) {
        this.imageDB = imageDB
        this.userImageDB = userImageDB
        this.imgId = imgId // a preselected image
        this.imgDb = 'document' // the preselection image will always come from the document
        this.ownerId = ownerId
    }

    init() {
        let images = Object.values(this.imageDB.db).map(image => {
            return {
                image,
                db: 'document'
            }
        })
        Object.values(this.userImageDB.db).forEach(image => {
            if (this.imageDB.db[image.id]) {
                return
            }
            images.push({
                image,
                db: 'user'
            })
        })
        this.imageDialog = jQuery(usermediaImageSelectionTemplate({
                images
            })).dialog({
            width: 'auto',
            height: 'auto',
            title: gettext("Images"),
            modal: true,
            resizable: false,
            draggable: false,
            dialogClass: 'select-image-dialog',
            close: function () {
                jQuery(this).dialog('destroy').remove()
            }
        })

        this.startImageTable()
        if (this.imgId) {
            jQuery(`#Image_${this.imgDb}_${this.imgId}`).addClass('checked')
        }
        return this.bindEvents()
    }

    startImageTable() {
        /* The sortable table seems not to have an option to accept new data
        added to the DOM. Instead we destroy and recreate it.
        */

        let nonSortable = [0, 2]

        jQuery('#select_imagelist').dataTable({
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
                "aTargets": nonSortable
            }],
        })
        jQuery('#select_imagelist_filter input').attr(
            'placeholder', gettext('Search for Filename'))

        jQuery('#select_imagelist_filter input').unbind('focus, blur')
        jQuery('#select_imagelist_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus')
        })
        jQuery('#select-imagelist_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus')
        })

        let autocompleteTags = []
        jQuery('#imagelist .fw-searchable').each(function() {
            autocompleteTags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocompleteTags = [...new Set(autocompleteTags)] // unique values
        jQuery("#select_imagelist_filter input").autocomplete({
            source: autocompleteTags
        })
    }

    bindEvents() {

        // functions for the image selection dialog
        let that = this
        jQuery('#select_imagelist tr').on('click', function () {
            let checkedImage = jQuery('#select_imagelist tr.checked'),
                selecting = true, elementId = jQuery(this).attr('id')
            if (elementId === undefined) {
                // Likely clicked on header
                return
            }
            if (checkedImage.length > 0 && this == checkedImage[0]) {
                selecting = false
                that.imageId = false
            }
            checkedImage.removeClass('checked')
            if (selecting) {
                that.imgId = parseInt(elementId.split('_')[2])
                that.imgDb = elementId.split('_')[1]
                jQuery(this).addClass('checked')
            }
        })
        return new Promise (resolve => {
            jQuery('#selectImageUploadButton').bind('click', () => {
                let imageUpload = new ImageUploadDialog(
                    this.userImageDB, // We can only upload to the user's image db
                    false,
                    this.ownerId
                )
                resolve(
                    imageUpload.init().then(
                        imageId => {
                            this.imgId = imageId
                            this.imgDb = 'user'
                            this.imageDialog.dialog('close')
                            return this.init()
                        }
                    )
                )
            })

            jQuery('#selectImageSelectionButton').bind('click',
                () => {
                    this.imageDialog.dialog('close')
                    resolve({id: this.imgId, db: this.imgDb})
                })
            jQuery('#cancelImageSelectionButton').bind('click',
                () => {
                    this.imageDialog.dialog('close')
                    resolve(cancelPromise())
                })
        })

    }
}
