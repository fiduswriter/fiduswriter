import {ImportNative} from "./native"
import {updateDoc} from "../schema/convert"
import JSZip from "jszip"
import {FW_FILETYPE_VERSION} from "../exporter/native"
/** The current Fidus Writer filetype version. The importer will not import from
 * a different version and the exporter will include this number in all exports.
 */
const MIN_FW_FILETYPE_VERSION = 1.1, MAX_FW_FILETYPE_VERSION = parseFloat(FW_FILETYPE_VERSION)

const TEXT_FILENAMES = ['mimetype', 'filetype-version', 'document.json', 'images.json', 'bibliography.json']

export function updateFileDoc(doc, filetypeVersion) {
    switch(filetypeVersion) {
        case "1.1":
        case "1.2":
            doc = Object.assign({}, doc)
            delete(doc.comment_version)
            delete(doc.access_rights)
            delete(doc.version)
            delete(doc.owner)
            delete(doc.id)
            delete(doc.hash)
            doc = updateDoc(doc)
            break
        case "1.3":
        case "1.4":
        case "1.5":
        case "1.6":
            doc = updateDoc(doc)
            break
    }
    return doc
}

export function updateFileBib(bib, filetypeVersion) {
    switch(filetypeVersion) {
        case "1.1":
        case "1.2":
        case "1.3":
        case "1.4":
            bib = updateBib(bib)
            break
    }
    return bib
}

// entry_type was used instead of bib_type up until file format 1.4 (FW 3.1 pre-release)
const ENTRY_TYPES = {
    1: 'article',
    2: 'book',
    3: 'mvbook',
    4: 'inbook',
    5: 'bookinbook',
    6: 'suppbook',
    7: 'booklet',
    8: 'collection',
    9: 'mvcollection',
    10: 'incollection',
    11: 'suppcollection',
    12: 'manual',
    13: 'misc',
    14: 'online',
    15: 'patent',
    16: 'periodical',
    17: 'suppperiodical',
    18: 'proceedings',
    19: 'mvproceedings',
    20: 'inproceedings',
    21: 'reference',
    22: 'mvreference',
    23: 'inreference',
    24: 'report',
    25: 'thesis',
    26: 'unpublished',
    27: 'article-magazine',
    28: 'article-newspaper',
    29: 'article-journal',
    30: 'entry-encyclopedia',
    31: 'entry-dictionary',
    32: 'post-weblog',
    33: 'post'
}

const f_date = ['date', 'urldate', 'eventdate', 'origdate']

const l_name = ['afterword', 'annotator', 'author', 'bookauthor',
    'commentator', 'editor', 'editora', 'editorb', 'editorc', 'foreword',
    'holder', 'introduction', 'shortauthor', 'shorteditor', 'translator']

const f_key = ['authortype', 'bookpagination', 'editortype', 'editoratype',
    'editorbtype', 'editorctype', 'origlanguage', 'pagination', 'pubstate',
    'type']

const l_range = ['pages']

const l_key = ['language']

const f_literal = ['abstract', 'addendum', 'annotation', 'booksubtitle',
    'booktitle', 'booktitleaddon', 'chapter', 'eid', 'entrysubtype',
    'eprinttype', 'eprintclass', 'eventtitle', 'howpublished', 'indextitle',
    'isan', 'isbn', 'ismn', 'isrn', 'issn', 'issue', 'issuesubtitle',
    'issuetitle', 'iswc', 'journalsubtitle', 'journaltitle', 'label', 'library',
    'mainsubtitle', 'maintitle', 'maintitleaddon', 'nameaddon', 'note',
    'number', 'origtitle', 'pagetotal', 'part', 'reprinttitle', 'series',
    'shorthand', 'shorthandintro', 'shortjournal', 'shortseries',
    'shorttitle', 'subtitle', 'title', 'titleaddon', 'venue', 'version',
    'volume', 'volumes']

const l_literal = ['institution', 'location', 'organization', 'origlocation',
    'origpublisher', 'publisher']

const f_integer = ['edition']

const f_verbatim = ['doi', 'eprint', 'file', 'url']

const ignored_fields = ['entry_cat', 'entry_type', 'entry_key']

function strip_brackets_and_html(string) {
    return string.replace(/<[^<]+?>/g,'').replace(/}|{/g,'')
}

function reform_f_date(date_string) {
    date_string = date_string.replace(/-AA/g,'').replace(/A/g,'u')
    let ref_date_strings = []
    date_string.split('/').forEach(date => {
        let date_parts = date.split('-')
        let year = "0000" + date_parts[0]
        let ref_date_string = year.substr(year.length - 4)
        if (date_parts.length > 1) {
            let month = "0" + date_parts[1]
            ref_date_string += '-' + month.substr(month.length - 2)
        }
        if (date_parts.length > 2) {
            let day = "0" + date_parts[2]
            ref_date_string += '-' + day.substr(day.length - 2)
        }
        ref_date_strings.push(ref_date_string)
    })

    return ref_date_strings.join('/')
}


function reform_l_name(name_string) {
    let names = name_string.replace(/^{|}$/g,'').split('} and {')
    let names_value = []
    names.forEach(each_name => {
        let name_parts = each_name.split('} {')
        let name_value = {}
        if (name_parts.length > 1) {
            name_value['family'] = []
            name_value['given'] = []
            let family_name = strip_brackets_and_html(name_parts[1])
            if (family_name.length) {
                name_value['family'].push({'type':'text', 'text': family_name})
            }
            let given_name = strip_brackets_and_html(name_parts[0])
            if (given_name.length) {
                name_value['given'].push({'type':'text', 'text': given_name})
            }
        } else {
            name_value['literal'] = []
            let literal_name = strip_brackets_and_html(name_parts[0])
            if (literal_name.length) {
                name_value['literal'].push({'type':'text', 'text': literal_name})
            }
        }
        names_value.push(name_value)
    })
    return names_value
}


function reform_f_literal(lit_string) {
    let cleaned_string = strip_brackets_and_html(lit_string)
    if (cleaned_string.length) {
        return [{'type':'text', 'text': cleaned_string}]
    } else {
        return []
    }

}

function reform_l_literal(list_string) {
    let in_list = list_string.replace(/^{|}$/g,'').split('} and {')
    let out_list = []
    in_list.forEach(item => {
        out_list.push(reform_f_literal(item))
    })
    return out_list
}

function reform_l_range(range_string) {
    if (range_string.length === 0) {
        return []
    }
    let range_list = range_string.split(',')
    let out_list = []
    range_list.forEach(range_item => {
        let range_parts = range_item.split('-')
        if (range_parts.length > 1) {
            out_list.push([reform_f_literal(range_parts[0]), reform_f_literal(range_parts.pop())])
        } else {
            out_list.push([reform_f_literal(range_item)])
        }
    })
    return out_list
}


let updateBib = function(bib) {
    let newBibs = {}
    Object.keys(bib).forEach(bibId => {
        let oldBibEntry = bib[bibId]
        let newBibEntry = {
            entry_type: 'misc',
            entry_key: 'FidusWriter',
            fields: {}
        }
        if (oldBibEntry['entry_type']) {
            newBibEntry['bib_type'] = ENTRY_TYPES[oldBibEntry['entry_type']]
        }
        if (oldBibEntry['entry_key']) {
            newBibEntry['entry_key'] = oldBibEntry['entry_key']
        }
        Object.keys(oldBibEntry).forEach(key => {
            if (f_date.includes(key)) {
                newBibEntry.fields[key] = reform_f_date(oldBibEntry[key])
            } else if (l_name.includes(key)) {
                newBibEntry.fields[key] = reform_l_name(oldBibEntry[key])
            } else if (f_literal.includes(key)) {
                newBibEntry.fields[key] = reform_f_literal(oldBibEntry[key])
            } else if (f_key.includes(key)) {
                newBibEntry.fields[key] = reform_f_literal(oldBibEntry[key])
            } else if (f_integer.includes(key)) {
                newBibEntry.fields[key] = reform_f_literal(oldBibEntry[key])
            } else if (l_literal.includes(key)) {
                newBibEntry.fields[key] = reform_l_literal(oldBibEntry[key])
            } else if (l_key.includes(key)) {
                newBibEntry.fields[key] = reform_l_literal(oldBibEntry[key])
            } else if (l_range.includes(key)) {
                newBibEntry.fields[key] = reform_l_range(oldBibEntry[key])
            } else if (f_verbatim.includes(key)) {
                newBibEntry.fields[key] = oldBibEntry[key]
            } else if (!ignored_fields.includes(key)) {
                console.warn(`Unknown field type: ${key}`)
            }
        })
        newBibs[bibId] = newBibEntry
    })
    return newBibs
}

export class ImportFidusFile {

    /* Process a packaged Fidus File, either through user upload, or by reloading
      a saved revision which was saved in the same ZIP-baseformat. */

    constructor(file, user, check, bibDB, imageDB, docId) {
        this.file = file
        this.user = user
        this.check = check // Whether the file needs to be checked for compliance with ZIP-format
        this.bibDB = bibDB // the user's bibDB
        this.imageDB = imageDB // the user's imageDB
        // The ID of an existing doc which will be overwritten with the imported zip
        // file's contents. This doc has to have version==0 for the server to accept
        // the import. This is used by the OJS system when an editor/reviewer is
        // importing a file into a doc as an empty doc is initialized with a any new revision
        // so that access rights can be set on it before the doc import from the zubmission
        // revision zip file_object has not taken place yet.
        this.docId = docId

        this.textFiles = []
        this.otherFiles = []
    }

    init() {
        // Check whether the file is a ZIP-file if check is not disabled.
        if (this.check === false) {
            return this.initZipFileRead()
        }
        return new Promise((resolve, reject) => {
            // use a BlobReader to read the zip from a Blob object
            let reader = new window.FileReader()
            reader.onloadend = () => {
                if (reader.result.length > 60 && reader.result.substring(0, 2) == 'PK') {
                    resolve()
                } else {
                    // The file is not a Fidus Writer file.
                    reject(gettext('The uploaded file does not appear to be a Fidus Writer file.'))
                }
            }
            reader.readAsText(this.file)
        }).then(() => this.initZipFileRead())
    }

    initZipFileRead() {
        // Extract all the files that can be found in every fidus-file (not images)
        let zipfs = new JSZip()
        return zipfs.loadAsync(this.file).then(() => {
            let filenames = [], p = [], validFile = true

            zipfs.forEach(filename => filenames.push(filename))

            TEXT_FILENAMES.forEach(filename => {
                if (filenames.indexOf(filename) === -1) {
                    validFile = false
                }
            })
            if (!validFile) {
                return Promise.reject(gettext('The uploaded file does not appear to be a Fidus Writer file.'))
            }

            filenames.forEach(filename => {
                p.push(new Promise(resolve => {
                    let fileType, fileList
                    if (TEXT_FILENAMES.indexOf(filename) !== -1) {
                        fileType = 'string'
                        fileList = this.textFiles
                    } else {
                        fileType = 'blob'
                        fileList = this.otherFiles
                    }
                    zipfs.files[filename].async(fileType).then(contents => {
                        fileList.push({filename, contents})
                        resolve()
                    })
                }))
            })
            return Promise.all(p).then(() => this.processFidusFile())
        })
    }

    processFidusFile() {
        let filetypeVersion = this.textFiles.find(file => file.filename === 'filetype-version').contents,
            mimeType = this.textFiles.find(file => file.filename === 'mimetype').contents
        if (mimeType === 'application/fidus+zip' &&
            parseFloat(filetypeVersion) >= MIN_FW_FILETYPE_VERSION &&
            parseFloat(filetypeVersion) <= MAX_FW_FILETYPE_VERSION) {
            // This seems to be a valid fidus file with current version number.
            let shrunkBibDB = updateFileBib(JSON.parse(
                this.textFiles.find(file => file.filename === 'bibliography.json').contents
            ), filetypeVersion)
            let shrunkImageDB = JSON.parse(this.textFiles.find(file => file.filename === 'images.json').contents)
            let aDocument = updateFileDoc(JSON.parse(this.textFiles.find(file => file.filename === 'document.json').contents), filetypeVersion)
            let importer = new ImportNative(
                aDocument,
                shrunkBibDB,
                shrunkImageDB,
                this.otherFiles,
                this.user,
                this.bibDB,
                this.imageDB,
                this.docId
            )
            return importer.init()

        } else {
            // The file is not a Fidus Writer file.
            return Promise.reject(
                gettext('The uploaded file does not appear to be of the version used on this server: ') +
                FW_FILETYPE_VERSION
            )
        }
    }

}
