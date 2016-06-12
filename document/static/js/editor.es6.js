import {Editor} from "./es6_modules/editor/editor"

/* Create theEditor and make it available to the general namespace.
*/

let theEditor = new Editor()
window.theEditor = theEditor
