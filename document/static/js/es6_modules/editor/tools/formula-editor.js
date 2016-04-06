/**
 * Created by alex on 30.03.16.
 */

import "node-mathquill/build/mathquill"

/**
 * Class to initialize and manage MathQuill library inside editor dialog (math.js)
 */
export class FormulaEditor {
    constructor(mathDialog, equation) {
        let mathField = mathDialog.find("p > span.math-field")[0]
        let latexField = mathDialog.find("p > span.math-latex")[0]

        this.MQ = MathQuill.getInterface(2)

        this.mathField = this.MQ.MathField(mathField, {
            spaceBehavesLikeTab: true,
            handlers : {
                edit: () => {
                    latexField.textContent = this.mathField.latex()
                }
            }
        })

        this.mathField.latex(equation)
    }
}