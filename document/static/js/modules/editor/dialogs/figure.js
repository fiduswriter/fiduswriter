import {
    configureFigureTemplate
} from "./templates"
import {
    ImageSelectionDialog
} from "../../images/selection_dialog"
import {
    addDropdownBox,
    Dialog
} from "../../common"
import {
    randomFigureId
} from "../../schema/common"

export class FigureDialog {
    constructor(editor) {
        this.editor = editor
        this.imageDB = this.editor.mod.db.imageDB
        this.userImageDB = this.editor.app.imageDB
        this.imgId = false
        this.imgDb = false
        this.insideFigure = false
        this.figureNode = false
        this.contentNode = false
        this.caption = ''
        this.figureCategory = 'figure'
        this.aligned = 'center'
        this.width = "50"
        this.equation = ''
        this.node = this.editor.currentView.state.selection.node
        this.submitMessage = gettext('Insert')
        this.dialog = false
    }

    layoutMathEditor() {
        this.dialog.dialogEl.querySelector('.inner-figure-preview').innerHTML =
            `<div><span class="math-field" type="text" name="math" ></span></div>
            <p class="formula-or-figure">${gettext('or')}</p>
            <p><button type="button" id="insert-figure-image" class="fw-button fw-light">
                ${gettext("Insert image")} <i class="fa fa-image"></i>
            </button></p>`

        this.mathliveDOM = this.dialog.dialogEl.querySelector(".math-field")
        this.nonMathElements = [
            this.dialog.dialogEl.querySelector("#insert-figure-image"),
            this.dialog.dialogEl.querySelector(".formula-or-figure")
        ]
        import("mathlive").then(MathLive => {
            this.mathField = MathLive.makeMathField(this.mathliveDOM, {
                virtualKeyboardMode: 'manual',
                onBlur: () => this.showPlaceHolder(),
                onFocus: () => this.hidePlaceHolder(),
                locale: 'int',
                strings: {
                    'int': {
                        "keyboard.tooltip.functions": gettext("Functions"),
                        "keyboard.tooltip.greek": gettext("Greek Letters"),
                        "keyboard.tooltip.command": gettext("LaTeX Command Mode"),
                        "keyboard.tooltip.numeric": gettext("Numeric"),
                        "keyboard.tooltip.roman": gettext("Symbols and Roman Letters"),
                        "tooltip.copy to clipboard": gettext("Copy to Clipboard"),
                        "tooltip.redo": gettext("Redo"),
                        "tooltip.toggle virtual keyboard": gettext("Toggle Virtual Keyboard"),
                        "tooltip.undo": gettext("Undo")
                    }
                },
                onContentDidChange: () => {
                    this.equation = this.mathField.$latex()
                    this.showHideNonMathElements()
                }
            })
            this.mathField.$latex(this.equation)
            this.showPlaceHolder()
            this.showHideNonMathElements()
            this.dialog.dialogEl.querySelector('#insert-figure-image').addEventListener(
                'click',
                () => this.selectImage()
            )
        })

    }

    showPlaceHolder() {
        if (!this.mathField.$latex().length) {
            this.mathliveDOM.insertAdjacentHTML('beforeend', `<span class="placeholder" >${gettext('Type formula')}</span>`)
        }
    }

    hidePlaceHolder() {
        const placeHolder = this.mathliveDOM.querySelector('.placeholder')
        if (placeHolder) {
            this.mathliveDOM.removeChild(placeHolder)
        }
    }

    showHideNonMathElements() {
        if (this.equation.length) {
            this.nonMathElements.forEach(el => el.style.display = 'none')
        } else {
            this.nonMathElements.forEach(el => el.style.display = '')
        }
    }

    selectImage() {
        const imageSelection = new ImageSelectionDialog(
            this.imageDB,
            this.userImageDB,
            this.imgId,
            this.editor
        )
        imageSelection.init().then(
            ({
                id,
                db
            }) => {
                if (id) {
                    this.imgId = id
                    this.imgDb = db
                    this.layoutImagePreview()
                } else {
                    this.imgId = false
                    this.imgDb = false
                    this.layoutMathEditor()
                }
            }
        )
    }

    layoutImagePreview() {
        if (this.imgId) {
            if (this.mathField) {
                this.mathField.$revertToOriginalContent()
                this.mathField = false
            }
            const db = this.imgDb === 'document' ? this.imageDB.db : this.userImageDB.db
            this.dialog.dialogEl.querySelector('.inner-figure-preview').innerHTML =
                `<img src="${db[this.imgId].image}" style="max-width: 400px;max-height:220px">
                <i class="fas fa-times-circle remove-image"></i>`
            this.dialog.dialogEl.querySelector('.inner-figure-preview .remove-image').addEventListener(
                'click',
                () => {
                    this.imgId = false
                    this.imgDb = false
                    this.layoutMathEditor()
                }
            )

        }
    }

    setFigureLabel() {
        this.dialog.dialogEl.querySelector('#figure-category-btn label').innerHTML =
            document.getElementById(`figure-category-${this.figureCategory}`).innerText
    }

    setFigureAlignment() {
        this.dialog.dialogEl.querySelector('#figure-alignment-btn label').innerHTML =
            document.getElementById(`figure-alignment-${this.aligned}`).innerText
    }

    setFigureWidth() {
        this.dialog.dialogEl.querySelector('#figure-width-btn label').innerHTML =
            document.getElementById(`figure-width-${this.width}`).innerText

    }

    submitForm() {
        const captionInput = this.dialog.dialogEl.querySelector('input[name=figure-caption]')
        this.caption = captionInput.value

        if ((new RegExp(/^\s*$/)).test(this.equation) && (!this.imgId)) {
            // The math input is empty. Delete a math node if it exist. Then close the dialog.
            if (this.insideFigure) {
                const tr = this.editor.currentView.state.tr.deleteSelection()
                this.editor.currentView.dispatch(tr)
            }
            this.dialog.close()
            return false
        }

        if (
            this.insideFigure &&
            this.equation === this.node.attrs.equation &&
            (this.imgId === this.node.attrs.image) &&
            this.imgDb === 'document' &&
            this.caption === this.node.attrs.caption &&
            this.figureCategory === this.node.attrs.figureCategory &&
            this.aligned === this.node.attrs.aligned &&
            this.width === this.node.attrs.width
        ) {
            // The figure has not been changed, just close the dialog
            this.dialog.close()
            return false
        }
        if (this.imgDb === 'user') {
            // Add image to document db.
            const imageEntry = this.userImageDB.db[this.imgId]
            this.imageDB.setImage(this.imgId, imageEntry)
            this.imgDb = 'document'
        }
        // This is the node wherein figureAlignment will affect the attribute
        const nodeType = this.editor.currentView.state.schema.nodes['figure']
        const tr = this.editor.currentView.state.tr.replaceSelectionWith(
            nodeType.createAndFill({
                equation: this.equation,
                image: this.imgId,
                aligned: this.aligned,
                width: this.width,
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
        const buttons = []

        if (this.node && this.node.type && this.node.type.name === 'figure') {
            this.insideFigure = true
            this.submitMessage = gettext('Update')
            this.equation = this.node.attrs.equation
            this.imgId = this.node.attrs.image
            this.imgDb = 'document'
            this.figureCategory = this.node.attrs.figureCategory
            this.caption = this.node.attrs.caption
            this.aligned = this.node.attrs.aligned
            this.width = this.node.attrs.width
            buttons.push({
                text: gettext('Remove'),
                classes: 'fw-orange',
                click: () => {
                    const tr = this.editor.currentView.state.tr.deleteSelection()
                    this.editor.currentView.dispatch(tr)
                    this.dialog.close()
                }
            })

        }
        // Image positioning both at the time of updating and inserting for the first time
        buttons.push({ // Update
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
            body: configureFigureTemplate({
                caption: this.caption,
                aligned: this.aligned,
                width: this.width,
                dir: this.editor.docInfo.dir
            }),
            buttons,
            beforeClose: () => {
                if (this.mathField) {
                    this.mathField.$revertToOriginalContent()
                    this.mathField = false
                }
            },
            onClose: () => this.editor.currentView.focus()

        })

        this.dialog.open()

        const captionInput = this.dialog.dialogEl.querySelector('input[name=figure-caption]')

        captionInput.focus()

        this.setFigureLabel()
        this.setFigureAlignment()
        this.setFigureWidth()

        if (this.imgId) {
            this.layoutImagePreview()
        } else {
            this.layoutMathEditor()
        }

        addDropdownBox(
            document.getElementById('figure-category-btn'),
            document.getElementById('figure-category-pulldown')
        )


        addDropdownBox(
            document.getElementById('figure-alignment-btn'),
            document.getElementById('figure-alignment-pulldown')
        )

        addDropdownBox(
            document.getElementById('figure-width-btn'),
            document.getElementById('figure-width-pulldown')
        )
        document.querySelectorAll('#figure-alignment-pulldown li span').forEach(el => el.addEventListener(
            'click',
            event => {
                event.preventDefault()
                this.aligned = el.id.split('-')[2]
                this.setFigureAlignment()
            }
        ))

        document.querySelectorAll('#figure-width-pulldown li span').forEach(el => el.addEventListener(
            'click',
            event => {
                event.preventDefault()
                this.width = el.id.split('-')[2]
                this.setFigureWidth()
            }
        ))


        document.querySelectorAll('#figure-category-pulldown li span').forEach(el => el.addEventListener(
            'click',
            event => {
                event.preventDefault()
                this.figureCategory = el.id.split('-')[2]
                this.setFigureLabel()
            }
        ))

    }
}
