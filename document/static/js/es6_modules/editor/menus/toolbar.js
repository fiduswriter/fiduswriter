import {citationDialog} from "./content-dialogs/citation"
import {FigureDialog} from "./content-dialogs/figure"
import {linkDialog} from "./content-dialogs/link"
import {MathDialog} from "./content-dialogs/math"

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

        // blockstyle paragraph, h1 - h3, lists
        jQuery(document).on('mousedown', '.toolbarheadings label', function (event) {
            let commands = {
              'p': ['paragraph'],
              'h1': ['heading',{level: 1}],
              'h2': ['heading',{level: 2}],
              'h3': ['heading',{level: 3}],
              'h4': ['heading',{level: 4}],
              'h5': ['heading',{level: 5}],
              'h6': ['heading',{level: 6}],
              'code': ['code_block']
            },
            blockType = commands[this.id.split('_')[0]]
            that.executeAction(event, function(){
                let block = that.mod.editor.currentPm.schema.nodes[blockType[0]]
                that.mod.editor.currentPm.tr.setBlockType(block, blockType[1])
            })
        })

        jQuery(document).on('mousedown', '#button-ol', function (event) {
            that.executeAction(event, function(){
                let block = that.mod.editor.currentPm.schema.nodes['ordered_list']
                that.mod.editor.currentPm.tr.setBlockType(block)
            })
        })

        jQuery(document).on('mousedown', '#button-ul', function (event) {
            that.executeAction(event, function(){
                let block = that.mod.editor.currentPm.schema.nodes['bullet_list']
                that.mod.editor.currentPm.tr.setBlockType(block)
            })
        })

        jQuery(document).on('mousedown', '#button-blockquote', function (event) {
            that.executeAction(event, function(){
                let block = that.mod.editor.currentPm.schema.nodes['blockquote']
                that.mod.editor.currentPm.tr.setBlockType(block)
            })
        })

        jQuery(document).on('mousedown', '#button-footnote:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                let node = that.mod.editor.currentPm.schema.nodes['node']
                that.mod.editor.pm.execCommand('footnote:insert', [''])
            })
        })
        // strong/bold
        jQuery(document).on('mousedown', '#button-bold:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                let mark = that.mod.editor.currentPm.schema['strong']
                that.mod.editor.currentPm.toggleMark(mark)
            })
        })
        // emph/italics
        jQuery(document).on('mousedown', '#button-italic:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                let mark = that.mod.editor.currentPm.schema['em']
                that.mod.editor.currentPm.toggleMark(mark)
            })
        })

        jQuery(document).on('mousedown', '#button-undo:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.pm.history.undo()
            })
        })

        jQuery(document).on('mousedown', '#button-redo:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.pm.history.redo()
            })
        })
        jQuery(document).on('mousedown', '#button-figure:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                new FigureDialog(that.mod)
            })
        })
    }
}
