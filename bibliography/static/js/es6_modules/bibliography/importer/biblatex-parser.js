import {TexSpecialChars, BibFieldTypes} from "../statics"
import {addAlert} from "../../common/common"

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
                addAlert('error', gettext('A variable could not be identified. Possible error in bibtex syntax.'))
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

        for(let fKey in this.entries[this.currentEntry]) {
            if('bibtype' == fKey)
                continue
            let field = BibFieldTypes[fKey]

            if('undefined' == typeof(field)) {
                addAlert('error', fKey + gettext(' of ') +
                    this.currentEntry +
                    gettext(' cannot not be saved. Fidus Writer does not support the field.')
                )
                delete this.entries[this.currentEntry][fKey]
                continue
            }
            let fType = field['type']
            let fValue = this.entries[this.currentEntry][fKey]
            switch(fType) {
                case 'l_name':
                    this.entries[this.currentEntry][fKey] = this.reformName(fValue)
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

    reformName(name) {
        //reform name
        return name
    }

    reformDate(date) {
        //reform date
        return date
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
            let texChar = TexSpecialChars[i]
            let texCharRegExp = new window.RegExp(texChar[0],'g')
            value = value.replace(texCharRegExp, texChar[1])
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
