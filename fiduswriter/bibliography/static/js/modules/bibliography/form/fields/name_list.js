import {noSpaceTmp} from "../../../common"
import {NameFieldForm} from "./name"

export class NameListForm {
    constructor(dom, initialValue = [[]]) {
        this.currentValue = initialValue
        this.dom = dom
    }

    init() {
        this.drawForm()
    }

    drawForm() {
        this.fields = []
        this.dom.innerHTML =
            '<table class="input-list-wrapper"><tbody></tbody></table>'
        this.currentValue.forEach((fieldValue, index) => {
            this.addField(fieldValue, index)
        })
    }

    addField(fieldValue, index) {
        this.dom.firstChild.firstChild.insertAdjacentHTML(
            "beforeend",
            noSpaceTmp`
            <tr>
                <td></td>
                <td class="input-field-list-ctrl">
                    <span class="fa fa-minus-circle"></span>&nbsp;
                    <span class="fa fa-plus-circle"></span>
                </td>
            </tr>`
        )
        const fieldDOM = this.dom.firstChild.firstChild.lastChild
        const fieldHandler = new NameFieldForm(fieldDOM.firstChild, fieldValue)
        fieldHandler.init()
        this.fields.push(fieldHandler)

        // click on plus
        const addItemEl = fieldDOM.querySelector(".fa-plus-circle")
        addItemEl.addEventListener("click", () => {
            if (!this.value) {
                return
            }
            this.currentValue = this.value
            this.currentValue.splice(index + 1, 0, [])
            this.drawForm()
        })

        // Click on minus
        const removeItemEl = fieldDOM.querySelector(".fa-minus-circle")
        removeItemEl.addEventListener("click", () => {
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
        const formValue = this.fields
            .map(field => {
                return field.value
            })
            .filter(value => {
                return value !== false
            })
        if (formValue.length === 0) {
            return false
        }
        return formValue
    }

    check() {
        return true
    }
}
