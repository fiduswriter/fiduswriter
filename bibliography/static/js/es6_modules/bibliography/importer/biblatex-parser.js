import {TexSpecialChars} from "../statics"

/** Parses files in BibTeX/BibLaTeX format
 * @function bibTexParser
 */

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
]

export class BibLatexParser {

    constructor() {
        this.pos = 0
        this.input = ""

        this.entries = {}
        this.strings = {
            JAN: "January",
            FEB: "February",
            MAR: "March",
            APR: "April",
            MAY: "May",
            JUN: "June",
            JUL: "July",
            AUG: "August",
            SEP: "September",
            OCT: "October",
            NOV: "November",
            DEC: "December"
        }
        this.currentKey = ""
        this.currentEntry = ""
        this.currentType = ""

    }

    setInput(t) {
        this.input = t
    }

    getEntries() {
        return this.entries
    }

    isWhitespace(s) {
        return (s == ' ' || s == '\r' || s == '\t' || s == '\n')
    }

    match(s) {
        this.skipWhitespace()
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
            this.pos += s.length
        } else {
            console.log("Token mismatch, expected " + s +
                ", found " + this.input
                .substring(this.pos))
        }
        this.skipWhitespace()
    }

    tryMatch(s) {
        this.skipWhitespace()
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
            return true
        } else {
            return false
        }
        this.skipWhitespace()
    }

    skipWhitespace() {
        while (this.isWhitespace(this.input[this.pos])) {
            this.pos++
        }
        if (this.input[this.pos] == "%") {
            while (this.input[this.pos] != "\n") {
                this.pos++
            }
            this.skipWhitespace()
        }
    }

    skipToNext() {
        while ((this.input.length > this.pos) && (this.input[this.pos] !=
            "@")) {
            this.pos++
        }
        if (this.input.length == this.pos) {
            return false
        } else {
            return true
        }
    }
    /*
    reformNames(names) {
        //reform name
    }

    reformDates(dates) {
        //reform date
    }*/

    valueBraces() {
        let bracecount = 0
        this.match("{")
        let start = this.pos
        while (true) {
            if (this.input[this.pos] == '}' && this.input[this.pos - 1] !=
                '\\') {
                if (bracecount > 0) {
                    bracecount--
                } else {
                    let end = this.pos
                    this.match("}")
                    return this.input.substring(start, end)
                }
            } else if (this.input[this.pos] == '{' && this.input[this.pos - 1] !=
                '\\') {
                bracecount++
            } else if (this.pos == this.input.length - 1) {
                console.log("Unterminated value")
            }
            this.pos++
        }
    }

    valueQuotes() {
        this.match('"')
        let start = this.pos
        while (true) {
            if (this.input[this.pos] == '"' && this.input[this.pos - 1] !=
                '\\') {
                let end = this.pos
                this.match('"')
                return this.input.substring(start, end)
            } else if (this.pos == this.input.length - 1) {
                console.log("Unterminated value:" + this.input.substring(
                    start))
            }
            this.pos++
        }
    }

    singleValue() {
        let start = this.pos
        if (this.tryMatch("{")) {
            return this.valueBraces()
        } else if (this.tryMatch('"')) {
            return this.valueQuotes()
        } else {
            let k = this.key()
            if (this.strings[k.toUpperCase()]) {
                return this.strings[k.toUpperCase()]
            } else if (k.match("^[0-9]+$")) {
                return k
            } else {
                console.log("Value unexpected:" + this.input.substring(
                    start))
            }
        }
    }

    value() {
        let values = []
        values.push(this.singleValue())
        while (this.tryMatch("#")) {
            this.match("#")
            values.push(this.singleValue())
        }
        return values.join("")
    }

    key() {
        let start = this.pos
        while (true) {
            if (this.pos == this.input.length) {
                console.log("Runaway key")
                return
            }
            if (this.input[this.pos].match("[a-zA-Z0-9_:;`\\.\\\?+/-]")) {
                this.pos++
            } else {
                return this.input.substring(start, this.pos).toLowerCase()
            }
        }
    }

    keyEqualsValue() {
        let key = this.key()
        if (this.tryMatch("=")) {
            this.match("=")
            let val = this.value()
            return [key, val]
        } else {
            console.log(
                "... = value expected, equals sign missing: " + this.input
                .substring(this.pos))
        }
    }

    keyValueList() {
        let kv = this.keyEqualsValue()
        if (_.isUndefined(kv)) {
            // Entry has no fields, so we delete it.
            delete this.entries[this.currentEntry]
            return
        }
        this.entries[this.currentEntry][kv[0]] = this.scanBibtexString(kv[
            1])
        while (this.tryMatch(",")) {
            this.match(",")
            //fixes problems with commas at the end of a list
            if (this.tryMatch("}")) {
                break
            }
            kv = this.keyEqualsValue()
            if (typeof (kv) === 'undefined') {
                $.addAlert('error', gettext('A variable could not be identified. Possible error in bibtex syntax.'))
                break
            }
            let val = this.scanBibtexString(kv[1])
            switch (kv[0]) {
            case 'date':
            case 'month':
            case 'year':
                this.entries[this.currentEntry].date[kv[0]] = val
                break
            default:
                this.entries[this.currentEntry][kv[0]] = val
            }

        }
        let issued = this.entries[this.currentEntry].date.date
        let dateFormat = 'd.m.Y'
        if ('undefined' === typeof (issued) || '' === issued) {
            if ('undefined' === typeof (this.entries[this.currentEntry].date
                .month)) {
                issued = ''
                dateFormat = 'Y'
            } else {
                issued = '-' + this.entries[this.currentEntry].date.month
                dateFormat = 'm.Y'
            }
            if ('undefined' == typeof (this.entries[this.currentEntry].date
                .year)) {
                issued = ''
                dateFormat = ''
            } else {
                issued = this.entries[this.currentEntry].date.year + issued
            }
        } else {
            if (issued.indexOf('/') !== -1) {
                // TODO: handle dates that have a from/to value
                issued = issued.split('/')[0]
            }
            let dateDividers = issued.match(/-/g)
            if (!dateDividers) {
                dateFormat = 'Y'
            } else if (1 === dateDividers.length) {
                dateFormat = 'm.Y'
            }
        }
        issued = new Date(issued)
        if ('Invalid Date' == issued) {
            dateFormat = ''
        } else {
            dateFormat = dateFormat.replace('d', issued.getDate())
            dateFormat = dateFormat.replace('m', MONTH_NAMES[issued.getMonth()])
            dateFormat = dateFormat.replace('Y', issued.getFullYear())
        }
        this.entries[this.currentEntry].date = dateFormat
        //TODO: check the value type and reform the value, if needed.
        /*
        let fType
        for(let fKey in this.entries[this.currentEntry]) {
            if('bibtype' == fKey)
                continue
            fType = BibFieldtypes[fKey]
            if('undefined' == typeof(fType)) {
                delete this.entries[this.currentEntry][fKey]
                continue
            }
            fValue = this.entries[this.currentEntry][fKey]
            switch(fType) {
                case 'l_name':
                    this.entries[this.currentEntry][fKey] = this.reformNames(fValue)
                    break
                case 'f_date':
                    this.entries[this.currentEntry][fKey] = this.reformDates(fValue)
                    break
            }
        }
        */
    }

    entryBody() {
        this.currentEntry = this.key()

        this.entries[this.currentEntry] = {}
        this.entries[this.currentEntry].bibtype = this.currentType
        this.entries[this.currentEntry].date = {}
        this.match(",")
        this.keyValueList()
    }

    directive() {
        this.match("@")
        this.currentType = this.key()
        return "@" + this.currentType
    }

    string() {
        let kv = this.keyEqualsValue()
        this.strings[kv[0].toUpperCase()] = kv[1]
    }

    preamble() {
        this.value()
    }

    entry() {
        this.entryBody()
    }

    scanBibtexString(value) {
        let len = TexSpecialChars.length
        for (let i = 0; i < len; i++) {
            let specialChar = TexSpecialChars[i]
            while (-1 < value.indexOf(specialChar.tex)) {
                value = value.replace(specialChar.tex, specialChar.unicode)
            }
        }
        // Delete multiple spaces
        value = value.replace(/ +(?= )/g, '')
        //value = value.replace(/\{(.*?)\}/g, '$1')
        return value
    }

    bibtex() {
        while (this.skipToNext()) {
            let d = this.directive()
            this.match("{")
            if (d == "@string") {
                this.string()
            } else if (d == "@preamble") {
                this.preamble()
            } else if (d == "@comment") {
                continue
            } else {
                this.entry()
            }
            this.match("}")
        }
    }


}
