/**
 * Created by alex on 30.03.16.
 */

import "node-mathquill/build/mathquill"

/**
 * Class to initialize and manage MathQuill library inside editor dialog (math.js)
 */
export class FormulaEditor {
    constructor(mathDialog) {
        mathField = mathDialog.children("span.math-field")[0]
        latexField = mathDialog.children("span.math-latex")[0]

        this.MQ = MathQuill.getInterface(2)

        this.mathField = this.MQ.MathField(mathField, {
            spaceBehavesLikeTab: true,
            handlers : {
                edit: function () {
                    latexField.textContent = this.mathField.latex()
                }
            }
        })
    }
}