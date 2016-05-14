/**
 * Created by alex on 30.03.16.
 */

import "mathquill/build/mathquill"
import {render as katexRender} from "katex"

/**
 * Class to initialize and manage MathQuill library inside editor dialog (math.js)
 */
export class FormulaEditor {
    constructor(mathDialog, equation) {
        this.dialog = mathDialog

        this.mathFieldDOM = mathDialog.find("p > span.math-field")
        this.latexFieldDOM = mathDialog.find("p > span.math-latex")
        this.errorFieldDOM = mathDialog.find("div.math-error")
        this.isRawMode = false

        //initializes mathquill library
        this.MQ = MathQuill.getInterface(2)

        this.mathField = this.MQ.MathField(this.mathFieldDOM[0], {
            spaceBehavesLikeTab: true,
            //to update text field for raw latex representation (not raw latex mode)
            handlers : {
                edit: () => {
                    this.latexFieldDOM.text(this.mathField.latex())
                }
            }
        })

        this.mathField.latex(equation)
    }

    /**
     * Destroy mathquill object. reinitialize it to work with raw latex
     */
    switchToRawLatexMode() {
        let latexText = this.getLatex()
        this.mathField = null
        //change from span to input in template
        this.mathFieldDOM.replaceWith('<input class="math-field" type="text" name="math" value="' + latexText + '" />')

        this.mathFieldDOM = this.dialog.find("p > input.math-field")

        //render latex formula using katex
        katexRender(this.getLatex(), this.latexFieldDOM[0])

        //live-update of katex rendering
        this.mathFieldDOM.on('input', () => {
            try {
                this.latexFieldDOM.text("")
                katexRender(this.getLatex(), this.latexFieldDOM[0])
                this.hideError()
            }
            catch(msg) {
                //if error show it
                this.showError(msg)
            }
        })

        this.isRawMode = true
    }

    /**
     * Get latex representation as text
     * @returns {string} latex formula
     */
    getLatex() {
        if (this.isRawMode) {
            return this.mathFieldDOM.val()
        }
        return this.latexFieldDOM.text()
    }

    /**
     *
     * @param {string} msg Error message
     */
    showError(msg) {
        this.errorFieldDOM.text(msg).show()
    }

    /**
     * Hide error span
     */
    hideError() {
        this.errorFieldDOM.hide()
    }

    /**
     * Clear resources. switch back from raw latex mode
     */
    destroy() {
        if (this.isRawMode) {
            this.mathFieldDOM.replaceWith('<span class="math-field" type="text" name="math" ></span>')
            this.isRawMode = false
        }

        this.hideError()
        this.mathField = null
    }
}
