import {bindBlockStyles} from "./toolbar_items/block_styles"
import {bindCite} from "./toolbar_items/cite"
import {bindComment} from "./toolbar_items/comment"
import {bindFigure} from "./toolbar_items/figure"
import {bindFootnote} from "./toolbar_items/footnote"
import {bindInlineStyles} from "./toolbar_items/inline_styles"
import {bindLink} from "./toolbar_items/link"
import {bindMath} from "./toolbar_items/math"
import {bindHistory} from "./toolbar_items/undo_redo"


/* Bindings for the toolbar menu */
export class ModMenusToolbar {
    constructor(mod) {
        mod.toolbar = this
        this.mod = mod
        this.bindEvents()
    }

    bindEvents() {
        bindBlockStyles(this.mod.editor)
        bindCite(this.mod)
        bindComment(this.mod.editor)
        bindFigure(this.mod.editor)
        bindFootnote(this.mod.editor)
        bindInlineStyles(this.mod.editor)
        bindLink(this.mod.editor)
        bindMath(this.mod.editor)
        bindHistory(this.mod.editor)
    }
}
