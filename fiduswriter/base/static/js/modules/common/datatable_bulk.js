import {whenReady} from "./basic"
import {ContentMenu} from "./content_menu"


let bulkId = 0

export class DatatableBulk {
    constructor(overview, model) {
        this.id = `dt-bulk-${++bulkId}`
        this.page = overview
        this.model = model
    }

    init(table) {
        this.table = table
        whenReady().then(() => this.bindEvents())
    }


    update() {
        this.model.content = this.model.content.sort((a, b) => a.order - b.order)
    }

    bindEvents() {
        this.page.dom.addEventListener('click', this.onClick.bind(this))
        this.table.addEventListener('change', this.onTableCheckChange.bind(this))
        this.onTableCheckChange()
    }

    onTableCheckChange() {
        const el = this.page.dom.querySelector(`#${this.id}`)
        if (!el) {
            return
        }

        if (this.isAllChecked()) {
            el.querySelector('input[type=checkbox]').checked = true
        } else {
            el.querySelector('input[type=checkbox]').checked = false
        }
    }

    isAllChecked() {
        const checkBoxes = Array.from(this.table.querySelectorAll('input.entry-select[type=checkbox]'))
        const unchecked = checkBoxes.filter(box => !box.checked)
        return !unchecked.length && checkBoxes.length
    }

    onClick(event) {
        const target = event.target

        if (target.matches(`#${this.id} *`)) {
            event.preventDefault()
            event.stopImmediatePropagation()
            event.stopPropagation()

            if (target.matches('.dt-bulk-dropdown, .dt-bulk-dropdown *')) {
                // Dropdown
                const el = document.querySelector(`#${this.id}`)
                if (el) {
                    const contentMenu = new ContentMenu({
                        menu: this.model,
                        width: 280,
                        page: this.page,
                        menuPos: {X: parseInt(event.pageX), Y: parseInt(event.pageY)}
                    })
                    contentMenu.open()
                }

            } else if (target.matches('.fw-check + label, .fw-check + label *')) {
                // Click on bulk checkbox
                const isChecked = this.isAllChecked()
                target.closest('div.dataTable-wrapper').querySelector('input[type=checkbox]').checked = !isChecked
                this.table.querySelectorAll('input.entry-select[type=checkbox]').forEach(checkbox => checkbox.checked = !isChecked)
                this.onTableCheckChange()
            }
        } else if (target.matches('.fw-data-table .entry-select + label')) {
            // The browser will try to scroll the checkbox into view and that will break the page layout.
            event.preventDefault()
            event.stopImmediatePropagation()
            event.stopPropagation()
            target.previousElementSibling.checked = !target.previousElementSibling.checked
        }
    }

    getHTML() {
        return (
            `<div id="${this.id}" class="dt-bulk">
                <input type="checkbox" id="${this.id}_check" class="fw-check"><label for="${this.id}_check"></label>
                <span class="dt-bulk-dropdown"><i class="fa fa-caret-down"></i></span>
            </div>`
        )
    }
}
