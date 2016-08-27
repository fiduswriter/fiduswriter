import {ImportNative} from "./native"
import JSZip from "jszip"

/** The current Fidus Writer filetype version. The importer will not import from
 * a different version and the exporter will include this number in all exports.
 */
const FW_FILETYPE_VERSION = 1.2,
    MIN_FW_FILETYPE_VERSION = 1.1,
    MAX_FW_FILETYPE_VERSION = 1.2

const TEXT_FILENAMES = ['mimetype', 'filetype-version', 'document.json', 'images.json', 'bibliography.json']

export class ImportFidusFile {

    /* Process a packaged Fidus File, either through user upload, or by reloading
      a saved revision which was saved in the same ZIP-baseformat. */

    constructor(file, user, check, bibDB, imageDB, callback) {
        this.file = file
        this.user = user
        this.callback = callback
        this.bibDB = bibDB // the user's current database object.
        this.imageDB = imageDB // the user's imageDB
        this.check = check // Whether the file needs to be checked for compliance with ZIP-format

        this.textFiles = []
        this.otherFiles = []
        this.init()
    }

    init() {
        // Check whether the file is a ZIP-file if check is not disabled.
        let that = this
        if (this.check === false) {
            this.initZipFileRead()
        }
        // use a BlobReader to read the zip from a Blob object
        let reader = new window.FileReader()
        reader.onloadend = function() {
            if (reader.result.length > 60 && reader.result.substring(0, 2) == 'PK') {
                that.initZipFileRead()
            } else {
                // The file is not a Fidus Writer file.
                that.callback(false, gettext('The uploaded file does not appear to be a Fidus Writer file.'))
                return
            }
        }
        reader.readAsText(this.file)
    }

    initZipFileRead() {
        // Extract all the files that can be found in every fidus-file (not images)
        let that = this
        let zipfs = new JSZip()
        zipfs.loadAsync(that.file).then(function(){
            let filenames = [], p = [], validFile = true

            zipfs.forEach(function(filename){
                filenames.push(filename)
            })

            TEXT_FILENAMES.forEach(function(filename){
                if (filenames.indexOf(filename) === -1) {
                    validFile = false
                }
            })
            if (!validFile) {
                that.callback(false, gettext('The uploaded file does not appear to be a Fidus Writer file.'))
                return false
            }

            filenames.forEach(function(filename){
                p.push(new window.Promise(function(resolve){
                    let fileType, fileList
                    if (TEXT_FILENAMES.indexOf(filename) !== -1) {
                        fileType = 'string'
                        fileList = that.textFiles
                    } else {
                        fileType = 'blob',
                        fileList = that.otherFiles
                    }
                    zipfs.files[filename].async(fileType).then(function(contents){
                        fileList.push({filename, contents})
                        resolve()
                    })
                }))
            })

            window.Promise.all(p).then(function(){
                that.processFidusFile()
            })
        })
    }

    processFidusFile() {
        let filetypeVersion = parseFloat(_.findWhere(this.textFiles, {
                filename: 'filetype-version'
            }).contents, 10),
            mimeType = _.findWhere(this.textFiles, {
                filename: 'mimetype'
            }).contents
        if (mimeType === 'application/fidus+zip' &&
            filetypeVersion >= MIN_FW_FILETYPE_VERSION &&
            filetypeVersion <= MAX_FW_FILETYPE_VERSION) {
            // This seems to be a valid fidus file with current version number.
            let shrunkBibDB = JSON.parse(
                _.findWhere(
                    this.textFiles, {
                        filename: 'bibliography.json'
                    }).contents)
            let shrunkImageDB = JSON.parse(_.findWhere(this.textFiles, {
                filename: 'images.json'
            }).contents)
            let aDocument = JSON.parse(_.findWhere(this.textFiles, {
                filename: 'document.json'
            }).contents)

            return new ImportNative(aDocument, shrunkBibDB, shrunkImageDB, this.otherFiles, this.user, this.bibDB, this.imageDB, this.callback)

        } else {
            // The file is not a Fidus Writer file.
            this.callback(false, gettext('The uploaded file does not appear to be of the version used on this server: ') + FW_FILETYPE_VERSION)
        }
    }

}
