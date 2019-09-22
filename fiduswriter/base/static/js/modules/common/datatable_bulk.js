import {escapeText, whenReady} from "./basic"

let bulk_id = 0

export class DatatableBulk {
    constructor(overview, actions) {
        this.id = `dt-bulk-${++bulk_id}`
        this.overview = overview
        this.actions = actions
        this.opened = false
    }

    init(table) {
        this.table = table
        whenReady().then(()=>this.bindEvents())
    }

    bindEvents() {
        this.overview.dom.addEventListener('click', this.onClick.bind(this))
        this.table.addEventListener('change', this.onTableCheckChange.bind(this))
        this.onTableCheckChange()
    }

    onTableCheckChange() {
        const el = this.overview.dom.querySelector(`#${this.id}`)
        if (!el) {
            return
        }

        if (this.isAllChecked()) {
            el.querySelector('input[type=checkbox]').checked = true
        } else {
            el.querySelector('input[type=checkbox]').checked = false
        }

        if (this.isChecked()) {
            el.classList.remove('disabled')
        } else {
            el.classList.add('disabled')
        }
    }

    isAllChecked() {
        const checkboxes = this.table.querySelectorAll('input.entry-select[type=checkbox]')
        const unchecked = [].filter.call(checkboxes, box => !box.checked)
        return !(unchecked && unchecked.length)
    }

    isChecked() {
        const checkedBoxes = this.table.querySelectorAll('input.entry-select[type=checkbox]:checked')
        return checkedBoxes && checkedBoxes.length
    }

    onClick(event) {
        const target = event.target
        const lastOpened = this.opened

        if (lastOpened) {
            this.opened = false
            const el = document.querySelector(`#${this.id}`)
            if (el) {
                el.classList.remove('opened')
            }
        }

        if (target.matches(`#${this.id} *`)) {
            event.preventDefault()
            event.stopImmediatePropagation()
            event.stopPropagation()

            if (target.matches('.dt-bulk-dropdown, .dt-bulk-dropdown *')) {
                // Dropdown
                if (!lastOpened) {
                    this.opened = true
                    const el = document.querySelector(`#${this.id}`)
                    if (el) {
                        el.classList.add('opened')
                    }

                }
            } else if (target.matches('.fw-check + label, .fw-check + label *')) {
                // Click on bulk checkbox
                const isChecked = this.isAllChecked()
                target.closest('div.dataTable-wrapper').querySelector('input[type=checkbox]').checked = !isChecked
                this.table.querySelectorAll('input.entry-select[type=checkbox]').forEach(checkbox => checkbox.checked = !isChecked)
                this.onTableCheckChange()
            } else if (target.matches('.fw-pulldown-item')) {
                // Click on action pulldown
                const actionId = parseInt(target.dataset.id)
                this.actions[actionId].action(this.overview)
            }
        }
    }

    getHTML() {
        const pulldownOptions = this.actions.map((action, i) => {
            return `<li><span data-id="${i}" class="fw-pulldown-item">${escapeText(action.title)}</span></li>`
        }).join('')

        return (
            `<div id="${this.id}" class="dt-bulk${this.opened ? ' opened' : ''}">
                <input type="checkbox" id="${this.id}_check" class="fw-check"><label for="${this.id}_check"></label>
                <span class="dt-bulk-dropdown"><i class="fa fa-caret-down"></i></span>
                <div class="fw-pulldown fw-left">
                    <ul>${pulldownOptions}</ul>
                </div>
            </div>`
        )
    }
}
