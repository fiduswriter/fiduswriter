import {Pos} from "prosemirror/dist/model"
import {TextSelection} from "prosemirror/dist/edit/selection"
/**
 * Helper functions for testing FidusWriter with Selenium.
 * @namespace testCaret
 */
let testCaret = {}


/**
 * Produces a caret referring to the starting position of the first range of
 * the given selection.
 * @function getCaret
 * @memberof testCaret
 * @param {Selection} selection Selection whose caret is to be gotten.
 * @returns {Caret}
 */
testCaret.getCaret = function getCaret() {
    return theEditor.editor.selection.from.toJSON()
}

/**
 * Sets the given selection to have a single collapsed range at the given
 * caret.
 * @function setCaret
 * @memberof testCaret
 * @param {Selection} selection Selection.
 * @returns {Selection}
 */
testCaret.setCaret = function setCaret(caret) {
    let pos = new Pos(caret.path, caret.offset)

    let selection = new TextSelection(pos)

    theEditor.editor.setSelection(selection)
    theEditor.editor.focus()
    
    return selection
}

/**
 * Compares if the given carets refer to the same node and offset.
 * @function caretsMatch
 * @memberof testCaret
 * @param {Selection} left Caret to be compared.
 * @param {Selection} right Caret to be compared.
 * @returns {Boolean}
 */
testCaret.caretsMatch = function caretsMatch(left, right) {
    return left.eq(right)
}

window.testCaret = testCaret
