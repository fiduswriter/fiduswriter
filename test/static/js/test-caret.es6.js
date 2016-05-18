import {TextSelection} from "prosemirror/dist/edit/selection"
/**
 * Helper functions for testing FidusWriter with Selenium.
 * @namespace testCaret
 */
let testCaret = {}


/**
 * Returns the current selection.
 * @function getCaret
 * @memberof testCaret
 * @returns {Caret}
 */
testCaret.getCaret = function getCaret() {
    return window.theEditor.pm.selection.from.toJSON()
}

/**
 * Sets an empty selection to caret.
 * @function setCaret
 * @memberof testCaret
 * @param {Selection} caret Selection.
 * @returns {Selection}
 */
testCaret.setCaret = function setCaret(caret) {
    return testCaret.setSelection(caret, caret)
}

/**
 * Sets the selection to be between two caret positions.
 * @function setSelection
 * @memberof testCaret
 * @param {caretOne} caretOne The first caret.
 * @param {caretTwo} caretTwo The second caret position.
 * @returns {Selection}
 */
testCaret.setSelection = function setSelection(caretOne, caretTwo) {

    let selection = new TextSelection(caretOne, caretTwo)

    window.theEditor.pm.setSelection(selection)
    window.theEditor.pm.focus()

    return selection
}

/**
 * Checks if the given selections are equal.
 * @function caretsMatch
 * @memberof testCaret
 * @param {Selection} left Caret to be compared.
 * @param {Selection} right Caret to be compared.
 * @returns {Boolean}
 */
testCaret.selectionsMatch = function selectionsMatch(left, right) {
    return left.eq(right)
}

window.testCaret = testCaret
