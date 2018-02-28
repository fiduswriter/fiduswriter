import {figureImageTemplate, configureFigureTemplate} from "./templates"
import {ImageSelectionDialog} from "../../images/selection_dialog"
import {addDropdownBox} from "../../common"
import {katexRender} from "../../katex"
import {randomFigureId} from "../../schema/common"

export class FigureDialog {
    constructor(editor) {
        this.editor = editor
        this.imageDB = this.editor.mod.db.imageDB
        this.userImageDB = this.editor.user.imageDB
        this.imgId = false
        this.imgDb = false
        this.insideFigure = false
        this.figureNode = false
        this.contentNode = false
        this.caption = ''
        this.figureCategory = 'figure'
        this.equation = ''
        this.node = this.editor.currentView.state.selection.node
        this.submitMessage = gettext('Insert')
        this.dialog = false
    }

    layoutMathPreview() {
        let previewNode = document.getElementById('inner-figure-preview')
        katexRender(this.equation, previewNode, {
            displayMode: true,
            throwOnError: false
        })
    }

    layoutImagePreview() {
        if (this.imgId) {
            let db = this.imgDb === 'document' ? this.imageDB.db : this.userImageDB.db
            document.getElementById('inner-figure-preview').innerHTML =
                `<img src="${db[this.imgId].image}"
                        style="max-width: 400px;max-height:220px">`
        }
    }

    setFigureLabel() {
        jQuery(
            '#figure-category-btn label',
            this.dialog).html(jQuery(`#figure-category-${this.figureCategory}`).text())
    }

    submitForm() {
        let mathInput = jQuery('input[name=figure-math]', this.dialog)
        let captionInput = jQuery('input[name=figure-caption]', this.dialog)
        this.equation = mathInput.val()
        this.caption = captionInput.val()

        if ((new RegExp(/^\s*$/)).test(this.equation) && (!this.imgId)) {
            // The math input is empty. Delete a math node if it exist. Then close the dialog.
            if (this.insideFigure) {
                let transaction = this.editor.currentView.state.tr.deleteSelection()
                this.editor.currentView.dispatch(transaction)
            }
            this.dialog.dialog('close')
            return false
        }

        if (this.insideFigure && this.equation === this.node.attrs.equation &&
            (this.imgId === this.node.attrs.image) &&
            this.imgDb === 'document' &&
            this.caption === this.node.attrs.caption &&
            this.figureCategory === this.node.attrs.figureCategory) {
            // the figure has not been changed, just close the dialog
            this.dialog.dialog('close')
            return false
        }
        if (this.imgDb==='user') {
            // add image to document db.
            let imageEntry = this.userImageDB.db[this.imgId]
            this.imageDB.setImage(this.imgId, imageEntry)
            this.imgDb = 'document'
        }

        let nodeType = this.editor.currentView.state.schema.nodes['figure']
        let transaction = this.editor.currentView.state.tr.replaceSelectionWith(
            nodeType.createAndFill({
                equation: this.equation,
                image: this.imgId,
                figureCategory: this.figureCategory,
                caption: this.caption,
                id: randomFigureId()
            })
        )
        this.editor.currentView.dispatch(transaction)

        this.dialog.dialog('close')
    }

    init() {
    // toolbar figure
        let dialogButtons = []

        if (this.node && this.node.type && this.node.type.name==='figure') {
            this.insideFigure = true
            this.submitMessage = gettext('Update')
            this.equation = this.node.attrs.equation
            this.imgId = this.node.attrs.image
            this.imgDb = 'document'
            this.figureCategory = this.node.attrs.figureCategory
            this.caption = this.node.attrs.caption

            dialogButtons.push({
                text: gettext('Remove'),
                class: 'fw-button fw-orange',
                click: () => {
                    let transaction = this.editor.currentView.state.tr.deleteSelection()
                    this.editor.currentView.dispatch(transaction)
                    this.dialog.dialog('close')
                }
            })

        }

        this.dialog = jQuery(configureFigureTemplate({
            equation: this.equation,
            caption: this.caption,
            image: this.imgId
        }))

        dialogButtons.push({
            text: this.submitMessage,
            class: 'fw-button fw-dark',
            mousedown: event => this.submitForm()
        })

        dialogButtons.push({
            text: gettext('Cancel'),
            class: 'fw-button fw-orange',
            click: event => this.dialog.dialog('close')
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
            close: event => {
                 this.dialog.dialog('destroy').remove()
                 this.editor.currentView.focus()
            }
        }

        this.dialog.dialog(dialogOpts)

        let captionInput = jQuery('input[name=figure-caption]', this.dialog)
            .focus(
                function (event) {
                    return this.select()
                }
            )

        captionInput.focus()


        this.setFigureLabel()

        if (this.equation) {
            this.layoutMathPreview()
        } else if (this.imgId) {
            this.layoutImagePreview()
        }

        addDropdownBox(jQuery('#figure-category-btn'), jQuery(
            '#figure-category-pulldown'))
        let that = this
        jQuery('#figure-category-pulldown li span').bind(
            'mousedown',
            function (event) {
                event.preventDefault()
                that.figureCategory = this.id.split('-')[2]
                that.setFigureLabel()
            }
        )

        jQuery('input[name=figure-math]').bind('focus',
            () => {
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

        jQuery('#insertFigureImage').bind('click',
            function () {
                if (jQuery(this).hasClass('disabled')) {
                    return
                }

                let imageSelection = new ImageSelectionDialog(
                    that.imageDB,
                    that.userImageDB,
                    that.imgId
                )
                imageSelection.init().then(
                    ({id, db}) => {
                        if (id) {
                            that.imgId = id
                            that.imgDb = db
                            that.layoutImagePreview()
                            jQuery('input[name=figure-math]').attr(
                                'disabled',
                                'disabled')
                        } else {
                            that.imgId = false
                            that.imgDb = false
                            jQuery('#inner-figure-preview').html('')
                            jQuery('input[name=figure-math]').removeAttr(
                                'disabled')
                        }
                    }
                )

            }
        )
    }
}
