import {Books} from "./es6_modules/books/books"

/* Create theBooks and make it available to the general namespace for debugging
purposes.*/

let theBooks = new Books()
window.theBooks = theBooks
