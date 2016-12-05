import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Doc, Text, EmMark, LinkMark, StrongMark} from "prosemirror-old/dist/schema-basic"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {Block, Schema} from "prosemirror-old/dist/model"

export class DateFieldForm{
    constructor(dom, initialValue = '', placeHolder = '') {
        this.dom = dom
        this.initialValue = initialValue
        this.placeHolder = placeHolder
    }

    init() {
        let that = this
        this.dom.innerHTML = `<input class="date" type="text" value="${this.initialValue}" placeholder="${this.placeHolder}">`
    }

    get value() {
        let formValue = this.dom.querySelector('input.date').value
        // If the form has not been filled out, use 'uuuu' as default date
        return formValue.length > 0 ? formValue : 'uuuu'
    }

}
