import {CheckableList} from "fwtoolkit"

export class CatsForm {
    constructor(dom, initialValue = [], options = []) {
        this.dom = dom
        this.checkableList = new CheckableList({
            dom,
            options: options.map(option => ({
                id: option.id,
                label: option.category_title
            })),
            initialValue,
            multiple: true
        })
    }

    init() {
        // CheckableList is already rendered by the constructor.
    }

    get value() {
        return this.checkableList.value
    }
}
