import {LiteralFieldForm} from "./literal"
import {noSpaceTmp} from "../../../common/common"

// There are only name lists, no name fields in the data format. The separation
// between NameFieldForm and NameListForm is for keeping consistency with other fields
// and lists.

export class NameFieldForm{
    constructor(dom, initialValue = {
            given: [],
            family: [],
            prefix: [],
            suffix: [],
            prefixused: false,
            literal: []
        }) {
        this.currentValue = initialValue
        this.dom = dom
        // We set the mode based on whether there was a literal name.
        if (initialValue.literal) {
            this.realPerson = false
        } else {
            this.realPerson = true
        }
    }

    init() {
        this.drawForm()
    }

    drawForm() {
        if (this.realPerson) {
            this.drawPersonForm()
        } else {
            this.drawOrganizationForm()
        }
    }

    drawPersonForm() {
        this.fields = {}
        this.dom.innerHTML = noSpaceTmp`
            <div class='person input-with-button'>
                <button class="switch-type fw-button fw-green">${gettext('Person')}</button>
                <div class='given field-part field-part-long'></div>
                <div class='prefix field-part field-part-short'></div>
                <div class='family field-part field-part-long'></div>
                <div class='suffix field-part field-part-short'></div>
                <div class='prefixused field-part'>
                    <input type='checkbox' class='prefixused'
                        ${this.currentValue.prefixused? 'checked' : ''}>
                    &nbsp;${gettext('Prefix used')}
                </div>
            </div>
        `
        this.fields['given'] = new LiteralFieldForm(
            this.dom.querySelector('.given'),
            this.currentValue.given,
            gettext('First name')
        )
        this.fields.given.init()
        this.fields['prefix'] = new LiteralFieldForm(
            this.dom.querySelector('.prefix'),
            this.currentValue.prefix,
            gettext('Prefix')
        )
        this.fields.prefix.init()
        this.fields['family'] = new LiteralFieldForm(
            this.dom.querySelector('.family'),
            this.currentValue.family,
            gettext('Last name')
        )
        this.fields.family.init()
        this.fields['suffix'] = new LiteralFieldForm(
            this.dom.querySelector('.suffix'),
            this.currentValue.suffix,
            gettext('Suffix')
        )
        this.fields.suffix.init()
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
        this.realPerson = !this.realPerson
        this.drawForm()
    }

    drawOrganizationForm() {
        this.fields = {}
        this.dom.innerHTML = noSpaceTmp`
            <div class='organization input-with-button'>
                <button class="switch-type fw-button fw-green">${gettext('Organization')}</button>
                <div class='literal-text field-part field-part-single'></div>
            </div>
        `
        this.fields['literal'] = new LiteralFieldForm(
            this.dom.querySelector('.literal-text'),
            this.currentValue.literal,
            gettext('Organization name')
        )
        this.fields.literal.init()
        this.dom.querySelector('.switch-type').addEventListener(
            'click',
            () => this.switchMode()

        )
    }

    get value() {
        if (this.realPerson) {
                if (
                    !this.fields.family.value &&
                    !this.fields.given.value &&
                    !this.fields.prefix.value &&
                    !this.fields.suffix.value
                ) {
                    return false
                }
            let returnObject = {
                family: this.fields.family.value ? this.fields.family.value : [],
                given: this.fields.given.value ? this.fields.given.value : [],
            }
            if (this.fields.prefix.value) {
                returnObject['prefix'] = this.fields.prefix.value
                returnObject['prefixused'] = this.dom.querySelector('.prefixused').checked
            }
            if (this.fields.suffix.value) {
                returnObject['suffix'] = this.fields.suffix.value
            }
            return returnObject
        } else {
            if (!this.fields.literal.value) {
                return false
            }
            return {
                literal: this.fields.literal.value
            }
        }
    }

    check() {
        return true
    }
}
