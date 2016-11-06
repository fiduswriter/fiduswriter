import {TexSpecialChars, BibFieldTypes, BibFieldAliasTypes, BibEntryTypes, BibEntryAliasTypes} from "../statics"
import {BibLatexNameStringParser} from "./name-string-parser"

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
        this.errors = []

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
            console.warn("Token mismatch, expected " + s +
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
                console.warn("Unterminated value")
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
                console.warn("Unterminated value:" + this.input.substring(
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
                console.warn("Value unexpected:" + this.input.substring(
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
                console.warn("Runaway key")
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
            console.warn(
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
        this.entries[this.currentEntry][kv[0]] = this.scanBibtexString(kv[1])
        // date may come either as year, year + month or as date field.
        // We therefore need to catch these hear and transform it to the
        // date field after evaluating all the fields.
        // All other date fields only come in the form of a date string.
        let date = {}
        while (this.tryMatch(",")) {
            this.match(",")
            //fixes problems with commas at the end of a list
            if (this.tryMatch("}")) {
                break
            }
            kv = this.keyEqualsValue()
            if (typeof (kv) === 'undefined') {
                this.errors.push({type: 'variable_error'})
                break
            }
            let val = this.scanBibtexString(kv[1])
            switch (kv[0]) {
                case 'date':
                case 'month':
                case 'year':
                    date[kv[0]] = val
                    break
                default:
                    this.entries[this.currentEntry][kv[0]] = val
            }

        }
        if (date.date) {
            // date string has precedence.
            this.entries[this.currentEntry].date = date.date
        } else if (date.year && date.month) {
            this.entries[this.currentEntry].date = `${date.year}-${date.month}`
        } else if (date.year) {
            this.entries[this.currentEntry].date = `${date.year}`
        }

        for(let fKey in this.entries[this.currentEntry]) {
            if('bibtype' == fKey) {
                let bibtype = this.entries[this.currentEntry]['bibtype']
                if (BibEntryAliasTypes[bibtype]) {
                    bibtype = BibEntryAliasTypes[bibtype]
                    this.entries[this.currentEntry]['bibtype'] = bibtype
                }

                let entry_type = _.findWhere(BibEntryTypes, {biblatex: bibtype})
                if('undefined' == typeof(entry_type)) {
                    this.errors.push({
                        type: 'unknown_type',
                        entry: this.currentEntry,
                        type_name: bibtype
                    })
                    this.entries[this.currentEntry]['bibtype'] = 'misc'
                }
                continue
            }
            // Replace alias fields with their main term.
            if (BibFieldAliasTypes[fKey]) {
                let value = this.entries[this.currentEntry][fKey]
                delete this.entries[this.currentEntry][fKey]
                fKey = BibFieldAliasTypes[fKey]
                this.entries[this.currentEntry][fKey] = value
            }
            let field = BibFieldTypes[fKey]

            if('undefined' == typeof(field)) {
                this.errors.push({
                    type: 'unknown_field',
                    entry: this.currentEntry,
                    field_name: fKey
                })
                delete this.entries[this.currentEntry][fKey]
                continue
            }
            let fType = field['type']
            let fValue = this.entries[this.currentEntry][fKey]
            switch(fType) {
                case 'l_name':
                    this.entries[this.currentEntry][fKey] = this.reformNameList(fValue)
                    break
                case 'f_date':
                    this.entries[this.currentEntry][fKey] = this.reformDate(fValue)
                    break
                case 'f_literal':
                    this.entries[this.currentEntry][fKey] = this.reformLiteral(fValue)
                    break
            }
        }

    }

    reformNameList(nameString) {
        let nameStringParser = new BibLatexNameStringParser(nameString)
        return nameStringParser.output.join(' and ')
    }

    reformDate(dateStr) {
        // TODO: handle start/end dates
        dateStr = dateStr.replace(/-AA/g,'')
        let dateFormat = '%Y-AA-AA'
        let dateLen = dateStr.split(/[\s,\./\-]/g).length
        if (2 < dateLen) {
            dateFormat = '%Y-%m-%d'
        } else if (2 === dateLen) {
            dateFormat = '%Y-%m-AA'
        }
        let theDate = new Date(dateStr)
        if ('Invalid Date' == theDate) {
            dateFormat = ''
        } else {
            dateFormat = dateFormat.replace('%d', ("0" + theDate.getDate()).slice(-2))
            dateFormat = dateFormat.replace('%m', ("0" + (theDate.getMonth()+1)).slice(-2))
            dateFormat = dateFormat.replace('%Y', theDate.getFullYear())
        }
        return dateFormat
    }


    reformLiteral(theValue) {
        let openBraces = ((theValue.match(/\{/g) || []).length),
            closeBraces = ((theValue.match(/\}/g) || []).length)
        if (openBraces === 0 && closeBraces === 0) {
            // There are no braces, return the original value
            return theValue
        } else if (openBraces != closeBraces) {
            // There are different amount of open and close braces, so we return the original string.
            return theValue
        } else {
            // There are the same amount of open and close braces, but we don't know if they are in the right order.
            let braceLevel = 0, len = theValue.length, i = 0, output = '', braceClosings = [], inCasePreserve = false

            const latexCommands = [
                ['\\textbf{', '<b>', '</b>'],
                ['\\textit{', '<i>', '</i>'],
                ['\\emph{', '<i>', '</i>'],
                ['\\textsc{', '<span style="font-variant:small-caps;">', '</span>'],
            ]
            parseString: while (i < len) {
                if (theValue[i] === '\\') {

                    for (let s of latexCommands) {
                        if (theValue.substring(i, i + s[0].length) === s[0]) {
                            braceLevel++
                            i += s[0].length
                            output += s[1]
                            braceClosings.push(s[2])
                            continue parseString
                        }
                    }

                    if (i + 1 < len) {
                        i+=2
                        output += theValue[i+1]
                        continue parseString
                    }

                }
                if (theValue[i] === '_' && theValue.substring(i,i+2) === '_{') {
                    braceLevel++
                    i+=2
                    output =+ '<sub>'
                    braceClosings.push('</sub>')
                }
                if (theValue[i] === '^' && theValue.substring(i,i+2) === '^{') {
                    braceLevel++
                    i+=2
                    output =+ '<sup>'
                    braceClosings.push('</sup>')
                }
                if (theValue[i] === '{') {
                    braceLevel++
                    if (inCasePreserve) {
                        // If already inside case preservation, do not add a second
                        braceClosings.push('')
                    } else {
                        inCasePreserve = braceLevel
                        output += '<span class="nocase">'
                        braceClosings.push('</span>')
                    }
                    i++
                    continue parseString
                }
                if (theValue[i] === '}') {
                    if (inCasePreserve===braceLevel) {
                        inCasePreserve = false
                    }
                    braceLevel--
                    if (braceLevel > -1) {
                        output += braceClosings.pop()
                        i++
                        continue parseString
                    }
                }
                if (braceLevel < 0) {
                    // A brace was closed before it was opened. Abort and return the original string.
                    return theValue
                }
                // math env, just remove
                if (theValue[i] === '$') {
                    i++
                    continue parseString
                }
                if (theValue[i] === '<') {
                    output += "&lt;"
                    i++
                    continue parseString
                }
                if (theValue[i] === '>') {
                    output += "&gt;"
                    i++
                    continue parseString
                }
                output += theValue[i]
                i++
            }

            if (braceLevel > 0) {
                // Too many opening braces, we return the original string.
                return theValue
            }
            // Braces were accurate.
            return output
        }
    }



    entry() {
        this.currentEntry = this.key()
        this.entries[this.currentEntry] = {}
        this.entries[this.currentEntry].bibtype = this.currentType
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


    scanBibtexString(value) {
        let len = TexSpecialChars.length
        for (let i = 0; i < len; i++) {
            let texChar = TexSpecialChars[i]
            let texCharRegExp = new window.RegExp(texChar[0],'g')
            value = value.replace(texCharRegExp, texChar[1])
        }
        // Delete multiple spaces
        value = value.replace(/ +(?= )/g, '')
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
