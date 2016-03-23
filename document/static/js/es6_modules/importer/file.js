import {ImportNative} from "./native"


/** The current Fidus Writer filetype version. The importer will not import from
 * a different version and the exporter will include this number in all exports.
 */
const FW_FILETYPE_VERSION = 1.2, MIN_FW_FILETYPE_VERSION = 1.1, MAX_FW_FILETYPE_VERSION = 1.2

export class ImportFidusFile {

    constructor(file, user, check, callback) {
        this.file = file
        this.user = user
        this.callback = callback
        this.check = check
        this.init()
    }

    init() {
        let that = this
        if (this.check === false) {
            this.initZipFileRead()
        }
        // use a BlobReader to read the zip from a Blob object
        let reader = new FileReader()
        reader.onloadend = function() {
            if (reader.result.length > 60 && reader.result.substring(0,2) == 'PK') {
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
        let that = this

        zip.createReader(new zip.BlobReader(that.file), function (reader) {
            // get all entries from the zip

            reader.getEntries(function (entries) {

                if (entries.length) {
                    that.entries = entries

                    that.textFiles = [{
                            filename: 'mimetype'
                        }, {
                            filename: 'filetype-version'
                        }, {
                            filename: 'document.json'
                        }, {
                            filename: 'images.json'
                        }, {
                            filename: 'bibliography.json'
                        }
                    ]

                    let counter = 0

                    function getEntry() {
                        if (counter < that.textFiles.length) {
                            _.findWhere(entries, that.textFiles[counter]).getData(
                                new zip.TextWriter(), function (text) {
                                    that.textFiles[counter]['contents'] = text
                                    counter++
                                    getEntry()
                                })
                        } else {
                            that.processFidusFile()
                        }
                    }

                    getEntry()

                }
            })

        }, function (error) {
            this.callback(false, gettext('An error occured during file read.'))
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

            return new ImportNative(aDocument, shrunkBibDB, shrunkImageDB, this.entries, this.user, this.callback)

        } else {
                // The file is not a Fidus Writer file.
                this.callback(false, gettext('The uploaded file does not appear to be of the version used on this server: ')+FW_FILETYPE_VERSION)
            }
    }





}
