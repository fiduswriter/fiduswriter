import {CitationDialog, FigureDialog, LinkDialog, TableDropdown, MathDialog} from "./dialogs"
import {setBlockType, wrapIn, toggleMark} from "prosemirror-commands"
import {wrapInList} from "prosemirror-schema-list"
import {undo, redo} from "prosemirror-history"

/* Bindings for the toolbar menu */
export class ModMenusToolbar {
    constructor(mod) {
        mod.toolbar = this
        this.mod = mod
        this.bindEvents()
    }

    executeAction(event, editFunction) {
        event.preventDefault()
        if (this.mod.editor.currentView.hasFocus()) {
            editFunction()
        }
    }

    bindEvents() {
        // toolbar math
        jQuery(document).on('mousedown', '#button-math:not(.disabled)', event => {
            this.executeAction(event, () => {
                let dialog = new MathDialog(this.mod.editor)
                dialog.init()
            })
        })

        jQuery(document).on('mousedown', '#button-link:not(.disabled)', event =>
            this.executeAction(event, () => {
                let dialog = new LinkDialog(this.mod.editor)
                return dialog.init()
            })
        )

        jQuery(document).on('mousedown', '#button-cite:not(.disabled)', event => {
            this.executeAction(event, () => {
                let dialog = new CitationDialog(this.mod.editor)
                return dialog.init()
            })

        })

        // comment
        jQuery(document).on('mousedown', '#button-comment:not(.disabled)', event => {
            this.executeAction(event, () =>
                this.mod.editor.mod.comments.interactions.createNewComment()
            )
        })





        // blockstyle paragraph, h1 - h3, lists
        jQuery(document).on('mousedown', '.toolbarheadings label', function(event) {

            let existingIds = []
            that.mod.editor.view.state.doc.descendants(node => {
                if (node.type.name === 'heading') {
                    existingIds.push(node.attrs.id)

                }
            })

            let blockTypes = {
                'p': ['paragraph'],
                'h1': ['heading', {
                    level: 1
                }],
                'h2': ['heading', {
                    level: 2
                }],
                'h3': ['heading', {
                    level: 3
                }],
                'h4': ['heading', {
                    level: 4
                }],
                'h5': ['heading', {
                    level: 5
                }],
                'h6': ['heading', {
                    level: 6
                }],
                'code': ['code_block']
            }

            let blockType = blockTypes[this.id.split('_')[0]]

            that.executeAction(event, () => {

                let block = that.mod.editor.currentView.state.schema.nodes[blockType[0]]

                let command = setBlockType(block, blockType[1])
                command(that.mod.editor.currentView.state, tr => that.mod.editor.currentView.dispatch(tr))

            })


        })

        jQuery(document).on('mousedown', '#button-ol:not(.disabled)', event => {
            this.executeAction(event, () => {

                let node = this.mod.editor.currentView.state.schema.nodes['ordered_list']
                let command = wrapInList(node)
                command(that.mod.editor.currentView.state, tr => this.mod.editor.currentView.dispatch(tr))

            })
        })

        jQuery(document).on('mousedown', '#button-h-line:not(.disabled)', event => {
            let view = this.mod.editor.currentView,
                state = view.state
            view.dispatch(
                state.tr.replaceSelectionWith(state.schema.node("horizontal_rule"))
            )
        })

        jQuery(document).on('mousedown', '#button-ul:not(.disabled)', event => {
            this.executeAction(event, () => {
                let node = this.mod.editor.currentView.state.schema.nodes['bullet_list']
                let command = wrapInList(node)
                command(that.mod.editor.currentView.state, tr => this.mod.editor.currentView.dispatch(tr))
            })
        })

        jQuery(document).on('mousedown', '#button-blockquote:not(.disabled)', event => {
            this.executeAction(event, () => {
                let node = this.mod.editor.currentView.state.schema.nodes['blockquote']
                let command = wrapIn(node)
                command(that.mod.editor.currentView.state, tr => this.mod.editor.currentView.dispatch(tr))
            })
        })

        jQuery(document).on('mousedown', '#button-footnote:not(.disabled)', event => {
            this.executeAction(event, () => {
                let nodeType = this.mod.editor.view.state.schema.nodes['footnote']
                let transaction = this.mod.editor.view.state.tr.replaceSelectionWith(nodeType.createAndFill())
                this.mod.editor.view.dispatch(transaction)
            })
        })
        // strong/bold
        jQuery(document).on('mousedown', '#button-bold:not(.disabled)', event => {
            this.executeAction(event, () => {
                let mark = this.mod.editor.currentView.state.schema.marks['strong']
                let command = toggleMark(mark)
                command(that.mod.editor.currentView.state, tr => this.mod.editor.currentView.dispatch(tr))
            })
        })
        // emph/italics
        jQuery(document).on('mousedown', '#button-italic:not(.disabled)', event => {
            this.executeAction(event, () => {
                let mark = this.mod.editor.currentView.state.schema.marks['em']
                let command = toggleMark(mark)
                command(that.mod.editor.currentView.state, tr => this.mod.editor.currentView.dispatch(tr))
            })
        })

        jQuery(document).on('mousedown', '#button-undo:not(.disabled)', event => {
            this.executeAction(
                event,
                () => undo(this.mod.editor.currentView.state, tr => this.mod.editor.currentView.dispatch(tr))
            )
        })

        jQuery(document).on('mousedown', '#button-redo:not(.disabled)', event => {
            this.executeAction(
                event,
                () => redo(this.mod.editor.currentView.state, tr => this.mod.editor.currentView.dispatch(tr))
            )
        })
        jQuery(document).on('mousedown', '#button-figure:not(.disabled)', event => {
            this.executeAction(
                event,
                () => {
                    let dialog = new FigureDialog(this.mod.editor)
                    return dialog.init()
                }
            )
        })

        jQuery(document).on('mousedown', '#button-table .multibuttonsCover:not(.disabled)', event => {
            this.executeAction(
                event,
                () => {
                    let dialog = new TableDropdown(this.mod.editor)
                    dialog.init()
                }
            )
        })
    }
}
