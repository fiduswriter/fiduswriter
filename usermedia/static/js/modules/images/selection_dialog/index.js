import {imageSelectionTemplate} from "./templates"
import {ImageEditDialog} from "../edit_dialog"
import {cancelPromise, Dialog} from "../../common"

export class ImageSelectionDialog {
    constructor(imageDB, userImageDB, imgId) {
        this.imageDB = imageDB
        this.userImageDB = userImageDB
        this.imgId = imgId // a preselected image
        this.imgDb = 'document' // the preselection image will always come from the document
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
        this.imageDialog = new Dialog({
            body: imageSelectionTemplate({
                    images
                }),
            title: gettext("Images"),
            id: 'select-image-dialog',
        })
        this.imageDialog.open()
        this.startImageTable()
        if (this.imgId) {
            document.getElementById(`Image_${this.imgDb}_${this.imgId}`).classList.add('checked')
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
        document.querySelector('#select_imagelist_filter input').setAttribute(
            'placeholder', gettext('Search for Filename'))

        jQuery('#select_imagelist_filter input').unbind('focus, blur')
        jQuery('#select_imagelist_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus')
        })
        jQuery('#select-imagelist_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus')
        })

        let autocompleteTags = []
        document.querySelectorAll('#imagelist .fw-searchable').forEach(el => {
            autocompleteTags.push(el.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocompleteTags = [...new Set(autocompleteTags)] // unique values
        jQuery("#select_imagelist_filter input").autocomplete({
            source: autocompleteTags
        })
    }

    bindEvents() {

        // functions for the image selection dialog
        let that = this
        this.imageDialog.dialogEl.querySelectorAll('#select_imagelist tr').forEach(el => el.addEventListener('click', () => {
            let checkedImageEl = this.imageDialog.dialogEl.querySelector('#select_imagelist tr.checked'),
                selecting = true, elementId = el.id
            if (elementId === undefined) {
                // Likely clicked on header
                return
            }
            if (el == checkedImageEl) {
                selecting = false
                this.imageId = false
            }
            checkedImageEl.classList.remove('checked')
            if (selecting) {
                this.imgId = parseInt(elementId.split('_')[2])
                this.imgDb = elementId.split('_')[1]
                el.classList.add('checked')
            }
        }))
        return new Promise (resolve => {
            this.imageDialog.dialogEl.querySelector('#selectImageUploadButton').addEventListener('click', () => {
                let imageUpload = new ImageEditDialog(
                    this.userImageDB // We can only upload to the user's image db
                )
                resolve(
                    imageUpload.init().then(
                        imageId => {
                            this.imgId = imageId
                            this.imgDb = 'user'
                            this.imageDialog.close()
                            return this.init()
                        }
                    )
                )
            })

            this.imageDialog.dialogEl.querySelector('#selectImageSelectionButton').addEventListener('click',
                () => {
                    this.imageDialog.close()
                    resolve({id: this.imgId, db: this.imgDb})
                }
            )
            this.imageDialog.dialogEl.querySelector('#cancelImageSelectionButton').addEventListener('click',
                () => {
                    this.imageDialog.close()
                    resolve(cancelPromise())
                }
            )
        })

    }
}
