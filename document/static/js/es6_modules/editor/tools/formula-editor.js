/**
 * Created by alex on 30.03.16.
 */

import "node-mathquill/build/mathquill"
import {render as katexRender} from "katex"
import {renderMathInElement} from "katex/dist/contrib/auto-render.min"

/**
 * Class to initialize and manage MathQuill library inside editor dialog (math.js)
 */
export class FormulaEditor {
    constructor(mathDialog, equation) {
        this.dialog = mathDialog

        this.mathFieldDOM = mathDialog.find("p > span.math-field")
        this.latexFieldDOM = mathDialog.find("p > span.math-latex")

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
        this.mathField = null
        this.mathFieldDOM.replaceWith('<input class="math-field" type="text" name="math" >'+ this.latexFieldDOM.text() +'</input>')
        renderMathInElement(this.getLatex(), this.latexFieldDOM[0])
    }

    getLatex() {
        return jQuery(this.latexFieldDOM).text()
    }
}