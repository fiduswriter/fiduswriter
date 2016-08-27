import {modelToEditor} from "../editor/node-convert"
import {Docxtemplater} from "docxtemplater/es6/docxtemplater"

export class WordExporter {
    constructor(doc, bibDB) {
        // We use the doc in the pm format as this is what we will be using
        // throughout the application in the future.
        this.pmDoc = modelToEditor(doc)
        this.bibDB = bibDB

        this.exporter()
    }

    exporter() {
        staticUrl+'/docx/template.docx'
        console.log('EXpORT')
    //    console.log(makeDocx)
    }


}
