import {TextSelection} from "prosemirror-state"
/**
 * Helper functions for testing FidusWriter with Selenium.
 * @namespace testCaret
 */
let testCaret = {}

testCaret.setSelection = function setSelection(selectFrom, selectTo) {
    let caretOneRes = window.theEditor.pm.doc.resolve(selectFrom)
    let caretTwoRes = window.theEditor.pm.doc.resolve(selectTo)
    let selection = new TextSelection(caretOneRes, caretTwoRes)

    window.theEditor.view.dispatch(
        window.theEditor.view.state.tr.setSelection(selection)
    )
    window.theEditor.view.focus()

    return selection
}
