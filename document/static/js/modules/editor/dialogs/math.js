import katex from "katex"
import MathLive from "mathlive"

import {mathDialogTemplate} from "./templates"
import {Dialog} from "../../common"

/**
 * Class to work with formula dialog
 */
export class MathDialog {
    constructor(editor) {
        this.editor = editor
        this.node = this.editor.currentView.state.selection.node
        this.isRawMode = false
        this.equationSelected = this.node && this.node.attrs && this.node.attrs.equation ? true : false
        this.equation = this.equationSelected ? this.node.attrs.equation : ''
    }

    init() {
        //get selected node

        //initialize dialog and open it
        this.dialog = new Dialog({
            body: mathDialogTemplate(),
            buttons: [
                {
                    text: this.equationSelected ? gettext('Update') : gettext('Insert'),
                    classes: 'fw-dark insert-math',
                    click: () => {
                        const view = this.editor.currentView,
                            state = view.state

                        this.equation = this.getLatex()

                        if ((new RegExp(/^\s*$/)).test(this.equation)) {
                            // The math input is empty. Delete a math node if it exist. Then close the dialog.
                            if (this.equationSelected) {
                                view.dispatch(state.tr.deleteSelection())
                            }
                            this.dialog.close()
                            return
                        } else if (this.equationSelected && this.equation === this.node.attrs.equation) {
                            // Equation selected, but has not changed from last time.
                            this.dialog.close()
                            return
                        }
                        const nodeType = state.schema.nodes['equation']
                        view.dispatch(
                            state.tr.replaceSelectionWith(nodeType.createAndFill({
                                equation: this.equation
                            }))
                        )
                        this.dialog.close()
                    }
                },
                {
                    text: gettext('LaTeX / Graphic'),
                    classes: 'fw-dark',
                    click: () => this.switchLatexGraphicMode()
                },
                {
                    type: 'cancel'
                }
            ],
            title: gettext('Mathematical formula'),
            height: 90,
            onClose: () => {
                this.editor.currentView.focus()
            }
        })
        this.dialog.open()

        this.mathliveDOM = this.dialog.dialogEl.querySelector("p > .math-field")
        this.rawInputDOM = this.dialog.dialogEl.querySelector("div > .raw-input")
        this.previewDOM = this.dialog.dialogEl.querySelector("div.math-preview")
        this.errorFieldDOM = this.dialog.dialogEl.querySelector("div.math-error")

        this.mathField = MathLive.makeMathField(this.mathliveDOM)
        this.mathField.$latex(this.equation)
    }

    /**
     * Destroy mathlive object. reinitialize it to work with raw latex
     */
    switchLatexGraphicMode() {
        const latexText = this.getLatex()

        if (this.isRawMode) {
            this.mathField.$latex(latexText)
            this.mathliveDOM.style.display = ''
            this.rawInputDOM.style.display = 'none'
            this.previewDOM.innerHTML = ''
            this.isRawMode = false
        } else {
            //change from span to input in template
            this.mathliveDOM.style.display = 'none'
            this.rawInputDOM.style.display = ''
            this.rawInputDOM.value = latexText

            //render latex formula using katex
            katex.render(this.getLatex(), this.previewDOM, {throwOnError: false})

            //live-update of katex rendering
            this.rawInputDOM.addEventListener('input', () => {
                try {
                    this.previewDOM.innerHTML = ''
                    katex.render(this.getLatex(), this.previewDOM)
                    this.hideError()
                }
                catch (msg) {
                    //if error show it
                    this.showError(msg)
                }
            })

            this.isRawMode = true
        }
    }

    /**
     * Get latex representation as text
     * @returns {string} latex formula
     */
    getLatex() {
        if (this.isRawMode) {
            return this.rawInputDOM.value
        }
        return this.mathField.$latex()
    }

    /**
     *
     * @param {string} msg Error message
     */
    showError(msg) {
        this.errorFieldDOM.innerText = msg
        this.errorFieldDOM.style.display = 'block'
    }

    /**
     * Hide error span
     */
    hideError() {
        this.errorFieldDOM.style.display = 'none'
    }
}
