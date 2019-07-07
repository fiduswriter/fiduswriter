import {addAlert} from "../../common"

// Generate a copy of the fidus doc, imageDB and bibDB with all clutter removed.
export class ShrinkFidus {
    constructor(doc, imageDB, bibDB) {
        this.doc = doc
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.imageList = []
        this.citeList = []
    }

    init() {
        const shrunkImageDB = {},
            httpIncludes = []

        addAlert('info', gettext('File export has been initiated.'))

        this.walkTree(this.doc.contents)

        this.imageList = [...new Set(this.imageList)] // unique values

        this.imageList.forEach(itemId => {
            shrunkImageDB[itemId] = Object.assign({}, this.imageDB.db[itemId])
            // Remove parts that are connected to a particular user/server
            delete shrunkImageDB[itemId].cats
            delete shrunkImageDB[itemId].thumbnail
            delete shrunkImageDB[itemId].pk
            delete shrunkImageDB[itemId].added
            const imageUrl = shrunkImageDB[itemId].image
            const filename = imageUrl.split('/').pop()
            shrunkImageDB[itemId].image = filename
            httpIncludes.push({
                url: imageUrl,
                filename: filename
            })
        })

        this.citeList = [...new Set(this.citeList)] // unique values

        const shrunkBibDB = {}
        this.citeList.forEach(itemId => {
            shrunkBibDB[itemId] = Object.assign({}, this.bibDB.db[itemId])
            // Remove the entry_cat, as it is only a list of IDs for one
            // particular user/server.
            delete shrunkBibDB[itemId].entry_cat
        })

        const docCopy = Object.assign({}, this.doc)

        // Remove items that aren't needed.
        delete(docCopy.rights)
        delete(docCopy.version)
        delete(docCopy.comment_version)
        delete(docCopy.owner)
        delete(docCopy.id)
        delete(docCopy.is_owner)
        delete(docCopy.added)
        delete(docCopy.updated)
        delete(docCopy.revisions)

        return new Promise(resolve => resolve({
            doc: docCopy,
            shrunkImageDB,
            shrunkBibDB,
            httpIncludes
        }))
    }

    walkTree(node) {
        switch (node.type) {
            case 'citation':
                this.citeList = this.citeList.concat(node.attrs.references.map(ref => ref.id))
                break
            case 'figure':
                if (node.attrs.image !== false) {
                    this.imageList.push(node.attrs.image)
                }
                break
            case 'footnote':
                if (node.attrs && node.attrs.footnote) {
                    node.attrs.footnote.forEach(childNode => this.walkTree(childNode))
                }
                break
        }
        if (node.content) {
            node.content.forEach(childNode => this.walkTree(childNode))
        }
    }
}
