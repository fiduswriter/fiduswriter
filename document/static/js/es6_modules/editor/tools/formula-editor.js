/**
 * Created by alex on 30.03.16.
 */

import "node-mathquill/build/mathquill"
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

        this.MQ = MathQuill.getInterface(2)

        this.mathField = this.MQ.MathField(this.mathFieldDOM[0], {
            spaceBehavesLikeTab: true,
            handlers : {
                edit: () => {
                    this.latexFieldDOM.text(this.mathField.latex())
                }
            }
        })

        this.mathField.latex(equation)
    }

    switchToRawLatexMode() {
        let latexText = this.getLatex()
        this.mathField = null
        this.mathFieldDOM.replaceWith('<input class="math-field" type="text" name="math" value="' + latexText + '" />')

        this.mathFieldDOM = this.dialog.find("p > input.math-field")
        katexRender(this.getLatex(), this.latexFieldDOM[0])

        this.mathFieldDOM.on('input', () => {
            try {
                this.latexFieldDOM.text("")
                katexRender(this.getLatex(), this.latexFieldDOM[0])
                this.hideError()
            }
            catch(msg) {
                this.showError(msg)
            }
        })

        this.isRawMode = true
    }

    getLatex() {
        if (this.isRawMode) {
            return this.mathFieldDOM.val()
        }
        return this.latexFieldDOM.text()
    }

    showError(msg) {
        this.errorFieldDOM.text(msg).show()
    }

    hideError() {
        this.errorFieldDOM.hide()
    }

    destroy() {
        if (this.isRawMode) {
            this.mathFieldDOM.replaceWith('<span class="math-field" type="text" name="math" ></span>')
            this.isRawMode = false
        }

        this.hideError()
        this.mathField = null
    }
}