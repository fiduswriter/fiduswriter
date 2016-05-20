import {mathDialogTemplate} from "./templates"
import {FormulaEditor} from '../../tools/formula-editor'

/**
 * Class to work with formula dialog
 */
export class MathDialog {
    constructor(mod) {
        this.editor = mod.editor
        this.dialogButtons = []
        this.defaultEquation = '\\$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'

        this.setToDefault()

        this.node = null
        this.mathQuill = null
    }

    setToDefault() {
        this.submitMessage = gettext('Insert')
        this.equation = this.defaultEquation
        this.isMathInside = false
        this.isDialogInitialized = false
        this.dialog = jQuery(mathDialogTemplate())
    }

    /**
     * Initializes dialog buttons
     */
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
            click: (event) => {
                event.preventDefault()

                if (!this.isDialogInitialized) {
                    return
                }

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
            class: 'fw-button fw-dark',
            click: (e) => {
                jQuery(e.currentTarget).hide()
                this.mathQuill.switchToRawLatexMode()
            }
        })
    }

    isFormulaAlreadyInBox() {
        return this.node && this.node.type && this.node.type.name==='equation'
    }

    /**
     * Clear resources
     */
    destroy() {
        if (this.isDialogInitialized) {
            this.dialog.dialog('destroy').remove()
            this.setToDefault()
        }
        this.dialogButtons = []
    }

    show() {
        //get selected node
        this.node = this.editor.currentPm.selection.node
        //if dialog is initialized destroy
        this.destroy()
        this.initializeButtons()
        //initialize dialog and open it
        this.dialog.dialog({
            buttons: this.dialogButtons,
            title: gettext('Latex equation'),
            modal: true,
            close: () => {
                //clear resources
                this.destroy()
                this.mathQuill.destroy()
            }
        })

        //initialize advanced formula editor using mathquill
        this.mathQuill = new FormulaEditor(jQuery(this.dialog), this.equation)
        this.isDialogInitialized = true
    }
}