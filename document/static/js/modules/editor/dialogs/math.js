import {mathDialogTemplate} from "./templates"
import {FormulaEditor} from '../tools/formula_editor'
import {Dialog} from "../../common"

/**
 * Class to work with formula dialog
 */
export class MathDialog {
    constructor(editor) {
        this.editor = editor
        const defaultEquation = '\\$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'
        this.node = this.editor.currentView.state.selection.node
        this.mathQuill = null
        this.equationSelected = this.node && this.node.attrs && this.node.attrs.equation ? true : false
        this.equation = this.selectedEquationNode ? this.node.attrs.equation : defaultEquation
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

                        this.equation = this.mathQuill.getLatex()

                        if ((new RegExp(/^\s*$/)).test(this.equation)) {
                            // The math input is empty. Delete a math node if it exist. Then close the dialog.
                            if (this.equationSelected) {
                                view.dispatch(state.tr.deleteSelection())
                            }
                            this.dialog.close()
                            return
                        } else if (this.equationSelectede && this.equation === this.node.attrs.equation) {
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
                    click: () => this.mathQuill.switchLatexGraphicMode()
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

        //initialize advanced formula editor using mathquill
        this.mathQuill = new FormulaEditor(this.dialog, this.equation)
    }
}
