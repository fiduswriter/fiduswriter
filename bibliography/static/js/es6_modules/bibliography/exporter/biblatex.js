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
                    'contents': this.bibtex_str
                }]
            zipFileCreator(exportObj, [], 'bibliography.zip')
        }

    }

    bibLatexExport() {
        this.bibtex_array = []
        this.bibtex_str = ''

        let len = this.pks.length

        for (let i = 0; i < len; i++) {
            let pk = this.pks[i]
            let bib = this.aBibDB[pk]
            let bib_entry = {
                'type': BibEntryTypes[bib['entry_type']]['biblatex'],
                'key': bib['entry_key']
            }
            let f_values = {}
            for (let f_key in bib) {
                if ('entry_key' == f_key || 'id' == f_key || 'entry_type' ==
                    f_key || 'entry_owner' == f_key || 0 == f_key.indexOf(
                        'bibtype') ||
                    'entry_cat' == f_key)
                    continue
                let f_value = bib[f_key]
                if ("" == f_value)
                    continue
                let f_type = BibFieldTypes[f_key]['type']
                if ('f_date' == f_type) {
                    let date_parts = this._reformDate(f_value, f_key)
                    for (let date_part in date_parts) {
                        f_values[date_part] = date_parts[date_part]
                    }
                    continue
                }
                //f_value = this._escapeTexSpecialChars(f_value, pk)
                f_value = this._cleanBraces(f_value, pk)
                f_values[BibFieldTypes[f_key]['biblatex']] = f_value
            }
            bib_entry.values = f_values
            this.bibtex_array[this.bibtex_array.length] = bib_entry
        }
        this.bibtex_str = this._getBibtexString(this.bibtex_array)
    }

    _reformDate(the_value, type_name) {
        //reform date-field
        let dates = the_value.split('/'),
            dates_value = [],
            len = dates.length

        for (let i = 0; i < len; i++) {
            let each_date = dates[i]
            let date_parts = each_date.split('-')
            let date_value = []
            let len2 = date_parts.length
            for (let j = 0; j < len2; j++) {
                let date_part = date_parts[j]
                if (date_part != parseInt(date_part)) {
                    break
                }
                date_value[date_value.length] = date_part
            }
            dates_value[dates_value.length] = date_value
        }
        let value_list = {}
        let date_len = dates_value[0].length
        if (1 < dates_value.length)
            date_len = Math.min(date_len, dates_value[1].length)
        if (3 == date_len) {
            the_value = dates_value[0].join('-')
            if (1 < dates_value.length)
                the_value += '/' + dates_value[1].join('-')
            value_list[type_name] = the_value
        } else if ('date' == type_name) {
            let year = dates_value[0][0]
            if (1 < dates_value.length)
                year += '/' + dates_value[1][0]
            value_list.year = year
            if (2 == date_len) {
                let month = dates_value[0][1]
                if (1 < dates_value.length)
                    month += '/' + dates_value[1][1]
                value_list.month = month
            }
        } else {
            if (date_len < dates_value[0].length)
                dates_value[0].splice(date_len)
            the_value = dates_value[0].join('-')
            if (1 < dates_value.length) {
                if (date_len < dates_value[1].length)
                    dates_value[1].splice(date_len)
                the_value += '/' + dates_value[1].join('-')
            }
            value_list[type_name] = the_value
        }
        return value_list
    }

    _escapeTexSpecialChars(the_value, pk) {
        if ('string' != typeof (the_value)) {
            console.log(the_value, pk)
        }
        let len = TexSpecialChars.length
        for (let i = 0; i < len; i++) {
            the_value = the_value.replace(TexSpecialChars[i].unicode,
                TexSpecialChars[i].tex)
        }
        return the_value
    }

    _cleanBraces(the_value, pk) {
        let openBraces = ((the_value.match(/\{/g) || []).length),
            closeBraces = ((the_value.match(/\}/g) || []).length)
        if (openBraces === 0 && closeBraces === 0) {
            // There are no braces, return the original value
            return the_value
        } else if (openBraces != closeBraces) {
            // There are different amount of open and close braces, so we delete them all.
            the_value = the_value.replace(/}/g, '')
            the_value = the_value.replace(/{/g, '')
            return the_value
        } else {
            // There are the same amount of open and close braces, but we don't know if they are in the right order.
            let braceLevel = 0, len = the_value.length
            for (let i = 0; i < len; i++) {
                if (the_value[i] === '{') {
                    braceLevel++
                }
                if (the_value[i] === '}') {
                    braceLevel--
                }
                if (braceLevel < 0) {
                    // A brace was closed before it was opened. Abort and remove all the braces.
                    the_value = the_value.replace(/\}/g, '')
                    the_value = the_value.replace(/\{/g, '')
                    return the_value
                }
            }
            // Braces were accurate.
            return the_value
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
            for (let v_key in data.values) {
                str += ',\r\n' + v_key + ' = {' + data.values[v_key] + '}'
            }
            str += "\r\n}"
        }
        return str
    }




}
