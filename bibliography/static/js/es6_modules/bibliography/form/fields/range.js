import {LiteralFieldForm} from "./literal"
import {noSpaceTmp} from "../../../common/common"

// There are only range lists, no range fields in the data format. The separation
// between RangeFieldForm and RangeListForm is for keeping consistency with other fields
// and lists.

export class RangeFieldForm{
    constructor(dom, initialValue = [[]]) {
        this.currentValue = initialValue
        this.dom = dom
        // We set the mode based on whether there is one or two initial values.
        if (initialValue.length > 1) {
            this.range = true
        } else {
            this.range = false
        }
    }

    init() {
        this.drawForm()
    }

    drawForm() {
        if (this.range) {
            this.drawRangeForm()
        } else {
            this.drawSingleValueForm()
        }
    }

    drawRangeForm() {
        this.fields = {}
        this.dom.innerHTML = noSpaceTmp`
            <div class='range-field input-with-button'>
                <button class="switch-type fw-button fw-green">${gettext('Range')}</button>
                <div class='range-from field-part field-part-huge'></div>
                <div class='range-to field-part field-part-huge'></div>
            </div>
        `
        this.fields['from'] = new LiteralFieldForm(
            this.dom.querySelector('.range-from'),
            this.currentValue[0],
            gettext('From')
        )
        this.fields.from.init()
        this.fields['to'] = new LiteralFieldForm(
            this.dom.querySelector('.range-to'),
            this.currentValue[1],
            gettext('To')
        )
        this.fields.to.init()
        this.dom.querySelector('.switch-type').addEventListener(
            'click',
            () => this.switchMode()
        )
    }

    switchMode() {
        let formValue = this.value
        if (formValue) {
            Object.assign(this.currentValue, formValue)
        }
        this.range = !this.range
        this.drawForm()
    }

    drawSingleValueForm() {
        this.fields = {}
        this.dom.innerHTML = noSpaceTmp`
            <div class='range-field input-with-button'>
                <button class="switch-type fw-button fw-green">${gettext('Single value')}</button>
                <div class='single-value field-part field-part-single'></div>
            </div>
        `
        this.fields['single'] = new LiteralFieldForm(
            this.dom.querySelector('.single-value'),
            this.currentValue[0]
        )
        this.fields.single.init()
        this.dom.querySelector('.switch-type').addEventListener(
            'click',
            () => this.switchMode()
        )
    }

    get value() {
        if (this.range) {
                if (
                    !this.fields.from.value &&
                    !this.fields.to.value
                ) {
                    return false
                }
            return [
                this.fields.from.value ? this.fields.from.value : '',
                this.fields.to.value ? this.fields.to.value : ''
            ]
        } else {
            if (!this.fields.single.value) {
                return false
            }
            return [
                this.fields.single.value
            ]
        }
    }

    check() {
        return true
    }
}
