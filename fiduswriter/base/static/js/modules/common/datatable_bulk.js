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
        document.body.addEventListener('click', this.onClick.bind(this))
        this.table.addEventListener('change', this.onTableCheckChange.bind(this))
        this.onTableCheckChange()
    }

    onTableCheckChange() {
        if (this.isChecked()) {
            document.querySelector(`#${this.id}`).classList.remove('disabled')
        } else {
            document.querySelector(`#${this.id}`).classList.add('disabled')
        }
    }

    isAllChecked() {
        const checkboxes = this.table.querySelectorAll('input.entry-select[type=checkbox]')
        const unchecked = [].filter.call(checkboxes, box => !box.checked)
        return !(unchecked && unchecked.length)
    }

    isChecked() {
        const checked_boxes = this.table.querySelectorAll('input.entry-select[type=checkbox]:checked')
        return checked_boxes && checked_boxes.length
    }

    onClick(event) {
        const target = event.target
        const last_opened = this.opened

        if (last_opened) {
            this.opened = false
            document.querySelector(`#${this.id}`).classList.remove('opened')
        }

        if (target.matches(`#${this.id} *`)) {
            event.preventDefault()
            event.stopImmediatePropagation()
            event.stopPropagation()

            if (target.matches('.dt-bulk-dropdown, .dt-bulk-dropdown *')) {
                // Dropdown
                if (!last_opened) {
                    this.opened = true
                    document.querySelector(`#${this.id}`).classList.add('opened')
                }
            } else if (target.matches('.fw-check + label, .fw-check + label *')) {
                // Click on bulk checkbox
                const is_checked = this.isAllChecked()
                this.table.querySelectorAll('input.entry-select[type=checkbox]').forEach(checkbox => checkbox.checked = !is_checked)
                this.onTableCheckChange()
            } else if (target.matches('.fw-pulldown-item')) {
                // Click on action pulldown
                const action_id = parseInt(target.dataset.id)
                this.actions[action_id].action(this.overview)
            }
        }
    }

    getHTML() {
        const pulldown_options = this.actions.map((action, i) => {
            return `<li><span data-id="${i}" class="fw-pulldown-item">${escapeText(action.title)}</span></li>`
        }).join('')

        return (
            `<div id="${this.id}" class="dt-bulk${this.opened ? ' opened' : ''}">
                <input type="checkbox" id="${this.id}_check" class="fw-check"><label for="${this.id}_check"></label>
                <span class="dt-bulk-dropdown"><i class="fa fa-caret-down"></i></span>
                <div class="fw-pulldown fw-left">
                    <ul>${pulldown_options}</ul>
                </div>
            </div>`
        )
    }
}
