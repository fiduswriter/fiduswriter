import {tableSchema} from "prosemirror/dist/schema-table"
const {Table, TableRow, createTable, addTableNodes} = require("prosemirror/dist/schema-table")
import  {commands} from "prosemirror/dist/edit/commands"
import {tableDialogTemplate} from "./templates"
const {Schema} = require("prosemirror/dist/model")


export let tableDialog = function (mod) {

    let editor = mod.editor,
        dialogButtons = [],
        dialog
   
    dialogButtons.push({
        text: gettext("insert"),
        class: 'fw-button fw-dark',
        click: function() 
        {    
		let nodeType = editor.currentPm.schema.nodes['table'],
		    rows = dialog.find('input.rows').val(),
		    cols = dialog.find('input.cols').val()
            dialog.dialog('close')
	    editor.currentPm.tr.replaceSelection(createTable(nodeType, +rows, +cols)).applyAndScroll()
            editor.currentPm.focus()
            
             return             
        }
    })
    dialogButtons.push({
        text: gettext('Cancel'),
        class: 'fw-button fw-orange',
        click: function() {
            dialog.dialog('close')
            editor.currentPm.focus()
        }
    })

    dialog = jQuery(tableDialogTemplate({
    
    }))

    dialog.dialog({
        buttons: dialogButtons,
        modal: true,
        close: function() {
            jQuery(this).dialog('destroy').remove()
        }
    })
}


/*
function insertTableItem(tableType) {
  return new MenuItem({
    title: "Insert a table",
    run(pm) {
      promptTableSize(pm, ({rows, cols}) => {
        pm.tr.replaceSelection(createTable(tableType, +rows, +cols)).applyAndScroll()
      })
    },
    select(pm) {
      let $from = pm.selection.$from
      for (let d = $from.depth; d >= 0; d--) {
        let index = $from.index(d)
        if ($from.node(d).canReplaceWith(index, index, tableType)) return true
      }
      return false
    },
    label: "Table"
  })
 }

function simpleItem(label, cmd) {
  return new MenuItem({
    tit
   e: label,
    label,
    run: cmd,
    select(pm) { return cmd(pm, false) }
  })
}

*/
