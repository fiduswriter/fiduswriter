import {TextSelection} from "prosemirror-state"
/**
 * Helper functions for testing FidusWriter with Selenium.
 * @namespace testCaret
 */
let testCaret = {}

testCaret.setSelection = function(selectFrom, selectTo) {
    let caretOneRes = window.theEditor.view.state.doc.resolve(selectFrom)
    let caretTwoRes = window.theEditor.view.state.doc.resolve(selectTo)
    let selection = new TextSelection(caretOneRes, caretTwoRes)

    window.theEditor.view.dispatch(
        window.theEditor.view.state.tr.setSelection(selection)
    )
    window.theEditor.view.focus()

    return selection
}

window.testCaret = testCaret
