import {CitationDialog, FigureDialog, LinkDialog, TableDropdown, MathDialog} from "./dialogs"
import {commands} from "prosemirror-old/dist/edit/commands"

/* Bindings for the toolbar menu */
export class ModMenusToolbar {
    constructor(mod) {
        mod.toolbar = this
        this.mathDialog = new MathDialog(mod)
        this.mod = mod
        this.bindEvents()
    }

    executeAction(event, editFunction) {
        event.preventDefault()
        if (this.mod.editor.currentPm.hasFocus()) {
            editFunction()
        }
    }

    bindEvents() {
        // toolbar math
        jQuery(document).on('mousedown', '#button-math:not(.disabled)', event => {
            this.executeAction(event, () => {
                event.preventDefault()
                this.mathDialog.show()
            })
        })

        jQuery(document).on('mousedown', '#button-link:not(.disabled)', event =>
            this.executeAction(event, () => {
                let dialog = new LinkDialog(this.mod)
                return dialog.init()
            })
        )

        jQuery(document).on('mousedown', '#button-cite:not(.disabled)', event => {
            this.executeAction(event, () => {
                let dialog = new CitationDialog(this.mod)
                return dialog.init()
            })

        })

        // comment
        jQuery(document).on('mousedown', '#button-comment:not(.disabled)', event => {
            this.executeAction(event, () =>
                this.mod.editor.mod.comments.interactions.createNewComment()
            )
        })

        jQuery(document).on(
            'click',
            '#revision-done:not(.disabled)',
            () => this.mod.actions.revisionFinished()
        )

         //return to OJS
        jQuery(document).on(
            'click',
            '#reviewerOJSReturn:not(.disabled)',
            () => this.mod.actions.returnToOJS()
        )

        let that = this
        // blockstyle paragraph, h1 - h3, lists
        jQuery(document).on('mousedown', '.toolbarheadings label', function (event) {
            const blockTypes = {
              'p': ['paragraph'],
              'h1': ['heading',{level: 1}],
              'h2': ['heading',{level: 2}],
              'h3': ['heading',{level: 3}],
              'h4': ['heading',{level: 4}],
              'h5': ['heading',{level: 5}],
              'h6': ['heading',{level: 6}],
              'code': ['code_block']
            },
            blockType = blockTypes[this.id.split('_')[0]]
            that.executeAction(event, function(){
                let block = that.mod.editor.currentPm.schema.nodes[blockType[0]]
                let command = commands.setBlockType(block, blockType[1])
                command(that.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-ol', event => {
            this.executeAction(event, () => {
                let node = this.mod.editor.currentPm.schema.nodes['ordered_list']
                let command = commands.wrapInList(node)
                command(this.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-ul', event => {
            this.executeAction(event, () => {
                let node = this.mod.editor.currentPm.schema.nodes['bullet_list']
                let command = commands.wrapInList(node)
                command(this.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-blockquote', event => {
            this.executeAction(event, () => {
                let node = this.mod.editor.currentPm.schema.nodes['blockquote']
                let command = commands.wrapIn(node)
                command(this.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-footnote:not(.disabled)', event => {
            this.executeAction(event, () => {
                let nodeType = this.mod.editor.currentPm.schema.nodes['footnote']
                this.mod.editor.pm.tr.replaceSelection(nodeType.createAndFill()).apply()
            })
        })
        // strong/bold
        jQuery(document).on('mousedown', '#button-bold:not(.disabled)', event => {
            this.executeAction(event, () => {
                let mark = this.mod.editor.currentPm.schema.marks['strong']
                let command = commands.toggleMark(mark)
                command(this.mod.editor.currentPm, true)
            })
        })
        // emph/italics
        jQuery(document).on('mousedown', '#button-italic:not(.disabled)', event => {
            this.executeAction(event, () => {
                let mark = this.mod.editor.currentPm.schema.marks['em']
                let command = commands.toggleMark(mark)
                command(this.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-undo:not(.disabled)', event => {
            this.executeAction(
                event,
                () => commands.undo(this.mod.editor.currentPm, true)
            )
        })

        jQuery(document).on('mousedown', '#button-redo:not(.disabled)', event => {
            this.executeAction(
                event,
                () => commands.redo(this.mod.editor.currentPm, true)
            )
        })
        jQuery(document).on('mousedown', '#button-figure:not(.disabled)', event => {
            this.executeAction(
                event,
                () => {
                    let dialog = new FigureDialog(this.mod)
                    return dialog.init()
                }
            )
        })

        jQuery(document).on('mousedown', '#button-table:not(.disabled)', event => {
            this.executeAction(
                event,
                () => new TableDropdown(this.mod)
            )
        })
    }
}
