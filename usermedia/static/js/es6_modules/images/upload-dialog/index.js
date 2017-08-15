import {usermediaUploadCategoryTemplate, usermediaUploadTemplate} from "./templates"
import {setCheckableLabel, cancelPromise, addAlert} from "../../common"

export class ImageUploadDialog {
    constructor(imageDB, imageId, ownerId) {
        this.imageDB = imageDB
        this.imageId = imageId
        this.ownerId = ownerId
    }

    //open a dialog for uploading an image
    init() {
        let title, imageCat, thumbnail, image, action, longAction
        if (this.imageId) {
            title = this.imageDB.db[this.imageId].title
            thumbnail = this.imageDB.db[this.imageId].thumbnail
            image = this.imageDB.db[this.imageId].image
            imageCat = this.imageDB.db[this.imageId].cats
            action = gettext('Update')
            longAction = gettext('Update image')
        } else {
            this.imageId = 0
            title = ''
            imageCat = []
            thumbnail = false
            image = false
            action = gettext('Upload')
            longAction = gettext('Upload image')
        }
        let iCats = []
        jQuery.each(this.imageDB.cats, (i, iCat) => {
            let len = iCats.length
            iCats[len] = {
                'id': iCat.id,
                'category_title': iCat.category_title
            }
            if (0 <= jQuery.inArray(String(iCat.id), imageCat)) {
                iCats[len].checked = ' checked'
            } else {
                iCats[len].checked = ''
            }
        })


        jQuery('body').append(usermediaUploadTemplate({
            'action': longAction,
            'title': title,
            'thumbnail': thumbnail,
            'image': image,
            'categories': usermediaUploadCategoryTemplate({
                'categories': iCats,
                'fieldTitle': gettext('Select categories')
            })
        }))
        let diaButtons = {}

        let returnPromise = new Promise(resolve => {
            diaButtons[action] = () => resolve(this.onCreateImageSubmitHandler())

            diaButtons[gettext('Cancel')] = function () {
                jQuery(this).dialog('close')
                resolve(cancelPromise())
            }
        })

        let that = this
        jQuery("#uploadimage").dialog({
            resizable: false,
            height: 'auto',
            width: 'auto',
            modal: true,
            buttons: diaButtons,
            create: function () {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass("fw-button fw-orange")
                that.setMediaUploadEvents(jQuery('#uploadimage'))
            },
            close: () => jQuery("#uploadimage").dialog('destroy').remove()

        })

        jQuery('.fw-checkable-label').bind('click', function () {
            setCheckableLabel(jQuery(this))
        })
        return returnPromise
    }

    //add image upload events
    setMediaUploadEvents(wrapper) {
        let selectButton = wrapper.find('.fw-media-select-button'),
            mediaInput = wrapper.find('.fw-media-file-input'),
            mediaPreviewer = wrapper.find('.figure-preview > div')

        selectButton.bind('click', () => mediaInput.trigger('click'))

        mediaInput.bind('change', function() {
            let file = jQuery(this).prop('files')[0],
                fr = new window.FileReader()

            fr.onload = () => {
                mediaPreviewer.html('<img src="' + fr.result + '" />')
            }
            fr.readAsDataURL(file)
        })
    }

    onCreateImageSubmitHandler() {
        //when submitted, the values in form elements will be restored
        let formValues = new window.FormData(),
            checkboxValues = {}

        formValues.append('id', this.imageId)

        if(this.ownerId) {
            formValues.append('owner_id', this.ownerId)
        }

        jQuery('.fw-media-form').each(function () {
            let $this = jQuery(this)
            let theName = $this.attr('name') || $this.attr('data-field-name')
            let theType = $this.attr('type') || $this.attr('data-type')
            let theValue = ''

            switch (theType) {
                case 'checkbox':
                    //if it is a checkbox, the value will be restored as an Array
                    if (undefined === checkboxValues[theName])
                        checkboxValues[theName] = []
                    if ($this.prop("checked")) {
                        checkboxValues[theName].push($this.val())
                    }
                    return
                case 'file':
                    theValue = $this.get(0).files[0]
                    break
                default:
                    theValue = $this.val()
            }

            formValues.append(theName, theValue)
        })

        // Add the values for check boxes
        for (let key in checkboxValues) {
            formValues.append(key, checkboxValues[key].join(','))
        }
        return this.createImage(formValues)
    }

    displayCreateImageError(errors) {
        Object.keys(errors).forEach(
            eKey => {
                let eMsg = `<div class="warning">${errors[eKey]}</div>`
                if ('error' == eKey) {
                    jQuery('#uploadimage').prepend(eMsg)
                } else {
                    jQuery(`#id_${eKey}`).after(eMsg)
                }
            }
        )
    }

    createImage(imageData) {
        // Remove old warning messages
        jQuery('#uploadimage .warning').detach()

        return new Promise(resolve => {
            this.imageDB.saveImage(imageData).then(
                imageId => {
                    jQuery("#uploadimage").dialog('close')
                    addAlert('success', gettext('The image has been uploaded.'))
                    this.imageId = imageId
                    resolve(imageId)
                },
                errors => {
                    this.displayCreateImageError(errors)
                    addAlert('error', gettext('Some errors were found. Please examine the form.'))
                }
            )
        })
    }

}
