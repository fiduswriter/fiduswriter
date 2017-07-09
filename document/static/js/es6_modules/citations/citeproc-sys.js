/* Connects Fidus Writer citation system with citeproc */
import {citationDefinitions} from "../style/citation-definitions"
import {CSLExporter} from "biblatex-csl-converter"

export class citeprocSys {
    constructor(bibDB) {
        this.bibDB = bibDB
        this.abbreviations = {
            "default": {}
        }
        this.abbrevsname = "default"
        // We cache values retrieved once.
        this.items = {}
        this.missingItems = []
    }

    retrieveItem(id) {
        if (!this.items[id]) {
            if (this.bibDB.db[id]) {
                let cslGetter = new CSLExporter(this.bibDB.db, [id])
                Object.assign(this.items, cslGetter.output)
            } else {
                this.missingItems.push(id)
                this.items[id] = {author:{literal:''}, type: 'article', id}
            }
        }
        return this.items[id]
    }

    retrieveLocale(lang) {
        let language_code = lang.replace('-','')
        let citDef = citationDefinitions.find(citDef => citDef.language_code===language_code)
        if (!citDef) {
            citDef = citationDefinitions.find(citDef => citDef.language_code==='enUS')
        }
        return citDef

    }

    getAbbreviation(dummy, obj, jurisdiction, vartype, key) {
        try {
            if (this.abbreviations[this.abbrevsname][vartype][key]) {
                obj["default"][vartype][key] = this.abbreviations[this.abbrevsname][vartype][key]
            } else {
                obj["default"][vartype][key] = ""
            }
        } catch (error) {
            // There is breakage here that needs investigating.
        }
    }
}
