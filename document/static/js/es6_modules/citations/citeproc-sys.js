/* Connects Fidus Writer citation system with citeproc */
import {citationDefinitions} from "../style/citation-definitions"

export class citeprocSys {
    constructor(cslDB) {
        this.cslDB = cslDB
        this.abbreviations = {
            "default": {}
        }
        this.abbrevsname = "default"
    }

    retrieveItem(id) {
        return this.cslDB[id]
    }

    retrieveLocale(lang) {
        return citationDefinitions.locals[lang]
    }

    getAbbreviation(dummy, obj, jurisdiction, vartype, key) {
        try {
            if (this.abbreviations[this.abbrevsname][vartype][key]) {
                obj["default"][vartype][key] = this.abbreviations[this.abbrevsname][vartype][key]
            } else {
                obj["default"][vartype][key] = ""
            }
        } catch (e) {
            // There is breakage here that needs investigating.
        }
    }
}
