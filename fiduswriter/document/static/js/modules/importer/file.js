import {ImportNative} from "./native"
import {FW_DOCUMENT_VERSION} from "../schema"
import {updateFile} from "./update"
/** The current Fidus Writer filetype version. The importer will not import from
 * a different version and the exporter will include this number in all exports.
 */
const MIN_FW_DOCUMENT_VERSION = 1.6, MAX_FW_DOCUMENT_VERSION = parseFloat(FW_DOCUMENT_VERSION)

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
        this.ok = false
        this.statusText = ""
        this.doc = false
        this.docInfo = false
    }

    init() {
        // Check whether the file is a ZIP-file if check is not disabled.
        if (this.check === false) {
            return this.initZipFileRead()
        }
        return new Promise(resolve => {
            // use a BlobReader to read the zip from a Blob object
            const reader = new window.FileReader()
            reader.onloadend = () => {
                if (reader.result.length > 60 && reader.result.substring(0, 2) === 'PK') {
                    this.initZipFileRead().then(() => resolve(this))
                } else {
                    this.statusText = gettext('The uploaded file does not appear to be a Fidus Writer file.')
                    resolve(this)
                }

            }
            reader.readAsText(this.file)
        })
    }

    initZipFileRead() {
        // Extract all the files that can be found in every fidus-file (not images)
        return import("jszip").then(({default: JSZip}) => new JSZip()).then(
            zipfs => zipfs.loadAsync(this.file)
        ).then(zipfs => {
            const filenames = [], p = []
            let validFile = true

            zipfs.forEach(filename => filenames.push(filename))

            TEXT_FILENAMES.forEach(filename => {
                if (filenames.indexOf(filename) === -1) {
                    validFile = false
                }
            })
            if (!validFile) {
                this.statusText = gettext('The uploaded file does not appear to be a Fidus Writer file.')
                return
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
        const filetypeVersion = parseFloat(this.textFiles.find(file => file.filename === 'filetype-version').contents),
            mimeType = this.textFiles.find(file => file.filename === 'mimetype').contents
        if (mimeType === 'application/fidus+zip' &&
            filetypeVersion >= MIN_FW_DOCUMENT_VERSION &&
            filetypeVersion <= MAX_FW_DOCUMENT_VERSION) {
            // This seems to be a valid fidus file with current version number.
            const images = JSON.parse(this.textFiles.find(file => file.filename === 'images.json').contents),
                updatedFile =  updateFile(
                    JSON.parse(this.textFiles.find(file => file.filename === 'document.json').contents),
                    filetypeVersion,
                    JSON.parse(
                        this.textFiles.find(file => file.filename === 'bibliography.json').contents
                    )
                ),
                {bibliography} = updatedFile
            let {doc} = updatedFile
            if (this.check) {
                doc = this.checkDocUsers(doc)
            }
            const importer = new ImportNative(
                doc,
                bibliography,
                images,
                this.otherFiles,
                this.user
            )
            return importer.init().then(({doc, docInfo}) => {
                this.ok = true
                this.doc = doc
                this.docInfo = docInfo
                this.statusText = `${doc.title} ${gettext('successfully imported.')}`
                return this
            })

        } else {
            // The file is not a Fidus Writer file.
            this.statusText = gettext('The uploaded file does not appear to be of the version used on this server: ') +
            FW_DOCUMENT_VERSION
            return this
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
            if (!
                (
                    !comment.assignedUser ||
                    this.teamMembers.find(member => member.id === comment.assignedUser && member.username === comment.assignedUsername) ||
                    (this.user.id === comment.assignedUser && this.user.username === comment.assignedUsername)
                )
            ) {
                // We could not find matching id/username accessible to current user, so we delete the assignedUser id from comment
                comment.assignedUser = 0
            }
            if (comment.answers) {
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
            }
        })
        this.checkDocUsersNode(doc.contents)
        return doc
    }

    checkDocUsersNode(node) { // Check whether all users connected to insertion/deletion marks are known on this system.
        if (node.marks) {
            node.marks.forEach(mark => {
                if (['insertion', 'deletion'].includes(mark.type)) {
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
