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
        // We then add the missing fields, so that we can always depend on
        // all fields being present, in case the user wants to switch.
        if (initialValue.literal) {
            this.realPerson = false
            /*this.currentValue['given'] = []
            this.currentValue['family'] = []
            this.currentValue['prefix'] = []
            this.currentValue['suffix'] = []
            this.currentValue['prefixused'] = false*/
        } else {
            this.realPerson = true
            //this.currentValue['literal'] = []
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
        let that = this
        this.fields = {}
        this.dom.innerHTML = noSpaceTmp`
            <div class='person'>
                <div class='given name-part name-part-long'></div>
                <div class='prefix name-part name-part-short'></div>
                <div class='family name-part name-part-long'></div>
                <div class='suffix name-part name-part-short'></div>
                <div class='prefixused name-part'>
                    <input type='checkbox' class='prefixused'
                        ${this.currentValue.prefixused? 'checked' : ''}>
                    &nbsp;${gettext('Prefix used')}
                </div>
                <button class="switch-type fw-button fw-green">${gettext('Organization')}</button>
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
        this.dom.querySelector('.switch-type').addEventListener('click', ()=>{
            that.switchMode()
        })
    }

    switchMode() {
        Object.assign(this.currentValue, this.value)
        this.realPerson = !this.realPerson
        this.drawForm()
    }

    drawOrganizationForm() {
        let that = this
        this.fields = {}
        this.dom.innerHTML = noSpaceTmp`
            <div class='organization'>
                <div class='literal-text name-part'></div>
                <button class="switch-type fw-button fw-green">${gettext('Person')}</button>
            </div>
        `
        this.fields['literal'] = new LiteralFieldForm(
            this.dom.querySelector('.literal-text'),
            this.currentValue.literal,
            gettext('Organization name')
        )
        this.fields.literal.init()
        this.dom.querySelector('.switch-type').addEventListener('click', ()=>{
            that.switchMode()
        })
    }

    get value() {
        if (this.realPerson) {
            return {
                family: this.fields.family.value,
                given: this.fields.given.value,
                prefix: this.fields.prefix.value,
                suffix: this.fields.suffix.value,
                prefixused: this.dom.querySelector('.prefixused').checked
            }
        } else {
            return {
                literal: this.fields.literal.value
            }
        }
    }
}
