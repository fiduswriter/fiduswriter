/**
 * Created by alex on 30.03.16.
 */

//import {MathQuill} from "node-mathquill/build/mathquill"
import "node-mathquill/build/mathquill"

export class FormulaEditor {
    constructor(mathField) {
        this.MQ = MathQuill.getInterface(2)

        this.options = {
            spaceBehavesLikeTab: true
        }

        this.mathField = this.MQ.MathField(mathField, this.options)
    }
}