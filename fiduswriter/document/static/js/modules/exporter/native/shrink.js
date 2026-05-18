import {addAlert} from "../../common"
import {docSchema} from "../../schema/document"
import {toMiniJSON} from "../../schema/mini_json"
// Generate a copy of the fidus doc, imageDB and bibDB with all clutter removed.
export class ShrinkFidus {
    /**
     * @param {Object}  doc      - Full document object.
     * @param {Object}  imageDB  - Image database, e.g. {db: {...}}.
     * @param {Object}  bibDB    - Bibliography database, e.g. {db: {...}}.
     * @param {boolean} [silent=false] - When true, suppresses the
     *   "File export has been initiated" info alert.  Pass true when
     *   shrinking multiple documents in a loop (e.g. one per book chapter)
     *   and the caller already shows its own progress notification.
     */
    constructor(doc, imageDB, bibDB, silent = false) {
        this.doc = doc
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.silent = silent
        this.imageList = []
        this.citeList = []
    }

    init() {
        const shrunkImageDB = {},
            httpIncludes = []

        if (!this.silent) {
            addAlert("info", gettext("File export has been initiated."))
        }

        this.walkTree(this.doc.content)

        this.imageList = [...new Set(this.imageList)] // unique values

        this.imageList.forEach(itemId => {
            shrunkImageDB[itemId] = Object.assign({}, this.imageDB.db[itemId])
            // Remove parts that are connected to a particular user/server
            delete shrunkImageDB[itemId].cats
            delete shrunkImageDB[itemId].thumbnail
            delete shrunkImageDB[itemId].pk
            delete shrunkImageDB[itemId].added
            const imageUrl = shrunkImageDB[itemId].image
            let filename
            if (imageUrl.startsWith("blob:")) {
                // Blob URL produced by decrypting an E2EE image client-side.
                // The URL itself carries no useful file extension, so derive
                // one from the image entry's MIME type instead.  Without this
                // the server rejects the upload because get_encrypted_file_path
                // requires a recognised extension.
                const mime = shrunkImageDB[itemId].file_type || "image/png"
                const mimeExtMap = {
                    "image/png": "png",
                    "image/jpeg": "jpg",
                    "image/jpg": "jpg",
                    "image/webp": "webp",
                    "image/svg+xml": "svg",
                    "image/gif": "gif",
                    "image/avif": "avif"
                }
                const ext = mimeExtMap[mime] || "png"
                filename = `images/${itemId}.${ext}`
            } else {
                filename = `images/${imageUrl.split("/").pop()}`
            }
            shrunkImageDB[itemId].image = filename
            httpIncludes.push({
                url: imageUrl,
                filename
            })
        })

        this.citeList = [...new Set(this.citeList)] // unique values

        const shrunkBibDB = {}
        this.citeList.forEach(itemId => {
            shrunkBibDB[itemId] = Object.assign({}, this.bibDB.db[itemId])
            // Remove the cats, as it is only a list of IDs for one
            // particular user/server.
            delete shrunkBibDB[itemId].cats
        })

        const docCopy = Object.assign({}, this.doc)

        // Remove items that aren't needed.
        delete docCopy.rights
        delete docCopy.version
        delete docCopy.comment_version
        delete docCopy.owner
        delete docCopy.id
        delete docCopy.is_owner
        delete docCopy.added
        delete docCopy.updated
        delete docCopy.revisions

        docCopy.content = toMiniJSON(docSchema.nodeFromJSON(docCopy.content))

        return new Promise(resolve =>
            resolve({
                doc: docCopy,
                shrunkImageDB,
                shrunkBibDB,
                httpIncludes
            })
        )
    }

    walkTree(node) {
        switch (node.type) {
            case "citation":
                this.citeList = this.citeList.concat(
                    node.attrs.references.map(ref => ref.id)
                )
                break
            case "image":
                if (node.attrs.image !== false) {
                    this.imageList.push(node.attrs.image)
                }
                break
            case "footnote":
                if (node.attrs?.footnote) {
                    node.attrs.footnote.forEach(childNode =>
                        this.walkTree(childNode)
                    )
                }
                break
        }
        if (node.content) {
            node.content.forEach(childNode => this.walkTree(childNode))
        }
    }
}
