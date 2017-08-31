import {LiteralFieldForm} from "./literal"
import {noSpaceTmp} from "../../../common"

export class LiteralListForm{
    constructor(dom, initialValue = [[]]) {
        this.currentValue = initialValue
        this.dom = dom
    }

    init() {
        this.drawForm()
    }

    drawForm() {
        this.fields = []
        this.dom.innerHTML = '<table><tbody></tbody></table>'
        this.currentValue.forEach((fieldValue, index) => {
            this.addField(fieldValue, index)
        })
    }

    addField(fieldValue, index) {
        this.dom.firstChild.firstChild.insertAdjacentHTML(
            'beforeend',
            noSpaceTmp`
            <tr>
                <td></td>
                <td>
                    <span class="fa fa-minus-circle"></span>&nbsp;
                    <span class="fa fa-plus-circle"></span>
                </td>
            </tr>`
        )
        let fieldDOM = this.dom.firstChild.firstChild.lastChild
        let fieldHandler = new LiteralFieldForm(fieldDOM.firstChild, fieldValue)
        fieldHandler.init()
        this.fields.push(fieldHandler)

        // click on plus
        let addItemEl = fieldDOM.querySelector('.fa-plus-circle')
        addItemEl.addEventListener('click', () => {
            if (!this.value) {
                return
            }
            this.currentValue = this.value
            this.currentValue.splice(index+1, 0, [])
            this.drawForm()
        })

        // Click on minus
        let removeItemEl = fieldDOM.querySelector('.fa-minus-circle')
        removeItemEl.addEventListener('click', () => {
            if (!this.value) {
                return
            }
            this.currentValue = this.value
            this.currentValue.splice(index, 1)
            if (this.currentValue.length === 0) {
                this.currentValue = [[]]
            }
            this.drawForm()
        })
    }

    get value() {
        let formValue = this.fields.map(field => {return field.value}).filter(
            value => {return value !== false}
        )
        if (formValue.length === 0) {
            return false
        }
        return formValue
    }

    check() {
        return true
    }
}
