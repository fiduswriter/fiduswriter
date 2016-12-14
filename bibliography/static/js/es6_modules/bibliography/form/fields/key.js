import {LiteralFieldForm} from "./literal"
import {noSpaceTmp} from "../../../common/common"
import {BibOptionTitles} from "../titles"

export class KeyFieldForm{
    constructor(dom, initialValue, unused = undefined, fieldType = undefined) {
        this.currentValue = {}
        this.dom = dom
        this.fieldType = fieldType
        // We set the mode based on the type of value
        if (typeof initialValue==='object') {
            this.predefined = false
            this.currentValue['custom'] = initialValue
        } else {
            this.predefined = true
            this.currentValue['predefined'] = initialValue
        }
    }

    init() {
        this.drawForm()
    }

    drawForm() {
        if (this.predefined) {
            this.drawSelectionListForm()
        } else {
            this.drawCustomInputForm()
        }
    }

    drawSelectionListForm() {
        let that = this
        this.dom.innerHTML = noSpaceTmp`
            <div class='selection-list input-with-button'>
                <button class="switch-type fw-button fw-green">${gettext('From list')}</button>
                <select class='key-selection'><option value=''></option></select>
                <div class="select-arrow icon-down-dir"></div>
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

        if (this.fieldType.strict) {
            this.dom.querySelector('.switch-type').classList.add('disabled')
        } else {
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
                this.currentValue['custom'] = formValue
            }
        }
        this.predefined = !this.predefined
        this.drawForm()
    }

    drawCustomInputForm() {
        let that = this
        this.fields = {}
        this.dom.innerHTML = noSpaceTmp`
            <div class='key-field input-with-button'>
                <button class="switch-type fw-button fw-green">${gettext('Custom')}</button>
                <div class='custom-input field-part field-part-single'></div>
            </div>
        `
        this.fields['custom'] = new LiteralFieldForm(
            this.dom.querySelector('.custom-input'),
            this.currentValue['custom']
        )
        this.fields.custom.init()
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
            if (!this.fields.custom.value) {
                return false
            }
            return this.fields.custom.value
        }
    }

    check() {
        return true
    }
}
