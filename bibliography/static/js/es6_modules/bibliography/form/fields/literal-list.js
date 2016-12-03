import {LitFieldForm} from "./literal"

export class LitListForm{
    constructor(initialValue, dom) {
        this.initialValue = initialValue
        this.dom = dom
        this.fields = []
    }

    init() {
        let that = this
        this.dom.innerHTML = '<table><tbody></tbody></table>'
        if (this.initialValue) {
            this.initialValue.forEach(fieldValue => {
                that.addField(fieldValue)
            })
        } else {
            this.addField()
        }
    }

    addField(fieldValue) {
        this.dom.firstChild.firstChild.insertAdjacentHTML('beforeend','<tr><td></td><td><span class="icon-minus-circle"></span><span class="icon-plus-circle"></span></td></tr>')
        let fieldDOM = this.dom.firstChild.firstChild.lastChild
        let fieldHandler = new LitFieldForm(fieldValue, fieldDOM.firstChild)
        fieldHandler.init()
        this.fields.push(fieldHandler)
    }

    get value() {
        return this.fields.map(field => {return field.value})
    }
}
