import {TypeSwitch, getFocusIndex, setFocusIndex} from "fwtoolkit"
import {LiteralFieldForm} from "./literal"

// There are only range lists, no range fields in the data format. The separation
// between RangeFieldForm and RangeListForm is for keeping consistency with other fields
// and lists.

export class RangeFieldForm {
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
        this.typeSwitch = new TypeSwitch({
            dom: this.dom,
            label1: gettext("Single value"),
            label2: gettext("Range"),
            initialMode: this.range ? 2 : 1,
            beforeChange: () => {
                const formValue = this.value
                if (formValue) {
                    Object.assign(this.currentValue, formValue)
                }
            },
            onChange: mode => {
                this.range = mode === 2
                const focusIndex = getFocusIndex()
                this.drawForm()
                setFocusIndex(focusIndex)
            }
        })
        this.drawForm()
    }

    drawForm() {
        if (this.range) {
            this.drawRangeForm()
        } else {
            this.drawSingleValueForm()
        }
    }

    drawSingleValueForm() {
        this.fields = {}
        this.typeSwitch.innerElement.innerHTML = `<div class='single-value field-part field-part-single'></div>`
        this.fields["single"] = new LiteralFieldForm(
            this.typeSwitch.innerElement.querySelector(".single-value"),
            this.currentValue[0]
        )
        this.fields.single.init()
    }

    drawRangeForm() {
        this.fields = {}
        this.typeSwitch.innerElement.innerHTML = `
                <div class='range-from field-part field-part-huge'></div>
                <div class='range-to field-part field-part-huge'></div>
            `
        this.fields["from"] = new LiteralFieldForm(
            this.typeSwitch.innerElement.querySelector(".range-from"),
            this.currentValue[0],
            gettext("From")
        )
        this.fields.from.init()
        this.fields["to"] = new LiteralFieldForm(
            this.typeSwitch.innerElement.querySelector(".range-to"),
            this.currentValue[1],
            gettext("To")
        )
        this.fields.to.init()
    }

    get value() {
        if (this.range) {
            if (!this.fields.from.value && !this.fields.to.value) {
                return false
            }
            return [
                this.fields.from.value
                    ? this.fields.from.value
                    : [{type: "text", text: ""}],
                this.fields.to.value
                    ? this.fields.to.value
                    : [{type: "text", text: ""}]
            ]
        } else {
            if (!this.fields.single.value) {
                return false
            }
            return [this.fields.single.value]
        }
    }

    check() {
        return true
    }
}
