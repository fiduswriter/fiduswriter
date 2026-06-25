import {InputList} from "fwtoolkit"
import {NameFieldForm} from "./name"

export class NameListForm {
    constructor(dom, initialValue = [[]]) {
        this.dom = dom
        this.fieldHandlers = new WeakMap()
        this.inputList = new InputList({
            dom,
            initialValues: initialValue,
            emptyValue: [],
            renderItem: value => ({
                html: `<div class="name-field"></div>`,
                bind: el => {
                    const fieldHandler = new NameFieldForm(
                        el.firstElementChild,
                        value
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
