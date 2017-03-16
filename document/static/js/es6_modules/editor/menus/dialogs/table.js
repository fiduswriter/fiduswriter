import {commands} from "prosemirror-old/dist/edit/commands"
import {tableInsertTemplate, tableEditTemplate} from "./templates"
import {createTable, addColumnAfter, addColumnBefore, removeColumn, addRowBefore, addRowAfter, removeRow} from "prosemirror-old/dist/schema-table"

export class TableDropdown {
    constructor(mod) {
        this.editor = mod.editor
        this.init()
    }

    // Check if caret is inside a table
    inTable() {
        const currentPm = this.editor.currentPm
        const fromEl = currentPm.doc.resolve(currentPm.selection.from).node(3)
        const toEl = currentPm.doc.resolve(currentPm.selection.to).node(3)
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
            let nodeType = this.editor.currentPm.schema.nodes['table']
            this.editor.currentPm.tr.replaceSelection(
                createTable(nodeType, rowCount, colCount)
            ).applyAndScroll()
            this.editor.currentPm.focus()
        })


    }

    executeAction(event, editFunction) {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (this.editor.currentPm.hasFocus()) {
            editFunction()
        }
    }

    editTableDialog() {
        jQuery('#table-dialog').html(tableEditTemplate({}))

        // Table manipulation

        jQuery('#table-dialog .row-after').on('mousedown', event => {
            this.executeAction(event, () =>
                addRowAfter(this.editor.currentPm,true)
            )
        })
    	jQuery('#table-dialog .row-before').on('mousedown', event => {
            this.executeAction(event, () =>
                addRowBefore(this.editor.currentPm,true)
            )
        })
    	jQuery('#table-dialog .col-after').on('mousedown', event => {
            this.executeAction(event, () =>
                addColumnAfter(this.editor.currentPm,true)
            )
        })
    	jQuery('#table-dialog .col-before').on('mousedown', event => {
            this.executeAction(event, () =>
                addColumnBefore(this.editor.currentPm,true)
            )
        })
    	jQuery('#table-dialog .col-remove').on('mousedown', event => {
            this.executeAction(event, () =>
                removeColumn(this.editor.currentPm,true)
            )
        })
    	jQuery('#table-dialog .row-remove').on('mousedown', event => {
            this.executeAction(event, () =>
                removeRow(this.editor.currentPm,true)
            )
        })
        jQuery('#table-dialog .table-remove').on('mousedown', event => {
            this.executeAction(event, () => {
                // move the selection up until reaching the first level (selecting the table)
                while(this.editor.currentPm.selection.$from.depth > 1) {
                    commands.selectParentNode(this.editor.currentPm, true)
                }
                // Remove the selection
                this.editor.currentPm.tr.deleteSelection().apply()
            })
        })
    }
}
