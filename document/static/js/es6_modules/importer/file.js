import {ImportNative} from "./native"
import JSZip from "jszip"

/** The current Fidus Writer filetype version. The importer will not import from
 * a different version and the exporter will include this number in all exports.
 */
const FW_FILETYPE_VERSION = 1.2,
    MIN_FW_FILETYPE_VERSION = 1.1,
    MAX_FW_FILETYPE_VERSION = 1.2

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
        this.textFiles = [{
            filename: 'mimetype'
        }, {
            filename: 'filetype-version'
        }, {
            filename: 'document.json'
        }, {
            filename: 'images.json'
        }, {
            filename: 'bibliography.json'
        }]
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
        console.log(that.file)
        let zipfs = new JSZip()
        zipfs.loadAsync(that.file).then(function(){
            let j = 0
            let fileReadLoop = function() {
                if (j === that.textFiles.length) {
                    that.processFidusFile()
                } else {
                    if (that.textFiles[j].filename in zipfs.files) {
                        zipfs.files[that.textFiles[j].filename].async('string').then(function(contents){
                            that.textFiles[j].contents = contents
                            j++
                            fileReadLoop()
                        })
                    } else {
                        // The file is a zip file, but not a Fidus Writer file.
                        that.callback(false, gettext('The uploaded file does not appear to be a Fidus Writer file.'))
                    }
                }
            }
            fileReadLoop()
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

            return new ImportNative(aDocument, shrunkBibDB, shrunkImageDB, this.entries, this.user, this.bibDB, this.imageDB, this.callback)

        } else {
            // The file is not a Fidus Writer file.
            this.callback(false, gettext('The uploaded file does not appear to be of the version used on this server: ') + FW_FILETYPE_VERSION)
        }
    }

}
