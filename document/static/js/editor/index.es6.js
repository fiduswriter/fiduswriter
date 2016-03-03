import {Editor} from "./es6_modules/editor"


/** Helper functions for the editor.
 * @namespace editorHelpers
 */
var editorHelpers = {};

/** Call printing dialog and destroy print view after printing. (step 2 of printing process)
 * @function print
 * @memberof editorHelpers
 */

editorHelpers.printReady = function() {
    var flowTo = document.getElementById('print');
    window.print();
    jQuery(flowTo).hide();
    jQuery(flowTo).html('');
    delete window.flowCopy;
};


document.addEventListener('layoutFlowFinished', editorHelpers.printReady, false);

/** Initiate printing using simplePagination. (step 1 of printing process)
 * @function print
 * @memberof editorHelpers
 */

editorHelpers.print = function() {
    var flowTo = document.getElementById('print');
    window.flowCopy = document.getElementById('flow').cloneNode(true);
    jQuery(flowTo).show();
    pagination.applyBookLayoutWithoutDivision();
};

window.editorHelpers = editorHelpers;


let theEditor = new Editor()
window.theEditor = theEditor
