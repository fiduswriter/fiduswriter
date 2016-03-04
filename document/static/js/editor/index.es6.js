import {Editor} from "./es6_modules/editor"

/* Create theEditor and make it available to the general namespace, so that all
the non-editor-specific pieces of JavaScript that are not written in ES6 can get
access to it.*/

let theEditor = new Editor()
window.theEditor = theEditor
