import {TypeSwitch, getFocusIndex, setFocusIndex} from "fwtoolkit"
import {LiteralFieldForm} from "./literal"

// There are only name lists, no name fields in the data format. The separation
// between NameFieldForm and NameListForm is for keeping consistency with other fields
// and lists.

export class NameFieldForm {
    constructor(
        dom,
        initialValue = {
            given: [],
            family: [],
            prefix: [],
            suffix: [],
            useprefix: false,
            literal: []
        }
    ) {
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
        this.typeSwitch = new TypeSwitch({
            dom: this.dom,
            label1: gettext("Person"),
            label2: gettext("Organization"),
            initialMode: this.realPerson ? 1 : 2,
            beforeChange: () => {
                const formValue = this.value
                if (formValue) {
                    Object.assign(this.currentValue, formValue)
                }
            },
            onChange: mode => {
                this.realPerson = mode === 1
                const focusIndex = getFocusIndex()
                this.drawForm()
                setFocusIndex(focusIndex)
            }
        })
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
        this.typeSwitch.innerElement.innerHTML = `
                <div class='given field-part field-part-long'></div>
                <div class='prefix field-part field-part-short'></div>
                <div class='family field-part field-part-long'></div>
                <div class='suffix field-part field-part-short'></div>
                <div class='useprefix field-part'>
                    <input type='checkbox' class='useprefix'
                        ${this.currentValue.useprefix ? "checked" : ""}>
                    &nbsp;${gettext("Prefix used")}
                </div>
            `
        this.fields["given"] = new LiteralFieldForm(
            this.typeSwitch.innerElement.querySelector(".given"),
            this.currentValue.given,
            gettext("First name")
        )
        this.fields.given.init()
        this.fields["prefix"] = new LiteralFieldForm(
            this.typeSwitch.innerElement.querySelector(".prefix"),
            this.currentValue.prefix,
            gettext("Prefix")
        )
        this.fields.prefix.init()
        this.fields["family"] = new LiteralFieldForm(
            this.typeSwitch.innerElement.querySelector(".family"),
            this.currentValue.family,
            gettext("Last name")
        )
        this.fields.family.init()
        this.fields["suffix"] = new LiteralFieldForm(
            this.typeSwitch.innerElement.querySelector(".suffix"),
            this.currentValue.suffix,
            gettext("Suffix")
        )
        this.fields.suffix.init()
    }

    drawOrganizationForm() {
        this.fields = {}
        this.typeSwitch.innerElement.innerHTML = `<div class='literal-text field-part field-part-single'></div>`
        this.fields["literal"] = new LiteralFieldForm(
            this.typeSwitch.innerElement.querySelector(".literal-text"),
            this.currentValue.literal,
            gettext("Organization name")
        )
        this.fields.literal.init()
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
            const returnObject = {
                family: this.fields.family.value
                    ? this.fields.family.value
                    : [],
                given: this.fields.given.value ? this.fields.given.value : []
            }
            if (this.fields.prefix.value) {
                returnObject["prefix"] = this.fields.prefix.value
                returnObject["useprefix"] =
                    this.typeSwitch.innerElement.querySelector(
                        "input.useprefix"
                    ).checked
                        ? true
                        : false
            }
            if (this.fields.suffix.value) {
                returnObject["suffix"] = this.fields.suffix.value
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
