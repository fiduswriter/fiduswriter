import {LiteralFieldForm} from "./literal"
import {noSpaceTmp} from "../../../common/common"
import {BibOptionTitles} from "../titles"

export class KeyFieldForm{
    constructor(dom, initialValue = '', unused, fieldType) {
        this.currentValue = {}
        this.dom = dom
        this.fieldType = fieldType
        // We set the mode based on the type fo value
        if (typeof initialValue==='string') {
            this.predefined = true
            this.currentValue['predefined'] = initialValue
        } else {
            this.predefined = false
            this.currentValue['costum'] = initialValue
        }
    }

    init() {
        this.drawForm()
    }

    drawForm() {
        if (this.predefined) {
            this.drawSelectionListForm()
        } else {
            this.drawCostumInputForm()
        }
    }

    drawSelectionListForm() {
        let that = this
        this.dom.innerHTML = noSpaceTmp`
            <div class='selection-list input-with-button'>
                <select class='key-selection'><option value=''></option></select>
            </div>
        `
        let selectEl = this.dom.querySelector('.key-selection')
        if(Array.isArray(this.fieldType.options)) {
            this.fieldType.options.forEach(option => {
                selectEl.insertAdjacentHTML('beforeend',`<option value="${option}">${BibOptionTitles[option]}</option>`)
            })
        } else {
            Object.keys(this.fieldType.options).forEach(option => {
                selectEl.insertAdjacentHTML('beforeend',`<option value="${option}">${BibOptionTitles[option]}</option>`)
            })
        }

        if (this.currentValue['predefined']) {
            selectEl.value = this.currentValue['predefined']
        }

        if (!this.fieldType.strict) {
            this.dom.querySelector('.selection-list').insertAdjacentHTML(
                'beforeend',
                `<button class="switch-type fw-button fw-green">${gettext('Costum')}</button>`
            )
            this.dom.querySelector('.switch-type').addEventListener('click', ()=>{
                that.switchMode()
            })
        }

    }

    switchMode() {
        let formValue = this.value
        if (formValue) {
            if (this.predefined) {
                this.currentValue['predefined'] = formValue
            } else {
                this.currentValue['costum'] = formValue
            }
        }
        this.predefined = !this.predefined
        this.drawForm()
    }

    drawCostumInputForm() {
        let that = this
        this.fields = {}
        this.dom.innerHTML = noSpaceTmp`
            <div class='key-field input-with-button'>
                <div class='costum-input field-part field-part-single'></div>
                <button class="switch-type fw-button fw-green">${gettext('Predefined')}</button>
            </div>
        `
        this.fields['costum'] = new LiteralFieldForm(
            this.dom.querySelector('.costum-input'),
            this.currentValue['costum']
        )
        this.fields.costum.init()
        this.dom.querySelector('.switch-type').addEventListener('click', ()=>{
            that.switchMode()
        })
    }

    get value() {
        if (this.predefined) {
            let selectEl = this.dom.querySelector('.key-selection')
            let selectionValue = selectEl.options[selectEl.selectedIndex].value
            if (selectionValue === '') {
                return false
            } else {
                return selectionValue
            }
        } else {
            if (!this.fields.costum.value) {
                return false
            }
            return this.fields.costum.value
        }
    }

    get check() {
        return true
    }
}
