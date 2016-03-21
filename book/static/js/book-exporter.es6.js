import {render as katexRender} from "katex"

import {downloadHtml} from "./es6_modules/book-exporter/html"
import {downloadLatex} from "./es6_modules/book-exporter/latex"
import {downloadEpub} from "./es6_modules/book-exporter/epub"
/**
* Functions for exporting books (to epub, LaTeX, HTML).
* @namespace bookExporter
*/
let bookExporter = {
  downloadHtml, downloadLatex, downloadEpub
}









window.bookExporter = bookExporter
