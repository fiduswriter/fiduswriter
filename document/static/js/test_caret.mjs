import {TextSelection} from "prosemirror-state"
/**
 * Helper functions for testing FidusWriter with Selenium.
 * @namespace testCaret
 */
let testCaret = {}

testCaret.setSelection = function(selectFrom, selectTo) {
    let caretOneRes = window.theApp.page.view.state.doc.resolve(selectFrom)
    let caretTwoRes = window.theApp.page.view.state.doc.resolve(selectTo)
    let selection = new TextSelection(caretOneRes, caretTwoRes)

    window.theApp.page.view.dispatch(
        window.theApp.page.view.state.tr.setSelection(selection)
    )
    window.theApp.page.view.focus()

    return selection
}

window.testCaret = testCaret
