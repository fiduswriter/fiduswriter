import {TypeSwitch} from "fwtoolkit"
import {getBibOptionTitle} from "../strings"
import {LiteralFieldForm} from "./literal"

export class KeyFieldForm {
    constructor(dom, initialValue, _unused, fieldType = undefined) {
        this.currentValue = {}
        this.dom = dom
        this.fieldType = fieldType
        // We set the mode based on the type of value
        if (typeof initialValue === "object") {
            this.predefined = false
            this.currentValue["custom"] = initialValue
        } else {
            this.predefined = true
            this.currentValue["predefined"] = initialValue
        }
    }

    init() {
        this.typeSwitch = new TypeSwitch({
            dom: this.dom,
            label1: gettext("From list"),
            label2: gettext("Custom"),
            initialMode: this.predefined ? 1 : 2,
            disabled: this.fieldType.strict,
            beforeChange: () => {
                const formValue = this.value
                if (formValue) {
                    if (this.predefined) {
                        this.currentValue["predefined"] = formValue
                    } else {
                        this.currentValue["custom"] = formValue
                    }
                }
            },
            onChange: mode => {
                this.predefined = mode === 1
                this.drawForm()
            }
        })
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
        this.typeSwitch.innerElement.innerHTML = `
                <select class='key-selection'><option value=''></option></select>
                <div class="fw-select-arrow fa fa-caret-down"></div>
            `
        const selectEl =
            this.typeSwitch.innerElement.querySelector(".key-selection")
        if (Array.isArray(this.fieldType.options)) {
            this.fieldType.options.forEach(option => {
                selectEl.insertAdjacentHTML(
                    "beforeend",
                    `<option value="${option}">${getBibOptionTitle(option)}</option>`
                )
            })
        } else {
            Object.keys(this.fieldType.options).forEach(option => {
                selectEl.insertAdjacentHTML(
                    "beforeend",
                    `<option value="${option}">${getBibOptionTitle(option)}</option>`
                )
            })
        }

        if (this.currentValue["predefined"]) {
            selectEl.value = this.currentValue["predefined"]
        }
    }

    drawCustomInputForm() {
        this.fields = {}
        this.typeSwitch.innerElement.innerHTML = `<div class='custom-input field-part field-part-single'></div>`
        this.fields["custom"] = new LiteralFieldForm(
            this.typeSwitch.innerElement.querySelector(".custom-input"),
            this.currentValue["custom"]
        )
        this.fields.custom.init()
    }

    get value() {
        if (this.predefined) {
            const selectEl =
                this.typeSwitch.innerElement.querySelector(".key-selection")
            const selectionValue =
                selectEl.options[selectEl.selectedIndex].value
            if (selectionValue === "") {
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
