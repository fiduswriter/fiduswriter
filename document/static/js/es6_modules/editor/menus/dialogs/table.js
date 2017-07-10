import {selectParentNode} from "prosemirror-commands"
import {tableInsertTemplate, tableEditTemplate} from "./templates"
import {addColumnAfter, addColumnBefore, removeColumn, addRowBefore, addRowAfter, removeRow} from "prosemirror-tables"

export class TableDropdown {
    constructor(mod) {
        this.editor = mod.editor
        this.init()
    }

    // Check if caret is inside a table
    inTable() {
        const currentState = this.editor.currentView.state
        const fromEl = currentState.doc.resolve(currentState.selection.from).node(3)
        const toEl = currentState.doc.resolve(currentState.selection.to).node(3)
        if (fromEl===toEl && fromEl.type.name === 'table') {
            return true
        } else {
            return false
        }
    }

    init() {
        if (this.inTable()) {
            this.editTableDialog()
        } else {
            this.insertTableDialog()
        }
    }

    markInsertTable(cell, className) {
        jQuery(`#table-dialog td.${className}`).removeClass(className)
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
        let rows = jQuery('#table-dialog tr')
        for(let i=0;i<rowCount;i++) {
            let row = rows[i]
            let cols = jQuery(rows[i]).find('td')
            for(let j=0;j<colCount;j++) {
                jQuery(cols[j]).addClass(className)
            }
        }
        return {colCount, rowCount}
    }

    insertTableDialog() {
        let rowCount = 1, colCount = 1
        jQuery('#table-dialog').html(tableInsertTemplate({}))
        // manage hovering over table cells
        let that = this
        jQuery('#table-dialog td').on('mouseenter', function(){
            that.markInsertTable(this, 'hover')
        })
        jQuery('#table-dialog td').on('mouseleave', function(){
            jQuery('#table-dialog td.hover').removeClass('hover')
        })
        jQuery('#table-dialog td').on('mousedown', function(event) {
            // Prevent dialog from opening a second time.
            event.stopImmediatePropagation()
        })
        jQuery('#table-dialog td').on('click', function(event){
            // Prevent dialog from closing.
            event.preventDefault()
            event.stopImmediatePropagation()
            let newCounts = that.markInsertTable(this, 'selected')
            rowCount = newCounts.rowCount
            colCount = newCounts.colCount
        })

        jQuery('#table-dialog button.table-insert').on('mousedown', () => {
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
            this.editor.currentView.focus()
        })


    }

    executeAction(event, editFunction) {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (this.editor.currentView.hasFocus()) {
            editFunction()
        }
    }

    editTableDialog() {
        jQuery('#table-dialog').html(tableEditTemplate({}))

        // Table manipulation

        jQuery('#table-dialog .row-after').on('mousedown', event => {
            this.executeAction(event, () =>
                addRowAfter(this.editor.currentView.state,true)
            )
        })
    	jQuery('#table-dialog .row-before').on('mousedown', event => {
            this.executeAction(event, () =>
                addRowBefore(this.editor.currentView.state,true)
            )
        })
    	jQuery('#table-dialog .col-after').on('mousedown', event => {
            this.executeAction(event, () =>
                addColumnAfter(this.editor.currentView.state,true)
            )
        })
    	jQuery('#table-dialog .col-before').on('mousedown', event => {
            this.executeAction(event, () =>
                addColumnBefore(this.editor.currentView.state,true)
            )
        })
    	jQuery('#table-dialog .col-remove').on('mousedown', event => {
            this.executeAction(event, () =>
                removeColumn(this.editor.currentView.state,true)
            )
        })
    	jQuery('#table-dialog .row-remove').on('mousedown', event => {
            this.executeAction(event, () =>
                removeRow(this.editor.currentView.state,true)
            )
        })
        jQuery('#table-dialog .table-remove').on('mousedown', event => {
            this.executeAction(event, () => {
                // move the selection up until reaching the second level (selecting the table)
                while(this.editor.currentView.state.selection.$from.depth > 2) {
                    selectParentNode(this.editor.currentView.state, tr => this.editor.currentView.dispatch(tr))
                }
                // Remove the selection
                this.editor.currentView.dispatch(
                    this.editor.currentView.state.tr.deleteSelection()
                )
            })
        })
    }
}
