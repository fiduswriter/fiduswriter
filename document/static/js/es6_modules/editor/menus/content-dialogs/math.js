import {mathDialogTemplate} from "./templates"
import {FormulaEditor} from '../../tools/formula-editor'

export class MathDialog {
    constructor(mod) {
        this.editor = mod.editor
        this.dialog = jQuery(mathDialogTemplate())
        this.dialogButtons = []
        this.isMathInside = false
        this.submitMessage = gettext('Insert')
        this.defaultEquation = '\\$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'

        this.equation = this.defaultEquation
        this.node = this.editor.currentPm.selection.node

        this.bindEvents()
    }

    bindEvents() {
        jQuery(document).on('mousedown', '#button-math:not(.disabled)', (event) => {
            event.preventDefault()
            this.initializeButtons()
            this.startDialog()
            let mathQuill = new FormulaEditor(jQuery(this.dialog), this.equation)
        })
    }

    initializeButtons() {
        if (this.isFormulaAlreadyInBox()) {
            this.initRemoveButtonOnFormulaUpdate()
        }
        this.initializeSubmitButton()
        this.initializeCancelButton()
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
                this.equation = this.dialog.find("p > span.math-latex").text()

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

    isFormulaAlreadyInBox() {
        return this.node && this.node.type && this.node.type.name==='equation'
    }

    startDialog() {
        this.dialog.dialog({
            buttons: this.dialogButtons,
            title: gettext('Latex equation'),
            modal: true,
            close: function () {
                jQuery(this).dialog('destroy').remove()
            }
        })
    }
}