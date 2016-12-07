import {LiteralFieldForm} from "./literal"
import {noSpaceTmp} from "../../../common/common"

export class LiteralListForm{
    constructor(dom, initialValue = [[]]) {
        this.currentValue = initialValue
        this.dom = dom
    }

    init() {
        this.drawForm()
    }

    drawForm() {
        let that = this
        this.fields = []
        this.dom.innerHTML = '<table><tbody></tbody></table>'
        this.currentValue.forEach((fieldValue, index) => {
            that.addField(fieldValue, index)
        })
    }

    addField(fieldValue, index) {
        let that = this
        this.dom.firstChild.firstChild.insertAdjacentHTML(
            'beforeend',
            noSpaceTmp`
            <tr>
                <td></td>
                <td>
                    <span class="icon-minus-circle"></span>
                    <span class="icon-plus-circle"></span>
                </td>
            </tr>`
        )
        let fieldDOM = this.dom.firstChild.firstChild.lastChild
        let fieldHandler = new LiteralFieldForm(fieldDOM.firstChild, fieldValue)
        fieldHandler.init()
        this.fields.push(fieldHandler)

        // click on plus
        let addItemEl = fieldDOM.querySelector('.icon-plus-circle')
        addItemEl.addEventListener('click', () => {
            that.currentValue = that.value
            that.currentValue.splice(index+1, 0, [])
            that.drawForm()
        })

        // Click on minus
        let removeItemEl = fieldDOM.querySelector('.icon-minus-circle')
        removeItemEl.addEventListener('click', () => {
            that.currentValue = that.value
            that.currentValue.splice(index, 1)
            if (that.currentValue.length === 0) {
                that.currentValue = [[]]
            }
            that.drawForm()
        })
    }

    get value() {
        return this.fields.map(field => {return field.value}).filter(value => {return value !== false})
    }

    check() {
        return true
    }
}
