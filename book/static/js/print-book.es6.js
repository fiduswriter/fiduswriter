import {Books} from "./es6_modules/print-book/print-book"

/* Create thePrintBook and make it available to the general namespace for debugging
purposes.*/

let thePrintBook = new PrintBook()
window.thePrintBook = thePrintBook
