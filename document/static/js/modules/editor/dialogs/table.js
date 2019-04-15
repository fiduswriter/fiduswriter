import {Dialog, addDropdownBox} from "../../common"
import {tableResizeTemplate, tableInsertTemplate} from "./templates"


export class TableDialog {
    constructor(editor) {
        this.editor = editor
        this.dialogEl = false
    }

    init() {
        this.insertTableDialog()
    }

    markInsertTable(cell, className) {
        this.dialog.dialogEl.querySelectorAll(`td.${className}`).forEach(el => el.classList.remove(className))
        let colCount = 1
        let countElement = cell
        while (countElement.previousElementSibling) {
            countElement = countElement.previousElementSibling
            colCount += 1
        }
        let rowCount = 1
        countElement= countElement.parentElement
        while (countElement.previousElementSibling) {
            countElement = countElement.previousElementSibling
            rowCount += 1
        }
        // add hover class.
        const rows = this.dialog.dialogEl.querySelectorAll('tr')
        for (let i=0;i<rowCount;i++) {
            const cols = rows[i].querySelectorAll('td')
            for (let j=0;j<colCount;j++) {
                cols[j].classList.add(className)
            }
        }
        return {colCount, rowCount}
    }

    insertTableDialog() {
        let rowCount = 1, colCount = 1
        const buttons = []
        buttons.push({
            text: gettext('Insert'),
            classes: 'fw-dark',
            click: () => {
                const table = {type: 'table', content: []}

                for (let i=0;i<rowCount;i++) {
                    const row = {type: 'table_row', content: []}
                    for (let j=0;j<colCount;j++) {
                        row.content.push({type: 'table_cell', content: [{type: 'paragraph'}]})
                    }
                    table.content.push(row)

                }
                const schema = this.editor.currentView.state.schema
                this.editor.currentView.dispatch(
                    this.editor.currentView.state.tr.replaceSelectionWith(
                        schema.nodeFromJSON(table)
                    )
                )
                this.dialog.close()
            }
        })
        buttons.push({
            type: 'cancel'
        })

        this.dialog = new Dialog({
            title: gettext('Insert table'),
            body: tableInsertTemplate(),
            width: 360,
            height: 360,
            buttons,
            onClose: () => this.editor.currentView.focus()
        })

        this.dialog.open()

        // manage hovering over table cells
        this.dialog.dialogEl.querySelectorAll('td').forEach(el => el.addEventListener('mouseenter', () => {
            this.markInsertTable(el, 'hover')
        }))
        this.dialog.dialogEl.querySelectorAll('td').forEach(el => el.addEventListener('mouseleave', () => {
            this.dialog.dialogEl.querySelectorAll('td.hover').forEach(mEl => mEl.classList.remove('hover'))
        }))

        this.dialog.dialogEl.querySelectorAll('td').forEach(el => el.addEventListener('click', event => {
            event.preventDefault()
            event.stopImmediatePropagation()
            const newCounts = this.markInsertTable(el, 'selected')
            rowCount = newCounts.rowCount
            colCount = newCounts.colCount
        }))

    }
}

export class TableResizeDialog {
    constructor(editor) {
        this.editor = editor
        this.dialogEl = false
        this.aligned='center'
        this.width = '100'
        this.layout = 'fixed'
    }

    init() {
        const {table} = this.findTable(this.editor.currentView.state)
        if (table) {
            this.width = table.attrs.width
            this.aligned = table.attrs.aligned
            this.layout = table.attrs.layout
        }
        this.insertDialog()
    }

    setTableAlignment() {
        if (this.width == "100") {
            this.dialog.dialogEl.querySelector("#table-alignment-btn").classList.add("disabled")
            this.dialog.dialogEl.querySelector('#table-alignment-btn label').innerHTML = "Center"
            return
        }
        this.dialog.dialogEl.querySelector('#table-alignment-btn label').innerHTML =
            document.getElementById(`table-alignment-${this.aligned}`).innerText
    }

    setTableWidth() {
        if (this.width == "100") {
            this.dialog.dialogEl.querySelector("#table-alignment-btn").classList.add("disabled")
            this.dialog.dialogEl.querySelector('#table-alignment-btn label').innerHTML = "Center"
        } else {
            this.dialog.dialogEl.querySelector("#table-alignment-btn").classList.remove("disabled")
        }
        this.dialog.dialogEl.querySelector('#table-width-btn label').innerHTML =
            document.getElementById(`table-width-${this.width}`).innerText
    }

    setTableLayout() {
        this.dialog.dialogEl.querySelector('#table-layout-btn label').innerHTML =
            document.getElementById(`table-layout-${this.layout}`).innerText
        if (this.layout === "auto")
            this.dialog.dialogEl.querySelector('#table-layout-btn').style.width = "105px"
        else
            this.dialog.dialogEl.querySelector('#table-layout-btn').style.width = "50px"
    }

    findTable(state) {
        const $head = state.selection.$head
        for (let d = $head.depth; d > 0; d--) if ($head.node(d).type.spec.tableRole == "table") {
            return {table: $head.node(d), tablePos: $head.before(d)}}
        return {table:false}
    }

    submitForm() {
        const {table, tablePos} = this.findTable(this.editor.currentView.state)
        if (!table) return
        const attrs = Object.assign({}, table.attrs, {
            width : this.width,
            aligned : this.width === "100" ? "center" : this.aligned,
            layout : this.layout
        })
        this.editor.currentView.dispatch(this.editor.currentView.state.tr.setNodeMarkup(tablePos, false, attrs))
    }

    insertDialog() {
        const buttons = []
        buttons.push({
            text: gettext('Update'),
            classes: 'fw-dark',
            click: () => {
                this.submitForm()
                this.dialog.close()
            }
        })
        buttons.push({
            type: 'cancel'
        })

        this.dialog = new Dialog({
            title: gettext('Resize table'),
            body: tableResizeTemplate(),
            width: 300,
            height: 260,
            buttons,
            onClose: () => this.editor.currentView.focus()
        })

        this.dialog.open()

        this.setTableAlignment()
        this.setTableWidth()
        this.setTableLayout()

        addDropdownBox(
            document.getElementById('table-alignment-btn'),
            document.getElementById('table-alignment-pulldown')
        )

        addDropdownBox(
            document.getElementById('table-width-btn'),
            document.getElementById('table-width-pulldown')
        )

        addDropdownBox(
            document.getElementById('table-layout-btn'),
            document.getElementById('table-layout-pulldown')
        )

        document.querySelectorAll('#table-alignment-pulldown li span').forEach(el => el.addEventListener(
            'click',
            event => {
                event.preventDefault()
                this.aligned = el.id.split('-')[2]
                this.setTableAlignment()
            }
        ))

        document.querySelectorAll('#table-width-pulldown li span').forEach(el => el.addEventListener(
            'click',
            event => {
                event.preventDefault()
                this.width = el.id.split('-')[2]
                this.setTableWidth()
            }
        ))

        document.querySelectorAll('#table-layout-pulldown li span').forEach(el => el.addEventListener(
            'click',
            event => {
                event.preventDefault()
                this.layout = el.id.split('-')[2]
                this.setTableLayout()
            }
        ))
    }
}
