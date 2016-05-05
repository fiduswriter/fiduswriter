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
              'p': 'paragraph:make',
              'h1': 'heading:make1',
              'h2': 'heading:make2',
              'h3': 'heading:make3',
              'h4': 'heading:make4',
              'h5': 'heading:make5',
              'h6': 'heading:make6',
              'code': 'code_block:make'
            },
            theCommand = commands[this.id.split('_')[0]]
            that.executeAction(event, function(){
                that.mod.editor.currentPm.execCommand(theCommand)
            })
        })

        jQuery(document).on('mousedown', '#button-ol', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.currentPm.execCommand('ordered_list:wrap')
            })
        })

        jQuery(document).on('mousedown', '#button-ul', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.currentPm.execCommand('bullet_list:wrap')
            })
        })

        jQuery(document).on('mousedown', '#button-blockquote', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.pm.execCommand('blockquote:wrap')
            })
        })

        jQuery(document).on('mousedown', '#button-footnote:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.pm.execCommand('footnote:insert', [''])
            })
        })
        // strong/bold
        jQuery(document).on('mousedown', '#button-bold:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.currentPm.execCommand('strong:toggle')
            })
        })
        // emph/italics
        jQuery(document).on('mousedown', '#button-italic:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.currentPm.execCommand('em:toggle')
            })
        })

        jQuery(document).on('mousedown', '#button-undo:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.pm.execCommand("undo")
            })
        })

        jQuery(document).on('mousedown', '#button-redo:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                that.mod.editor.pm.execCommand("redo")
            })
        })
        jQuery(document).on('mousedown', '#button-figure:not(.disabled)', function (event) {
            that.executeAction(event, function(){
                new FigureDialog(that.mod)
            })
        })
    }
}
