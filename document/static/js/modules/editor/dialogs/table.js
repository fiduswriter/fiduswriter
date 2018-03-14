import {tableInsertTemplate} from "./templates"

export class TableDialog {
    constructor(editor) {
        this.editor = editor
        this.dialogEl = false
    }

    init() {
        this.insertTableDialog()
    }

    markInsertTable(cell, className) {
        this.dialog.find(`td.${className}`).removeClass(className)
        let colCount = 1
        let countElement = cell
        while(countElement.previousElementSibling) {
            countElement = countElement.previousElementSibling
            colCount += 1
        }
        let rowCount = 1
        countElement= countElement.parentElement
        while(countElement.previousElementSibling) {
            countElement = countElement.previousElementSibling
            rowCount += 1
        }
        // add hover class.
        let rows = this.dialog.querySelectorAll('tr')
        for(let i=0;i<rowCount;i++) {
            let row = rows[i]
            let cols = rows[i].querySelector('td')
            for(let j=0;j<colCount;j++) {
                cols[j].classList.add(className)
            }
        }
        return {colCount, rowCount}
    }

    insertTableDialog() {
        let rowCount = 1, colCount = 1
        let buttons = []
        buttons.push({
            text: gettext('Insert'),
            class: 'fw-button fw-dark',
            click: () => {
                let table = {type: 'table', content: []}

                for (let i=0;i<rowCount;i++) {
                    let row = {type: 'table_row', content: []}
                    for (let j=0;j<colCount;j++) {
                        row.content.push({type: 'table_cell', content: [{type: 'paragraph'}]})
                    }
                    table.content.push(row)

                }
                let schema = this.editor.currentView.state.schema
                this.editor.currentView.dispatch(
                    this.editor.currentView.state.tr.replaceSelectionWith(
                        schema.nodeFromJSON(table)
                    )
                )
                this.dialog.dialog('close')
                this.editor.currentView.focus()
            }
        })
        buttons.push({
            text: gettext('Cancel'),
            class: 'fw-button fw-orange',
            click: () => {
                this.dialog.dialog('close')
                this.editor.currentView.focus()
            }
        })

        this.dialog = jQuery(tableInsertTemplate())

        this.dialog.dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 360,
            height: 360,
            modal: true,
            buttons,
            close: () => this.dialog.dialog('destroy').remove()
        })

        // manage hovering over table cells
        let that = this
        this.dialog.find('td').on('mouseenter', function(){
            that.markInsertTable(this, 'hover')
        })
        this.dialog.find('td').on('mouseleave', function(){
            that.dialog.find('td.hover').removeClass('hover')
        })
        this.dialog.find('td').on('mousedown', function(event) {
            // Prevent dialog from opening a second time.
            event.stopImmediatePropagation()
        })
        this.dialog.find('td').on('click', function(event){
            // Prevent dialog from closing.
            event.preventDefault()
            event.stopImmediatePropagation()
            let newCounts = that.markInsertTable(this, 'selected')
            rowCount = newCounts.rowCount
            colCount = newCounts.colCount
        })

    }
}
