import {usermediaImageItemSelectionTemplate, usermediaImageSelectionTemplate} from "./templates"
import {ImageUploadDialog} from "../upload-dialog"
import {cancelPromise} from "../../common"

export class ImageSelectionDialog {
    constructor(imageDB, imageId, ownerId) {
        this.imageDB = imageDB
        this.imageId = imageId // a preselected image
        this.ownerId = ownerId
    }

    init() {
        this.imageDialog = jQuery(usermediaImageSelectionTemplate({
                imageDB: this.imageDB.db, usermediaImageItemSelectionTemplate
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
        if (this.imageId) {
            jQuery('#Image_' + this.imageId).addClass(
                'checked')
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
        jQuery('#select_imagelist_filter input').attr('placeholder', gettext('Search for Filename'))

        jQuery('#select_imagelist_filter input').unbind('focus, blur')
        jQuery('#select_imagelist_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus')
        })
        jQuery('#select-imagelist_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus')
        })

        let autocomplete_tags = []
        jQuery('#imagelist .fw-searchable').each(function() {
            autocomplete_tags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocomplete_tags = _.uniq(autocomplete_tags)
        jQuery("#select_imagelist_filter input").autocomplete({
            source: autocomplete_tags
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
                that.imageId = parseInt(elementId.split('_')[1])
                jQuery(this).addClass('checked')
            }
        })
        return new Promise (resolve => {
            jQuery('#selectImageUploadButton').bind('click', () => {
                let imageUpload = new ImageUploadDialog(
                    this.imageDB,
                    false,
                    this.ownerId
                )
                resolve(
                    imageUpload.init().then(
                        imageId => {
                            this.imageId = imageId
                            this.imageDialog.dialog('close')
                            return this.init()
                        }
                    )
                )
            })

            jQuery('#selectImageSelectionButton').bind('click',
                () => {
                    this.imageDialog.dialog('close')
                    resolve(this.imageId)
                })
            jQuery('#cancelImageSelectionButton').bind('click',
                () => {
                    this.imageDialog.dialog('close')
                    resolve(cancelPromise())
                })
        })

    }
}
