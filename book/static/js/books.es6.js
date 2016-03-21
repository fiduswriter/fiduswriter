import {Books} from "./es6_modules/books/books"

/* Create theEditor and make it available to the general namespace, so that all
the non-editor-specific pieces of JavaScript that are not written in ES6 can get
access to it.*/

let theBooks = new Books()
window.theBooks = theBooks
