import JSZip from "jszip"

import {ImportNative} from "./native"
import {FW_FILETYPE_VERSION} from "../exporter/native"
import {updateFileDoc, updateFileBib} from "./update"
/** The current Fidus Writer filetype version. The importer will not import from
 * a different version and the exporter will include this number in all exports.
 */
const MIN_FW_FILETYPE_VERSION = 1.1, MAX_FW_FILETYPE_VERSION = parseFloat(FW_FILETYPE_VERSION)

const TEXT_FILENAMES = ['mimetype', 'filetype-version', 'document.json', 'images.json', 'bibliography.json']


export class ImportFidusFile {

    /* Process a packaged Fidus File, either through user upload, or by reloading
      a saved revision which was saved in the same ZIP-baseformat. */

    constructor(file, user, check=false, teamMembers=[]) {
        this.file = file
        this.user = user
        this.check = check // Whether the file needs to be checked for compliance with ZIP-format and whether authors of comments/changes are team members of current user.
        this.teamMembers = teamMembers
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
        let filetypeVersion = parseFloat(this.textFiles.find(file => file.filename === 'filetype-version').contents),
            mimeType = this.textFiles.find(file => file.filename === 'mimetype').contents
        if (mimeType === 'application/fidus+zip' &&
            filetypeVersion >= MIN_FW_FILETYPE_VERSION &&
            filetypeVersion <= MAX_FW_FILETYPE_VERSION) {
            // This seems to be a valid fidus file with current version number.
            let bibliography = updateFileBib(JSON.parse(
                this.textFiles.find(file => file.filename === 'bibliography.json').contents
            ), filetypeVersion)
            let images = JSON.parse(this.textFiles.find(file => file.filename === 'images.json').contents)
            let doc = updateFileDoc(
                JSON.parse(this.textFiles.find(file => file.filename === 'document.json').contents),
                bibliography,
                filetypeVersion
            )
            if (this.check) {
                doc = this.checkDocUsers(doc)
            }
            let importer = new ImportNative(
                doc,
                bibliography,
                images,
                this.otherFiles,
                this.user
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

    checkDocUsers(doc) { // Check whether users mentioned in doc are known to current user and present on this server
        Object.values(doc.comments).forEach(comment => {
            if (!
                (
                    this.teamMembers.find(member => member.id === comment.user && member.username === comment.username) ||
                    (this.user.id === comment.user && this.user.username === comment.username)
                )
            ) {
                // We could not find matching id/username accessible to current user, so we delete the user id from comment
                comment.user = 0
            }
            comment.answers.forEach(answer => {
                if (!
                    (
                        this.teamMembers.find(member => member.id === answer.user && member.username === answer.username) ||
                        (this.user.id === answer.user && this.user.username === answer.username)
                    )
                ) {
                    // We could not find matching id/username accessible to current user, so we delete the user id from comment answer
                    answer.user = 0
                }
            })
        })
        this.checkDocUsersNode(doc.contents)
        return doc
    }

    checkDocUsersNode(node) { // Check whether all users connected to insertion/deletion marks are known on this system.
        if (node.marks) {
            node.marks.forEach(mark => {
                if(['insertion','deletion'].includes(mark.type)) {
                    if (!
                        (
                            this.teamMembers.find(member => member.id === mark.attrs.user && member.username === mark.attrs.username) ||
                            (this.user.id === mark.attrs.user && this.user.username === mark.attrs.username)
                        )
                    ) {
                        // We could not find matching id/username accessible to current user, so we delete the user id from comment answer
                        mark.attrs.user = 0
                    }
                }
            })
        }
        if (node.content) {
            node.content.forEach(childNode => this.checkDocUsersNode(childNode))
        }
    }

}
