import {mathDialogTemplate} from "./templates"
import {FormulaEditor} from '../../tools/formula-editor'

export class MathDialog {
    constructor(mod) {
        this.editor = mod.editor
        this.dialog = jQuery(mathDialogTemplate())
        this.isDialogInitialized = false
        this.dialogButtons = []
        this.isMathInside = false
        this.submitMessage = gettext('Insert')
        this.defaultEquation = '\\$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'
        //this.isRawLatexMode = false

        this.equation = this.defaultEquation
        this.node = null
        this.mathQuill = null
    }

    initializeButtons() {
        if (this.isFormulaAlreadyInBox()) {
            this.initRemoveButtonOnFormulaUpdate()
        }
        this.initializeSubmitButton()
        this.initializeCancelButton()
        this.initRawLatexButton()
    }

    initializeCancelButton() {
        this.dialogButtons.push({
            text: gettext('Cancel'),
            class: 'fw-button fw-orange',
            click: () => {
                this.dialog.dialog('close')
            }
        })
    }

    initializeSubmitButton() {
        this.dialogButtons.push({
            text: this.submitMessage,
            class: 'fw-button fw-dark',
            click: () => {
                this.equation = this.mathQuill.getLatex()

                if ((new RegExp(/^\s*$/)).test(this.equation)) {
                    // The math input is empty. Delete a math node if it exist. Then close the dialog.
                    if (this.isMathInside) {
                        this.editor.currentPm.execCommand('deleteSelection')
                    }
                    this.dialog.dialog('close')
                    return
                } else if (this.isMathInside && this.equation === this.node.attrs.equation) {
                    this.dialog.dialog('close')
                    return
                }

                this.editor.currentPm.execCommand('equation:insert', [this.equation])

                this.dialog.dialog('close')
            }
        })
    }

    initRemoveButtonOnFormulaUpdate() {
        this.isMathInside = true
        this.equation = this.node.attrs.equation
        this.submitMessage = gettext('Update')
        this.dialogButtons.push({
            text: gettext('Remove'),
            class: 'fw-button fw-orange',
            click: () => {
                this.isMathInside = false
                this.dialog.dialog('close')
            }
        })
    }

    initRawLatexButton() {
        this.dialogButtons.push({
            text: gettext('Raw'),
            class: 'fw-button fw-white',
            click: () => {
                this.mathQuill.switchToRawLatexMode()
            }
        })
    }

    isFormulaAlreadyInBox() {
        return this.node && this.node.type && this.node.type.name==='equation'
    }

    destroy() {
        if (this.isDialogInitialized) {
            this.dialog.dialog('destroy').remove()
        }
        this.dialogButtons = []
    }

    show() {
        this.node = this.editor.currentPm.selection.node
        this.destroy()
        this.initializeButtons()
        this.dialog.dialog({
            buttons: this.dialogButtons,
            title: gettext('Latex equation'),
            modal: true,
            close: () => {
                this.destroy()
                this.isDialogInitialized = false
                this.mathQuill.destroy()
            }
        })

        this.mathQuill = new FormulaEditor(jQuery(this.dialog), this.equation)
        this.isDialogInitialized = true
    }
}