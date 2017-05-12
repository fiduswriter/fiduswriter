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
                let dialog = new LinkDialog(this.mod, 0)
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


        let that = this
        jQuery(document).on('dblclick', 'a', function(event) {

            let url = jQuery(this).attr('href'),
                splitUrl = url.split('#'),
                baseUrl = splitUrl[0],
                id = splitUrl[1]

            if (!id || (baseUrl !== '' &!(baseUrl.includes(window.location.host)))) {
                window.open(url, '_blank')
                return
            }

            let stillLooking = true
            that.mod.editor.pm.doc.descendants((node, pos) => {
                if (stillLooking && node.type.name === 'heading' && node.attrs.id === id) {
                    that.mod.editor.scrollIntoView(that.mod.editor.pm, pos)
                    stillLooking = false
                }
            })
            if (stillLooking) {
                that.mod.editor.mod.footnotes.fnPm.doc.descendants((node, pos) => {
                    if (stillLooking && node.type.name === 'heading' && node.attrs.id === id) {
                        that.mod.editor.scrollIntoView(that.mod.footnotes.fnPm, pos)
                        stillLooking = false
                    }
                })
            }
        })


        // blockstyle paragraph, h1 - h3, lists
        jQuery(document).on('mousedown', '.toolbarheadings label', function(event) {

            let existingIds = []
            that.mod.editor.pm.doc.descendants(node => {
                if (node.type.name === 'heading') {
                    existingIds.push(node.attrs.id)

                }
            })

            let blockId
            while (!blockId || existingIds.includes(blockId)) {
                blockId = 'H' + Math.round(Math.random()*10000000) + 1
            }

            let blockTypes = {
                'p': ['paragraph'],
                'h1': ['heading', {
                    level: 1,
                    id: blockId
                }],
                'h2': ['heading', {
                    level: 2,
                    id: blockId
                }],
                'h3': ['heading', {
                    level: 3,
                    id: blockId
                }],
                'h4': ['heading', {
                    level: 4,
                    id: blockId
                }],
                'h5': ['heading', {
                    level: 5,
                    id: blockId
                }],
                'h6': ['heading', {
                    level: 6,
                    id: blockId
                }],
                'code': ['code_block']
            }

            let blockType = blockTypes[this.id.split('_')[0]]

            that.executeAction(event, () => {

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

        jQuery(document).on('mousedown', '#button-h-line', event => {
            let pm = this.mod.editor.currentPm
            pm.tr.replaceSelection(pm.schema.node("horizontal_rule")).apply()
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
