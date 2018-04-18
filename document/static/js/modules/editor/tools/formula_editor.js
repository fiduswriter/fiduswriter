import {escapeText} from "../../common"

import "mathquill/build/mathquill"
import {katexRender} from "../../katex"

/**
 * Class to initialize and manage MathQuill library inside editor dialog (math.js)
 */
export class FormulaEditor {
    constructor(mathDialog, equation) {
        this.dialog = mathDialog

        this.mathquillDOM = mathDialog.dialogEl.querySelector("p > .math-field")
        this.rawInputDOM = mathDialog.dialogEl.querySelector("div > .raw-input")
        this.previewDOM = mathDialog.dialogEl.querySelector("div.math-preview")
        this.errorFieldDOM = mathDialog.dialogEl.querySelector("div.math-error")
        this.isRawMode = false

        //initializes mathquill library
        this.MQ = MathQuill.getInterface(2)

        this.mathField = this.MQ.MathField(this.mathquillDOM, {
            spaceBehavesLikeTab: true,
        })

        this.mathField.latex(equation)
    }

    /**
     * Destroy mathquill object. reinitialize it to work with raw latex
     */
    switchLatexGraphicMode() {
        let latexText = this.getLatex()

        if (this.isRawMode) {
            this.mathField.latex(latexText)
            this.mathquillDOM.style.display = ''
            this.rawInputDOM.style.display = 'none'
            this.previewDOM.innerHTML = ''
            this.isRawMode = false
        } else {
            //change from span to input in template
            this.mathquillDOM.style.display = 'none'
            this.rawInputDOM.style.display = ''
            this.rawInputDOM.value = latexText

            //render latex formula using katex
            katexRender(this.getLatex(), this.previewDOM, {throwOnError: false})

            //live-update of katex rendering
            this.rawInputDOM.addEventListener('input', () => {
                try {
                    this.previewDOM.innerHTML = ''
                    katexRender(this.getLatex(), this.previewDOM)
                    this.hideError()
                }
                catch(msg) {
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
        return this.mathField.latex()
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
