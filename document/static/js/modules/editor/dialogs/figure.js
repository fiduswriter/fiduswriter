import {figureImageTemplate, configureFigureTemplate} from "./templates"
import {ImageSelectionDialog} from "../../images/selection_dialog"
import {addDropdownBox, Dialog} from "../../common"
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
        this.dialog.dialogEl.querySelector('#figure-category-btn label').innerHTML =
            document.getElementById(`figure-category-${this.figureCategory}`).innerText
    }

    submitForm() {
        let mathInput = this.dialog.dialogEl.querySelector('input[name=figure-math]')
        let captionInput = this.dialog.dialogEl.querySelector('input[name=figure-caption]')
        this.equation = mathInput.value
        this.caption = captionInput.value

        if ((new RegExp(/^\s*$/)).test(this.equation) && (!this.imgId)) {
            // The math input is empty. Delete a math node if it exist. Then close the dialog.
            if (this.insideFigure) {
                let tr = this.editor.currentView.state.tr.deleteSelection()
                this.editor.currentView.dispatch(tr)
            }
            this.dialog.close()
            return false
        }

        if (this.insideFigure && this.equation === this.node.attrs.equation &&
            (this.imgId === this.node.attrs.image) &&
            this.imgDb === 'document' &&
            this.caption === this.node.attrs.caption &&
            this.figureCategory === this.node.attrs.figureCategory) {
            // the figure has not been changed, just close the dialog
            this.dialog.close()
            return false
        }
        if (this.imgDb==='user') {
            // add image to document db.
            let imageEntry = this.userImageDB.db[this.imgId]
            this.imageDB.setImage(this.imgId, imageEntry)
            this.imgDb = 'document'
        }

        let nodeType = this.editor.currentView.state.schema.nodes['figure']
        let tr = this.editor.currentView.state.tr.replaceSelectionWith(
            nodeType.createAndFill({
                equation: this.equation,
                image: this.imgId,
                figureCategory: this.figureCategory,
                caption: this.caption,
                id: randomFigureId()
            })
        )
        this.editor.currentView.dispatch(tr)

        this.dialog.close()
    }

    init() {
    // toolbar figure
        let buttons = []

        if (this.node && this.node.type && this.node.type.name==='figure') {
            this.insideFigure = true
            this.submitMessage = gettext('Update')
            this.equation = this.node.attrs.equation
            this.imgId = this.node.attrs.image
            this.imgDb = 'document'
            this.figureCategory = this.node.attrs.figureCategory
            this.caption = this.node.attrs.caption

            buttons.push({
                text: gettext('Remove'),
                classes: 'fw-orange',
                click: () => {
                    let tr = this.editor.currentView.state.tr.deleteSelection()
                    this.editor.currentView.dispatch(tr)
                    this.dialog.close()
                }
            })

        }

        buttons.push({
            text: this.submitMessage,
            classes: 'fw-dark',
            click: () => this.submitForm()
        })

        buttons.push({
            type: 'cancel'
        })


        this.dialog = new Dialog({
            id: 'figure-dialog',
            title: gettext("Enter latex math or insert an image"),
            height: 585,
            body: configureFigureTemplate({
                equation: this.equation,
                caption: this.caption,
                image: this.imgId
            }),
            buttons,
            onClose: () => this.editor.currentView.focus()
        })

        this.dialog.open()

        let captionInput = this.dialog.dialogEl.querySelector('input[name=figure-caption]')

        captionInput.addEventListener('focus', () => this.select())

        captionInput.focus()


        this.setFigureLabel()

        if (this.equation) {
            this.layoutMathPreview()
        } else if (this.imgId) {
            this.layoutImagePreview()
        }

        addDropdownBox(
            document.getElementById('figure-category-btn'),
            document.getElementById('figure-category-pulldown')
        )

        document.querySelectorAll('#figure-category-pulldown li span').forEach(el => el.addEventListener(
            'click',
            event => {
                event.preventDefault()
                this.figureCategory = el.id.split('-')[2]
                this.setFigureLabel()
            }
        ))

        document.querySelector('input[name=figure-math]').addEventListener('focus',
            () => {
                // If a figure is being entered, disable the image button
                document.getElementById('insertFigureImage').classList.add('disabled')
                document.getElementById('insertFigureImage').setAttribute('disabled','disabled')
            })

        let mathInput = document.querySelector('input[name=figure-math]')
        mathInput.addEventListener('blur',
            function () {
                if (mathInput.value === '') {
                    document.getElementById('inner-figure-preview').innerHTML = ''
                    // enable image button
                    document.getElementById('insertFigureImage').classList.remove('disabled')
                    document.getElementById('insertFigureImage').removeAttribute('disabled')
                } else {
                    this.equation = mathInput.value
                    this.layoutMathPreview()
                }
            }
        )
        let insertFigureImage = document.getElementById('insertFigureImage')
        insertFigureImage.addEventListener('click',
            () => {
                if (insertFigureImage.classList.contains('disabled')) {
                    return
                }

                let imageSelection = new ImageSelectionDialog(
                    this.imageDB,
                    this.userImageDB,
                    this.imgId
                )
                imageSelection.init().then(
                    ({id, db}) => {
                        if (id) {
                            this.imgId = id
                            this.imgDb = db
                            this.layoutImagePreview()
                            document.querySelector('input[name=figure-math]').setAttribute('disabled', 'disabled')
                        } else {
                            this.imgId = false
                            this.imgDb = false
                            document.getElementById('inner-figure-preview').innerHTML = ''
                            document.querySelector('input[name=figure-math]').removeAttribute('disabled')
                        }
                    }
                )

            }
        )
    }
}
