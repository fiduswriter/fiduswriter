import {mathDialogTemplate} from "./templates"
import {Dialog} from "../../common"
import {sub, sup, subChars, supChars} from "./subsup"


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
            height: 100,
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
                        } else if (
                            (new RegExp(`^\\^({[${supChars}]*}|[${supChars}]?)$`)
                            ).test(this.equation)) {
                            // The math input is pure superscript and
                            // can be converted to ordinary characters.
                            view.dispatch(
                                state.tr.insertText(sup(this.equation.slice(1)))
                            )
                            this.dialog.close()
                            return
                        } else if (
                            (new RegExp(`^\\_({[${subChars}]*}|[${subChars}]?)$`)
                            ).test(this.equation)) {
                            // The math input is pure subscript and
                            // can be converted to ordinary characters.
                            view.dispatch(
                                state.tr.insertText(sub(this.equation.slice(1)))
                            )
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
            beforeClose: () => {
                if (this.mathField) {
                    this.mathField = false
                }
            },
            classes: 'math',
            onClose: () => this.editor.currentView.focus()
        })
        this.dialog.open()

        this.mathliveDOM = this.dialog.dialogEl.querySelector(".math-field")

        import("mathlive").then(MathLive => {
            this.mathField = MathLive.makeMathField(this.mathliveDOM, {
                virtualKeyboardMode: 'onfocus',
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
                }
            })
            this.mathField.setValue(this.equation)
        })
    }

    /**
     * Get latex representation as text
     * @returns {string} latex formula
     */
    getLatex() {
        return this.mathField.getValue()
    }
}
