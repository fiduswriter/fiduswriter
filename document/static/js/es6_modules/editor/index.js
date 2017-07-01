import * as objectHash from "object-hash/dist/object_hash"
import * as plugins from "../plugins/editor"
/* Functions for ProseMirror integration.*/
import {Slice, Fragment} from "prosemirror-model"
import {ReplaceAroundStep} from "prosemirror-transform"
import {EditorState, Plugin} from "prosemirror-state"
import {EditorView, Decoration, DecorationSet} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {toggleMark, baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap/dist/keymap"
import {buildKeymap} from "prosemirror-example-setup"
import {collab, getVersion} from "prosemirror-collab"

import {docSchema} from "../schema/document"
import {ModComments} from "./comments"
import {ModFootnotes} from "./footnotes"
import {ModCitations} from "./citations"
import {ModCollab} from "./collab"
import {ModTools} from "./tools"
import {ModSettings} from "./settings"
import {ModMenus} from "./menus"
import {randomHeadingId} from "../schema/common"
import {ModServerCommunications} from "./server-communications"
import {getMetadata, getSettings, updateDoc} from "../schema/convert"
import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"
import {Paste} from "./paste"

export const COMMENT_ONLY_ROLES = ['edit', 'review', 'comment']
export const READ_ONLY_ROLES = ['read', 'read-without-comments']
export const REVIEW_ROLES = ['review']

export class Editor {
    // A class that contains everything that happens on the editor page.
    // It is currently not possible to initialize more thna one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor(id) {
        this.mod = {}
        // Whether the editor is currently waiting for a document update. Set to true
        // initially so that diffs that arrive before document has been loaded are not
        // dealt with.
        this.waitingForDocument = true

        this.docInfo = {
            rights: '',
            unapplied_diffs: [],
            is_owner: false,
            title_changed: false,
            changed: false,
        }
        this.schema = docSchema
        this.doc = {
            // Initially we only have the id.
            id
        }
        this.user = false
        // The latest doc as confirmed by the server.
        this.confirmedDoc = false
        new ModServerCommunications(this)
    }

    init() {
        new ModSettings(this)
        jQuery(document).ready(() => {
            this.initEditor()
        })
    }

    initEditor() {
        this.view = new EditorView(document.getElementById('document-editable'), {
            state: EditorState.create({
                schema: this.schema
            }),
            onFocus: () => {
                if (this.currentView != this.view) {
                    this.currentView = this.view

                }
            },
            onBlur: () => {

            },
            transformPastedHTML: inHTML => {
                let ph = new Paste(inHTML, "main")
                return ph.getOutput()
            },
            dispatchTransaction: (transaction) => {
                let remote = transaction.getMeta('remote')
                if (!remote) {
                    if (this.onFilterTransaction(transaction)) {
                        return
                    }
                    this.onBeforeTransaction(this.view, transaction)
                }

                let newState = this.view.state.apply(transaction)
                this.view.updateState(newState)

                this.mod.footnotes.markers.scanForFootnoteMarkers(transaction, remote)

                this.mod.collab.docChanges.sendToCollaborators()

                this.onTransaction(transaction, remote)
                this.docInfo.changed = true
            }
        })
        // The editor that is currently being edited in -- main or footnote editor
        this.currentView = this.view
        new ModFootnotes(this)
        new ModCitations(this)
        new ModMenus(this)
        new ModCollab(this)
        new ModTools(this)
        new ModComments(this)

        this.mod.serverCommunications.init()
        this.setSaveTimers()
    }

    setSaveTimers() {
        // Set Auto-save to send the document every two minutes, if it has changed.
        this.sendDocumentTimer = window.setInterval(() => {
            if (this.docInfo && this.docInfo.changed &&
                READ_ONLY_ROLES.indexOf(this.docInfo.rights) === -1) {
                this.save()
            }
        }, 120000)

        // Set Auto-save to send the title every 5 seconds, if it has changed.
        this.sendDocumentTitleTimer = window.setInterval(() => {
            if (this.docInfo && this.docInfo.title_changed &&
                READ_ONLY_ROLES.indexOf(this.docInfo.rights) === -1) {
                this.docInfo.title_changed = false
                this.mod.serverCommunications.send({
                    type: 'update_title',
                    title: this.doc.title
                })
            }
        }, 10000)

        // Auto save the document when the user leaves the page.
        window.addEventListener("beforeunload", () => {
            if (this.docInfo && this.docInfo.changed &&
                READ_ONLY_ROLES.indexOf(this.docInfo.rights) === -1) {
                this.save()
            }
        })
    }


    activatePlugins() {
        // Add plugins, but only once.
        if (!this.plugins) {
            this.plugins = {}

            Object.keys(plugins).forEach(plugin => {
                if (typeof plugins[plugin] === 'function') {
                    this.plugins[plugin] = new plugins[plugin](this)
                    this.plugins[plugin].init()
                }
            })

        }
    }

    askForDocument() {
        if (this.waitingForDocument) {
            return
        }
        this.waitingForDocument = true
        this.mod.serverCommunications.send({
            type: 'get_document'
        })
    }

    removeBibDB() {
        delete this.bibDB
        // TODO: Need to to remove all entries of citation dialog!
    }

    getBibDB(userId) {
        if (!this.bibDB) { // Don't get the bibliography again if we already have it.
            let bibGetter = new BibliographyDB(userId, true)
            return bibGetter.getDB().then(({bibPKs, bibCats}) => {
                this.bibDB = bibGetter
                this.mod.menus.header.enableExportMenu()
            })
        } else {
            return Promise.resolve()
        }
    }

    removeImageDB() {
        delete this.imageDB
    }

    getImageDB(userId) {
        if (!this.imageDB) {
            let imageGetter = new ImageDB(userId)
            return imageGetter.getDB().then(() => {
                this.imageDB = imageGetter
                // assign image DB to be used in schema.
                this.schema.cached.imageDB = imageGetter
                // assign image DB to be used in footnote schema.
                this.mod.footnotes.schema.cached.imageDB = imageGetter
            })
        } else {
            return Promise.resolve()
        }
    }

    enableUI() {

        jQuery('.savecopy, .saverevision, .download, .template-export, \
        .latex, .epub, .html, .print, .style, \
      .citationstyle, .tools-item, .papersize, .metadata-menu-item, \
      #open-close-header').removeClass('disabled')

        this.mod.settings.check(this.view.state.doc.firstChild.attrs)

        if (READ_ONLY_ROLES.indexOf(this.docInfo.rights) > -1) {
            jQuery('#editor-navigation').hide()
            jQuery('.metadata-menu-item, #open-close-header, .save, \
          .multibuttonsCover, .papersize-menu, .metadata-menu, \
          .documentstyle-menu, .citationstyle-menu').addClass('disabled')
        } else {
            jQuery('#editor-navigation').show()
            jQuery('.metadata-menu-item, #open-close-header, .save, \
          .papersize-menu, .metadata-menu, \
          .documentstyle-menu, .citationstyle-menu').removeClass('disabled')
            if (this.docInfo.is_owner) {
                // bind the share dialog to the button if the user is the document owner
                jQuery('.share').removeClass('disabled')
                jQuery('.submit-ojs').removeClass('disabled')
            }
            if (COMMENT_ONLY_ROLES.indexOf(this.docInfo.rights) > -1) {
                let toolbar = jQuery('.editortoolbar')
                toolbar.find('.ui-buttonset').hide()
                toolbar.find('.comment-only').show()
            }
            else {
                jQuery('.metadata-menu-item, #open-close-header, .save, \
              .papersize-menu, .metadata-menu, \
              .documentstyle-menu, .citationstyle-menu').removeClass('disabled')
            }
        }
    }

    receiveDocument(data) {
        // Remove footnote markers
        this.mod.footnotes.markers.removeAllMarkers()
        // Reset collaboration
        this.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
        this.mod.collab.docChanges.unconfirmedSteps = {}
        if (this.mod.collab.docChanges.awaitingDiffResponse) {
            this.mod.collab.docChanges.enableDiffSending()
        }
        // Update document to newest document version
        this.doc = updateDoc(data.doc)

        this.docInfo = data.doc_info
        this.docInfo.changed = false
        this.docInfo.title_changed = false
        if (this.doc.version === 0) {
            // If the document is new, change the url.
            window.history.replaceState("", "", `/document/${this.doc.id}/`)
        }
        if (data.hasOwnProperty('user')) {
            this.user = data.user
        } else {
            this.user = this.doc.owner
        }

        this.mod.serverCommunications.send({
            type: 'participant_update'
        })
        return this.getImageDB(this.doc.owner.id).then(() => {

            let stateConfig = {
                schema: this.schema,
                plugins: [
                    history(),
                    keymap(baseKeymap),
                    keymap(buildKeymap(this.schema)),
                    collab({version: this.doc.version})
                ]
            }
            if (this.doc.contents.type) {
                stateConfig.doc = docSchema.nodeFromJSON({type:'doc',content:[this.doc.contents]})
            }
            // Set document in prosemirror
            this.view.updateState(EditorState.create(stateConfig))

            // Set initial confirmed doc
            this.confirmedDoc = this.view.state.doc

            if (this.docInfo.unapplied_diffs.length > 0) {
                // We have unapplied diffs -- this should only happen if the last disconnect
                // happened before we could save. We try to apply the diffs and then save
                // immediately.
                try {
                    // We only try because this fails if the PM diff format has changed.
                    while (this.docInfo.unapplied_diffs.length > 0) {
                        let diff = this.docInfo.unapplied_diffs.shift()
                        this.mod.collab.docChanges.applyDiff(diff)
                    }
                    return this.save()
                } catch (error) {
                    // We couldn't apply the diffs. They are likely corrupted.
                    // We remove remaining diffs, increase the version by one and
                    // save to the server.
                    this.doc.version += this.docInfo.unapplied_diffs.length + 1
                    this.docInfo.unapplied_diffs = []
                    console.warn('Diffs could not be applied correctly!')

                    return this.save()
                }
            }

            // Set document hash
            this.docInfo.hash = this.getHash()

            // Render footnotes based on main doc
            this.mod.footnotes.fnEditor.renderAllFootnotes()

            //  Steup comemtn handling
            this.mod.comments.store.setVersion(this.doc.comment_version)
            _.each(this.doc.comments, comment => {
                this.mod.comments.store.addLocalComment(comment.id, comment.user,
                    comment.userName, comment.userAvatar, comment.date, comment.comment,
                    comment.answers, comment['review:isMajor'])
            })
            this.mod.comments.store.on("mustSend", () => {
                this.mod.collab.docChanges.sendToCollaborators()
            })
            this.mod.comments.layout.onChange()

            return this.getBibDB(this.doc.owner.id).then(() => {
                this.activatePlugins()
                this.enableUI()
                this.waitingForDocument = false
            })
        })
    }

    updateComments(comments, comment_version) {
        this.mod.comments.store.receive(comments, comment_version)
    }

    // Creates a hash value for the entire document so that we can compare with
    // other clients if we really have the same contents.
    getHash() {
        return objectHash.MD5(
            this.confirmedDoc.toJSON(),
            {unorderedArrays: true}
        )
    }

    // Get updates to document and then send updates to the server
    save() {
        return this.getUpdates().then(
            () => this.sendDocumentUpdate()
        )
    }

    // Collects updates of the document from ProseMirror and saves it under this.doc
    getUpdates() {
        let pmArticle = this.confirmedDoc.firstChild
        this.doc.contents = pmArticle.toJSON()
        this.doc.metadata = getMetadata(pmArticle)
        Object.assign(this.doc.settings, getSettings(pmArticle))
        this.doc.title = pmArticle.firstChild.textContent
        this.doc.version = getVersion(this.view.state)
        this.docInfo.hash = this.getHash()
        this.doc.comments = this.mod.comments.store.comments
        return Promise.resolve()
    }

    // Send changes to the document to the server
    sendDocumentUpdate() {
        let doc = {
            title: this.doc.title,
            metadata: this.doc.metadata,
            settings: this.doc.settings,
            contents: this.doc.contents,
            version: this.doc.version,
        }

        this.mod.serverCommunications.send({
            type: 'update_doc',
            doc,
            hash: this.docInfo.hash
        })

        this.docInfo.changed = false

        return Promise.resolve()
    }

    // filter transactions.
    onFilterTransaction(transaction) {
        let prohibited = false

        if (READ_ONLY_ROLES.indexOf(this.docInfo.rights) > -1) {
            // User only has read access. Don't allow anything.
            prohibited = true
        } else if (COMMENT_ONLY_ROLES.indexOf(this.docInfo.rights) > -1) {
            //User has a comment-only role (commentator, editor or reviewer)

            //Check all transaction steps. If step type not allowed = prohibit
            //check if in allowed array. if false - exit loop
            if (!transaction.steps.every(step =>
                (step.jsonID === 'addMark' || step.jsonID === 'removeMark') &&
                step.mark.type.name === 'comment'
            )) {
                prohibited = true
            }
        }

        return prohibited
    }

    // Use PMs scrollIntoView function and adjust for top menu
    scrollIntoView(view, pos) {
        let topMenuHeight = jQuery('#editor-tools-wrapper').outerHeight() + jQuery('#header').outerHeight() + 10
        let distanceFromTop = view.coordsAtPos(pos).top - topMenuHeight
        window.scrollBy(0, distanceFromTop)
    }

    // Things to execute before every editor transaction
    onBeforeTransaction(view, transaction) {
        //Check if there are any headings in the affected area. Otherwise, skip.
        let foundHeading = false

        let ranges = []
        transaction.steps.forEach((step, index) => {
            if (step.jsonID === 'replace' || step.jsonID === 'replaceAround') {
                ranges.push([step.from, step.to])
            }
            ranges = ranges.map(range => {
                return [
                    transaction.mapping.maps[index].map(range[0], -1),
                    transaction.mapping.maps[index].map(range[1], 1)
                ]
            })
        })
        ranges.forEach(range => transaction.doc.nodesBetween(
            range[0],
            range[1],
            (node, pos, parent) => {
                if (node.type.name === 'heading') {
                    foundHeading = true
                }
            }
        ))

        if (!foundHeading) {
            return
        }

        // Check that unique IDs only exist once in the document
        // If an ID is used more than once, add steps to change the ID of all
        // but the first occurence.
        let linkIds = [], doubleIds = []

        // ID should not be found in the other pm either. So we look through
        // those as well.
        let otherView = view === this.view ? this.mod.footnotes.fnView : this.view

        otherView.state.doc.descendants(node => {
            if (node.type.name === 'heading') {
                linkIds.push(node.attrs.id)
            }
        })

        transaction.doc.descendants((node, pos) => {
            if (node.type.name === 'heading') {
                if (linkIds.includes(node.attrs.id)) {
                    doubleIds.push({
                        node,
                        pos
                    })
                }
                linkIds.push(node.attrs.id)
            }
        })

        // Change the IDs of the nodes that having an ID that was used previously
        // already.
        doubleIds.forEach(doubleId => {
            let node = doubleId.node,
                posFrom = doubleId.pos,
                posTo = posFrom + node.nodeSize,
                blockId

            while (!blockId || linkIds.includes(blockId)) {
                blockId = randomHeadingId()
            }

            let attrs = {
                level: node.attrs.level,
                id: blockId
            }

            // Because we only change attributes, positions should stay the
            // the same throughout all our extra steps. We therefore do no
            // mapping of positions through these steps.
            // This works for headlines, which are block nodes with text inside
            // (which should stay the same). Figures and inline content will
            // likely need to use ReplaceStep instead.
            transaction.step(
                new ReplaceAroundStep(
                    posFrom,
                    posTo,
                    posFrom + 1,
                    posTo - 1,
                    new Slice(Fragment.from(node.type.create(attrs)), 0, 0),
                    1,
                    true
                )
            )

            linkIds.push(blockId)
        })
    }

    // Things to be executed on every editor transaction.
    onTransaction(transaction, remote) {
        let updateBibliography = false, updateTitle = false, updateSettings = false,
            commentIds = []
            // Check what area is affected

        transaction.steps.forEach((step, index) => {
            if (step.jsonID === 'replace' || step.jsonID === 'replaceAround') {
                if (step.from !== step.to) {
                    transaction.docs[index].nodesBetween(
                        step.from,
                        step.to,
                        (node, pos, parent) => {
                            if (node.type.name === 'citation') {
                                // A citation was replaced
                                updateBibliography = true
                            }
                            if (!remote) {
                                let commentId = this.mod.comments.layout.findCommentId(node)
                                if (commentId !== false && !commentIds.includes(commentId)) {
                                    commentIds.push(commentId)
                                }
                            }
                        }
                    )
                    if (step.from===0 && step.jsonID === 'replaceAround') {
                        updateSettings = true
                    }
                }
                let docPart = transaction.docs[index].resolve(step.from).node(2)
                if (docPart && docPart.type.name === 'title') {
                    updateTitle = true
                }
            }
        })

        if (updateBibliography) {
            // Recreate the bibliography
            this.mod.citations.resetCitations()
        } else {
            this.mod.citations.layoutCitations()
        }

        if (updateTitle) {
            let documentTitle = this.view.state.doc.firstChild.firstChild.textContent
            // The title has changed. We will update our document. Mark it as changed so
            // that an update may be sent to the server.
            if (documentTitle.substring(0, 255) !== this.doc.title) {
                this.doc.title = documentTitle.substring(0, 255)
                if (!remote) {
                    this.docInfo.title_changed = true
                }
            }
        }
        if (updateSettings) {
            this.mod.settings.check(this.view.state.doc.firstChild.attrs)
        }
        if (!remote && commentIds.length > 0) {
            // Check if the deleted comment referrers still are somewhere else in the doc.
            // If not, move them.
            this.mod.comments.store.checkAndMove(commentIds)
        }
        if (transaction.selectionSet) {
            this.mod.comments.layout.onSelectionChange()
        } else {
            this.mod.comments.layout.onChange()
        }

    }

}
