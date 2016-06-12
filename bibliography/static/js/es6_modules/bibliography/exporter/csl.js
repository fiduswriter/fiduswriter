import {BibEntryTypes, BibFieldTypes} from "../statics"

/** Converts a BibDB to a DB of the CSL type.
 * @param bibDB The bibliography database to convert.
 */

export class CSLExporter {
    constructor(bibDB) {
        this.bibDB = bibDB
        this.cslDB = {}
        this.convertAll()
    }

    convertAll() {
        for (let bibId in this.bibDB) {
            this.cslDB[bibId] = this.getCSLEntry(bibId)
            this.cslDB[bibId].id = bibId
        }
    }
    /** Converts one BibDB entry to CSL format.
     * @function getCSLEntry
     * @param id The id identifying the bibliography entry.
     */
    getCSLEntry(id) {
        let bib = this.bibDB[id],
            cslOutput = {}

        for (let fKey in bib) {
            if (bib[fKey] !== '' && fKey in BibFieldTypes && 'csl' in BibFieldTypes[fKey]) {
                let fType = BibFieldTypes[fKey]['type']
                if ('f_date' == fType) {
                    cslOutput[BibFieldTypes[fKey]['csl']] = this._reformDate(
                        bib[fKey])
                } else if ('l_name' == fType) {
                    cslOutput[BibFieldTypes[fKey]['csl']] = this._reformName(
                        bib[fKey])
                } else if ('f_literal' == fType) {
                    // Allow formatting
                    cslOutput[BibFieldTypes[fKey]['csl']] = this._reformString(
                        bib[fKey])
                } else {
                    cslOutput[BibFieldTypes[fKey]['csl']] = bib[fKey]
                }
            }
        }
        cslOutput['type'] = BibEntryTypes[bib.entry_type].csl
        return cslOutput
    }

    _reformDate(theValue) {
        //reform date-field
        let dates = theValue.split('/'),
            datesValue = [],
            len = dates.length
        for (let i = 0; i < len; i++) {
            let eachDate = dates[i]
            let dateParts = eachDate.split('-')
            let dateValue = []
            let len2 = dateParts.length
            for (let j = 0; j < len2; j++) {
                let datePart = dateParts[j]
                if (datePart != parseInt(datePart))
                    break
                dateValue[dateValue.length] = datePart
            }
            datesValue[datesValue.length] = dateValue
        }

        return {
            'date-parts': datesValue
        }
    }

    _reformName(theValue) {
        //reform name-field
        let names = theValue.substring(1, theValue.length - 1).split(
            '} and {'),
            namesValue = [],
            len = names.length
        for (let i = 0; i < len; i++) {
            let eachName = names[i]
            let nameParts = eachName.split('} {')
            let nameValue
            if (nameParts.length > 1) {
                nameValue = {
                    'family': nameParts[1].replace(/[{}]/g, ''),
                    'given': nameParts[0].replace(/[{}]/g, '')
                }
            } else {
                nameValue = {
                    'literal': nameParts[0].replace(/[{}]/g, '')
                }
            }
            namesValue[namesValue.length] = nameValue
        }

        return namesValue
    }


    // Adopted from _cleanBraces in biblatex exporter.
    _reformString(theValue) {
        let openBraces = ((theValue.match(/\{/g) || []).length),
            closeBraces = ((theValue.match(/\}/g) || []).length)
        if (openBraces === 0 && closeBraces === 0) {
            // There are no braces, return the original value
            return theValue
        } else if (openBraces != closeBraces) {
            // There are different amount of open and close braces, so we delete them all.
            theValue = theValue.replace(/}/g, '')
            theValue = theValue.replace(/{/g, '')
            return theValue
        } else {
            // There are the same amount of open and close braces, but we don't know if they are in the right order.
            let braceLevel = 0, len = theValue.length, i = 0, output = '', braceClosings = []

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
                    output += '<span class="nocase">'
                    braceClosings.push('</span>')
                    i++
                    continue parseString
                }
                if (theValue[i] === '}') {
                    braceLevel--
                    if (braceLevel > -1) {
                        output += braceClosings.pop()
                        i++
                        continue parseString
                    }
                }
                if (braceLevel < 0) {
                    // A brace was closed before it was opened. Abort and remove all the braces.
                    theValue = theValue.replace(/\}/g, '')
                    theValue = theValue.replace(/\{/g, '')
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
            // Braces were accurate.
            return output
        }
    }
}
