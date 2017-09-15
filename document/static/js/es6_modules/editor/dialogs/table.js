import {selectParentNode} from "prosemirror-commands"
import {tableInsertTemplate, tableEditTemplate} from "./templates"
import {addColumnAfter, addColumnBefore, deleteColumn, addRowBefore, addRowAfter, deleteRow, deleteTable,
        mergeCells, splitCell, setCellAttr, toggleHeaderRow, toggleHeaderColumn, toggleHeaderCell,
        goToNextCell} from "prosemirror-tables"

import {DOMParser, Schema}  from "prosemirror-model"
import {schema as baseSchema}  from "prosemirror-schema-basic"
import {tableEditing, tableNodes}  from "prosemirror-tables"
import {baseKeymap}  from "prosemirror-commands"
import {EditorState} from "prosemirror-state"
import {keymap}  from "prosemirror-keymap"
import {exampleSetup, buildMenuItems}  from "prosemirror-example-setup"

import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

export class TableDialog {
    constructor(editor) {
        this.editor = editor
        this.dialogEl = false
    }

    init() {
        if (this.inTable()) {
            this.editTableDialog()
        } else {
            this.insertTableDialog()
        }
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
        let rows = this.dialog.find('tr')
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

    executeAction(event, editFunction) {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (this.editor.currentView.hasFocus()) {
            editFunction()
        }
        this.dialog.dialog('close')
        this.editor.currentView.focus()
    }

    editTableDialog() {
        let buttons = []
        buttons.push({
            text: gettext('Cancel'),
            class: 'fw-button fw-orange',
            click: () => {
                this.dialog.dialog('close')
                this.editor.currentView.focus()
            }
        })

        this.dialog = jQuery(tableEditTemplate({}))

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

        // Table manipulation

        this.dialog.find('.row-after').on('mousedown', event => {
            this.executeAction(event, () =>
                addRowAfter(this.editor.currentView.state, this.editor.currentView.dispatch)
            )
        })
    	this.dialog.find('.row-before').on('mousedown', event => {
            this.executeAction(event, () =>
                addRowBefore(this.editor.currentView.state, this.editor.currentView.dispatch)
            )
        })
    	this.dialog.find('.col-after').on('mousedown', event => {
            this.executeAction(event, () =>
                addColumnAfter(this.editor.currentView.state, this.editor.currentView.dispatch)
            )
        })
    	this.dialog.find('.col-before').on('mousedown', event => {
            this.executeAction(event, () =>
                addColumnBefore(this.editor.currentView.state, this.editor.currentView.dispatch)
            )
        })
    	this.dialog.find('.col-remove').on('mousedown', event => {
            this.executeAction(event, () =>
                deleteColumn(this.editor.currentView.state, this.editor.currentView.dispatch)
            )
        })
    	this.dialog.find('.row-remove').on('mousedown', event => {
            this.executeAction(event, () =>
                deleteRow(this.editor.currentView.state, this.editor.currentView.dispatch)
            )
        })
        this.dialog.find('.table-remove').on('mousedown', event => {
            this.executeAction(event, () => {
                deleteTable(this.editor.currentView.state, this.editor.currentView.dispatch)
            })
        })
        this.dialog.find('.merge-cells').on('mousedown', event => {
            this.executeAction(event, () => {
                mergeCells(this.editor.currentView.state, this.editor.currentView.dispatch)
            })
        })

        this.dialog.find('.split-cell').on('mousedown', event => {
            this.executeAction(event, () => {
                splitCell(this.editor.currentView.state, this.editor.currentView.dispatch)
            })
        })

        this.dialog.find('.attr-cell').on('mousedown', event => {
            this.executeAction(event, () => {
                var c = setCellAttr("background", "#dfd")
                c(this.editor.currentView.state, this.editor.currentView.dispatch)
            })
        })

        this.dialog.find('.toggle-header-row').on('mousedown', event => {
            this.executeAction(event, () => {
                toggleHeaderRow(this.editor.currentView.state, this.editor.currentView.dispatch)
            })
        })

        this.dialog.find('.toggle-header-column').on('mousedown', event => {
            this.executeAction(event, () => {
                toggleHeaderColumn(this.editor.currentView.state, this.editor.currentView.dispatch)
            })
        })

        this.dialog.find('.toggle-header-cell').on('mousedown', event => {
            this.executeAction(event, () => {
                 toggleHeaderCell(this.editor.currentView.state, this.editor.currentView.dispatch)
            })
        })

        this.dialog.find('.go-next-cell').on('mousedown', event => {

            var g = goToNextCell(1)
            g(this.editor.currentView.state, this.editor.currentView.dispatch)
            return
        })


    }
}
