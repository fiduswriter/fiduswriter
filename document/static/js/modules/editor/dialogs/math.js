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
                    type: 'cancel'
                }
            ],
            title: gettext('Mathematical formula'),
            height: 150,
            onClose: () => {
                if (this.mathField) {
                    this.mathField.$revertToOriginalContent()
                }
                this.editor.currentView.focus()
            }
        })
        this.dialog.open()

        this.mathliveDOM = this.dialog.dialogEl.querySelector(".math-field")

        this.mathField = MathLive.makeMathField(this.mathliveDOM, {
            virtualKeyboardMode: 'manual',
            onBlur: () => this.showPlaceHolder(),
            onFocus: () => this.hidePlaceHolder()
        })
        this.mathField.$latex(this.equation)
        this.showPlaceHolder()
    }

    /**
     * Get latex representation as text
     * @returns {string} latex formula
     */
    getLatex() {
        return this.mathField.$latex()
    }

    showPlaceHolder() {
        if (!this.getLatex().length) {
            this.mathliveDOM.insertAdjacentHTML('beforeend', `<span class="placeholder" >${gettext('Type formula')}</span>`)
        }
    }

    hidePlaceHolder() {
        const placeHolder = this.mathliveDOM.querySelector('.placeholder')
        if (placeHolder) {
            this.mathliveDOM.removeChild(placeHolder)
        }
    }
}
