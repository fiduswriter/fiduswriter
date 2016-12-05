import {citationDialog} from "./content-dialogs/citation"
import {FigureDialog} from "./content-dialogs/figure"
import {linkDialog} from "./content-dialogs/link"
import {TableDropdown} from "./content-dialogs/table"
import {MathDialog} from "./content-dialogs/math"
import {SearchDialog} from "./content-dialogs/search"
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
        let that = this

        // toolbar math
        jQuery(document).on('mousedown', '#button-math:not(.disabled)', (event) => {
            this.executeAction(event, () => {
                event.preventDefault()
                this.mathDialog.show()
                //let dialog = new MathDialog(that.mod)
            })
        })

        jQuery(document).on('mousedown', '#button-link:not(.disabled)', function(event) {
            that.executeAction(event, function(){
                linkDialog(that.mod)
            })
        })

        jQuery(document).on('mousedown', '#button-cite:not(.disabled)', function(event) {
            that.executeAction(event, function(){
                citationDialog(that.mod)
            })

        })

        // comment
        jQuery(document).on('mousedown', '#button-comment:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.mod.comments.interactions.createNewComment()
            })
        })

        //reveiw finished
        jQuery(document).on('click', '#reviewed:not(.disabled)', function () {
            that.mod.actions.submitReview()
        })

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

        jQuery(document).on('mousedown', '#button-ol', function (event) {
            that.executeAction(event, function(){
                let node = that.mod.editor.currentPm.schema.nodes['ordered_list']
                let command = commands.wrapInList(node)
                command(that.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-ul', function (event) {
            that.executeAction(event, function(){
                let node = that.mod.editor.currentPm.schema.nodes['bullet_list']
                let command = commands.wrapInList(node)
                command(that.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-blockquote', function (event) {
            that.executeAction(event, function(){
                let node = that.mod.editor.currentPm.schema.nodes['blockquote']
                let command = commands.wrapIn(node)
                command(that.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-footnote:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                let nodeType = that.mod.editor.currentPm.schema.nodes['footnote']
                that.mod.editor.pm.tr.replaceSelection(nodeType.createAndFill()).apply()
            })
        })
        // strong/bold
        jQuery(document).on('mousedown', '#button-bold:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                let mark = that.mod.editor.currentPm.schema.marks['strong']
                let command = commands.toggleMark(mark)
                command(that.mod.editor.currentPm, true)
            })
        })
        // emph/italics
        jQuery(document).on('mousedown', '#button-italic:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                let mark = that.mod.editor.currentPm.schema.marks['em']
                let command = commands.toggleMark(mark)
                command(that.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-undo:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                commands.undo(that.mod.editor.currentPm, true)
            })
        })

        jQuery(document).on('mousedown', '#button-redo:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                commands.redo(that.mod.editor.currentPm, true)
            })
        })
        jQuery(document).on('mousedown', '#button-figure:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                new FigureDialog(that.mod)
            })
        })

        jQuery(document).on('mousedown', '#button-table:not(.disabled)', function(event) {
            that.executeAction(event, function(){
                new TableDropdown(that.mod)
            })
        })

        jQuery(document).on('mousedown', '#button-search:not(.disabled)', function(event) {
            that.executeAction(event, function(){
                new SearchDialog(that.mod)
            })
        })
    }
}
