import {figureImageTemplate, figureImageItemTemplate, configureFigureTemplate} from "./templates"
import {ImageSelectionDialog} from "../../../images/selection-dialog/selection-dialog"
import {addDropdownBox} from "../../../common/common"
import {katexRender} from "../../../katex/katex"

export class FigureDialog {
    constructor(mod) {
        this.editor = mod.editor
        this.imageDB = this.editor.imageDB
        this.imageId = false
        this.insideFigure = false
        this.figureNode = false
        this.contentNode = false
        this.caption = ''
        this.figureCategory = 'figure'
        this.equation = ''
        this.node = this.editor.currentPm.selection.node
        this.submitMessage = gettext('Insert')
        this.dialog = false
        this.createFigureDialog()
    }

    layoutMathPreview() {
        let previewNode = document.getElementById('inner-figure-preview')
        katexRender(this.equation, previewNode, {
            displayMode: true,
            throwOnError: false
        })
    }

    layoutImagePreview() {
        //TODO: Figure out what to do if the image has been deleted from imageDB.db in the meantime.
        if (this.imageId && this.imageDB.db[this.imageId]) {
            document.getElementById('inner-figure-preview').innerHTML =
                '<img src="' +
                this.imageDB.db[this.imageId].image +
                '" style="max-width: 400px;max-height:220px">'
        }
    }

    setFigureLabel() {
        jQuery(
            '#figure-category-btn label',
            this.dialog).html(jQuery('#figure-category-' + this.figureCategory).text())
    }

    submitForm() {
        let mathInput = jQuery('input[name=figure-math]', this.dialog)
        let captionInput = jQuery('input[name=figure-caption]', this.dialog)
        this.equation = mathInput.val()
        this.caption = captionInput.val()

        if ((new RegExp(/^\s*$/)).test(this.equation) && (!this.imageId)) {
            // The math input is empty. Delete a math node if it exist. Then close the dialog.
            if (this.insideFigure) {
                this.editor.currentPm.tr.deleteSelection().apply()
            }
            this.dialog.dialog('close')
            return false
        }

        if (this.insideFigure && this.equation === this.node.attrs.equation &&
            (this.imageId === this.node.attrs.image) &&
            this.caption === this.node.attrs.caption &&
            this.figureCategory === this.node.attrs.figureCategory) {
            // the figure has not been changed, just close the dialog
            this.dialog.dialog('close')
            return false
        }
        let nodeType = this.editor.currentPm.schema.nodes['figure']
        this.editor.currentPm.tr.replaceSelection(nodeType.createAndFill({
            equation: this.equation,
            image: this.imageId,
            figureCategory: this.figureCategory,
            caption: this.caption
        })).apply()

        this.dialog.dialog('close')
    }

    createFigureDialog() {
    // toolbar figure
        let that = this, dialogButtons = []

        if (this.node && this.node.type && this.node.type.name==='figure') {
            this.insideFigure = true
            this.submitMessage = gettext('Update')
            this.equation = this.node.attrs.equation
            this.imageId = this.node.attrs.image
            this.figureCategory = this.node.attrs.figureCategory
            this.caption = this.node.attrs.caption

            dialogButtons.push({
                text: gettext('Remove'),
                class: 'fw-button fw-orange',
                click: function () {
                    that.editor.currentPm.tr.deleteSelection().apply()
                    that.dialog.dialog('close')
                }
            })

        }

        this.dialog = jQuery(configureFigureTemplate({
            equation: this.equation,
            caption: this.caption,
            image: this.imageId
        }))

        dialogButtons.push({
            text: this.submitMessage,
            class: 'fw-button fw-dark',
            mousedown: function (event) {
                //event.preventDefault()
                that.submitForm()
            },
        })

        dialogButtons.push({
            text: gettext('Cancel'),
            class: 'fw-button fw-orange',
            click: function (event) {
                that.dialog.dialog('close')
            }
        })


        let dialogOpts = {
            width: 'auto',
            height: 585,
            title: gettext("Enter latex math or insert an image"),
            modal: true,
            resizable: false,
            draggable: false,
            buttons: dialogButtons,
            dialogClass: 'figure-dialog',
            close: function () {
                that.dialog.dialog('destroy').remove()
            },
        }


        this.dialog.dialog(dialogOpts)


        let captionInput = jQuery('input[name=figure-caption]', this.dialog)
            .focus(function (
                e) {
                return this.select()
            })

        captionInput.focus()


        this.setFigureLabel()

        if (this.equation) {
            this.layoutMathPreview()
        } else if (this.imageId) {
            this.layoutImagePreview()
        }

        addDropdownBox(jQuery('#figure-category-btn'), jQuery(
            '#figure-category-pulldown'))

        jQuery('#figure-category-pulldown li span').bind(
            'mousedown', function (event) {
                event.preventDefault()
                that.figureCategory = this.id.split('-')[2]
                that.setFigureLabel()
            })

        jQuery('input[name=figure-math]').bind('focus',
            function () {
                // If a figure is being entered, disable the image button
                jQuery('#insertFigureImage').addClass(
                    'disabled').attr(
                    'disabled', 'disabled')
            })

        jQuery('input[name=figure-math]').bind('blur',
            function () {
                if (jQuery(this).val() === '') {
                    jQuery('#inner-figure-preview')[0].innerHTML =
                        ''
                    // enable image button
                    jQuery('#insertFigureImage').removeClass(
                        'disabled')
                        .removeAttr('disabled')
                } else {
                    that.equation = jQuery(this).val()
                    that.layoutMathPreview()
                }
            })

        jQuery('#insertFigureImage').bind('click', function () {
            if (jQuery(this).hasClass('disabled')) {
                return
            }

            new ImageSelectionDialog(that.imageDB, that.imageId, that.editor.doc.owner.id, function(newImageId) {
                if (newImageId && newImageId !== false) {
                    that.imageId = newImageId
                    that.layoutImagePreview()
                    jQuery('input[name=figure-math]').attr(
                        'disabled',
                        'disabled')
                } else {
                    that.imageId = false
                    jQuery('#inner-figure-preview').html('')
                    jQuery('input[name=figure-math]').removeAttr(
                        'disabled')
                }
            })

        })
    }

}
