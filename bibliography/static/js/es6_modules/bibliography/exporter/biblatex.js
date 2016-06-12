import {zipFileCreator} from "../../exporter/zip"
import {BibEntryTypes, BibFieldTypes, TexSpecialChars} from "../statics"

/** Export a list of bibliography items to bibLateX and serve the file to the user as a ZIP-file.
 * @class BibLatexExporter
 * @param pks A list of pks of the bibliography items that are to be exported.
 */

export class BibLatexExporter {

    constructor(pks, aBibDB, asZip) {
        this.pks = pks // A list of pk values of the bibliography items to be exported.
        this.aBibDB = aBibDB // The bibliography database to export from.
        this.asZip = asZip // Whether or not to send a zipfile to the user.
        this.init()
    }

    init() {
        this.bibLatexExport()

        if (this.asZip) {
            let exportObj = [{
                    'filename': 'bibliography.bib',
                    'contents': this.bibtexStr
                }]
            zipFileCreator(exportObj, [], 'bibliography.zip')
        }

    }

    bibLatexExport() {
        this.bibtexArray = []
        this.bibtexStr = ''

        let len = this.pks.length

        for (let i = 0; i < len; i++) {
            let pk = this.pks[i]
            let bib = this.aBibDB[pk]
            let bibEntry = {
                'type': BibEntryTypes[bib['entry_type']]['biblatex'],
                'key': bib['entry_key']
            }
            let fValues = {}
            for (let fKey in bib) {
                if ('entry_key' == fKey || 'id' == fKey || 'entry_type' ==
                    fKey || 'entry_owner' == fKey || 0 === fKey.indexOf(
                        'bibtype') ||
                    'entry_cat' == fKey)
                    continue
                let fValue = bib[fKey]
                if ("" === fValue)
                    continue
                let fType = BibFieldTypes[fKey]['type']
                if ('f_date' == fType) {
                    let dateParts = this._reformDate(fValue, fKey)
                    for (let datePart in dateParts) {
                        fValues[datePart] = dateParts[datePart]
                    }
                    continue
                }
                //fValue = this._escapeTexSpecialChars(fValue, pk)
                fValue = this._cleanBraces(fValue, pk)
                fValues[BibFieldTypes[fKey]['biblatex']] = fValue
            }
            bibEntry.values = fValues
            this.bibtexArray[this.bibtexArray.length] = bibEntry
        }
        this.bibtexStr = this._getBibtexString(this.bibtexArray)
    }

    _reformDate(theValue, typeName) {
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
                if (datePart != parseInt(datePart)) {
                    break
                }
                dateValue[dateValue.length] = datePart
            }
            datesValue[datesValue.length] = dateValue
        }
        let valueList = {}
        let dateLen = datesValue[0].length
        if (1 < datesValue.length)
            dateLen = Math.min(dateLen, datesValue[1].length)
        if (3 == dateLen) {
            theValue = datesValue[0].join('-')
            if (1 < datesValue.length)
                theValue += '/' + datesValue[1].join('-')
            valueList[typeName] = theValue
        } else if ('date' == typeName) {
            let year = datesValue[0][0]
            if (1 < datesValue.length)
                year += '/' + datesValue[1][0]
            valueList.year = year
            if (2 == dateLen) {
                let month = datesValue[0][1]
                if (1 < datesValue.length)
                    month += '/' + datesValue[1][1]
                valueList.month = month
            }
        } else {
            if (dateLen < datesValue[0].length)
                datesValue[0].splice(dateLen)
            theValue = datesValue[0].join('-')
            if (1 < datesValue.length) {
                if (dateLen < datesValue[1].length)
                    datesValue[1].splice(dateLen)
                theValue += '/' + datesValue[1].join('-')
            }
            valueList[typeName] = theValue
        }
        return valueList
    }

    _escapeTexSpecialChars(theValue, pk) {
        if ('string' != typeof (theValue)) {
            return false
        }
        let len = TexSpecialChars.length
        for (let i = 0; i < len; i++) {
            theValue = theValue.replace(TexSpecialChars[i].unicode,
                TexSpecialChars[i].tex)
        }
        return theValue
    }


    _cleanBraces(theValue, pk) {
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
            let braceLevel = 0, len = theValue.length
            for (let i = 0; i < len; i++) {
                if (theValue[i] === '{') {
                    braceLevel++
                }
                if (theValue[i] === '}') {
                    braceLevel--
                }
                if (braceLevel < 0) {
                    // A brace was closed before it was opened. Abort and remove all the braces.
                    theValue = theValue.replace(/\}/g, '')
                    theValue = theValue.replace(/\{/g, '')
                    return theValue
                }
            }
            // Braces were accurate.
            return theValue
        }
    }

    _getBibtexString(biblist) {
        let len = biblist.length,
            str = ''
        for (let i = 0; i < len; i++) {
            if (0 < i) {
                str += '\r\n\r\n'
            }
            let data = biblist[i]
            str += '@' + data.type + '{' + data.key
            for (let vKey in data.values) {
                str += ',\r\n' + vKey + ' = {' + data.values[vKey] + '}'
            }
            str += "\r\n}"
        }
        return str
    }




}
