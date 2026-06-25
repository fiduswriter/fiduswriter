import {InputList} from "fwtoolkit"
import {KeyFieldForm} from "./key"

export class KeyListForm {
    constructor(dom, initialValue = [""], _unused, fieldType = undefined) {
        this.dom = dom
        this.fieldType = fieldType
        this.fieldHandlers = new WeakMap()
        this.inputList = new InputList({
            dom,
            initialValues: initialValue,
            emptyValue: "",
            renderItem: value => ({
                html: `<div class="key-field"></div>`,
                bind: el => {
                    const fieldHandler = new KeyFieldForm(
                        el.firstElementChild,
                        value,
                        false,
                        this.fieldType
                    )
                    fieldHandler.init()
                    this.fieldHandlers.set(el, fieldHandler)
                }
            }),
            getValue: el => this.fieldHandlers.get(el).value
        })
    }

    init() {
        // InputList is already rendered by the constructor.
    }

    get value() {
        const formValue = this.inputList.values.filter(value => value !== false)
        if (formValue.length === 0) {
            return false
        }
        return formValue
    }

    check() {
        return true
    }
}
