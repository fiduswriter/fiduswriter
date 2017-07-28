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
import {tableEditing} from "prosemirror-tables"
import {dropCursor} from "prosemirror-dropcursor"

import {docSchema} from "../schema/document"
import {ModComments} from "./comments"
import {ModFootnotes} from "./footnotes"
import {ModCitations} from "./citations"
import {ModCollab} from "./collab"
import {ModTools} from "./tools"
import {ModSettings} from "./settings"
import {headerbarModel, toolbarModel} from "./menus"
import {ModStyles} from "./styles"
import {randomHeadingId, randomFigureId} from "../schema/common"
import {ModServerCommunications} from "./server-communications"
import {getMetadata, getSettings, updateDoc} from "../schema/convert"
import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"
import {Paste} from "./paste"
import {addDropdownBox} from "../common"
import {placeholdersPlugin} from "./plugins/placeholders"
import {headerbarPlugin} from "./plugins/headerbar"
import {toolbarPlugin} from "./plugins/toolbar"
import {collabCaretsPlugin} from "./plugins/collab-carets"
import {footnoteMarkersPlugin} from "./plugins/footnote-markers"
import {commentsPlugin} from "./plugins/comments"
import {linksPlugin} from "./plugins/links"

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
            id,
            rights: '',
            unapplied_diffs: [],
            owner: undefined,
            is_owner: false,
            title_changed: false,
            changed: false,
        }
        this.schema = docSchema
        this.user = false
        // The latest doc as confirmed by the server.
        this.confirmedDoc = false
        this.menu = {
            headerbarModel,
            toolbarModel
        }
        this.statePlugins = [
            [history],
            [keymap, () => baseKeymap],
            [keymap, () => buildKeymap(this.schema)],
            [collab, doc => ({version: doc.version})],
            [dropCursor],
            [tableEditing],
            [placeholdersPlugin],
            [headerbarPlugin, () => ({editor: this})],
            [toolbarPlugin, () => ({editor: this})],
            [collabCaretsPlugin],
            [footnoteMarkersPlugin, () => ({editor: this})],
            [commentsPlugin, () => ({editor: this})],
            [linksPlugin, () => ({editor: this})]
        ]
        new ModFootnotes(this)
        new ModServerCommunications(this)
    }

    init() {
        new ModSettings(this)
        jQuery(document).ready(() => {
            this.initEditor()
        })
    }

    initEditor() {

        //this.bindEvents()

        this.view = new EditorView(document.getElementById('document-editable'), {
            state: EditorState.create({
                schema: this.schema
            }),
            onFocus: () => {
                if (this.currentView != this.view) {
                    this.currentView = this.view
                }
            },
            onBlur: (view) => {
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
                this.onTransaction(transaction, remote)
            }
        })
        // The editor that is currently being edited in -- main or footnote editor
        this.currentView = this.view
        this.mod.footnotes.init()
        new ModCitations(this)
        new ModCollab(this)
        new ModTools(this)
        new ModComments(this)
        new ModStyles(this)
        this.activateFidusPlugins()
        this.mod.serverCommunications.init()
        this.setSaveTimers()
    }

    /*bindEvents() {
        let that = this
        jQuery(document).on('dblclick', 'a', function(event) {

            let url = jQuery(this).attr('href'),
                splitUrl = url.split('#'),
                baseUrl = splitUrl[0],
                id = splitUrl[1]

            if (!id || (baseUrl !== '' &!(baseUrl.includes(window.location.host)))) {
                window.open(url, '_blank')
                return
            }

            let stillLooking = true
            that.view.state.doc.descendants((node, pos) => {
                if (stillLooking && (node.type.name === 'heading' || node.type.name === 'figure') && node.attrs.id === id) {
                    that.scrollIntoView(that.view, pos)
                    stillLooking = false
                }
            })
            if (stillLooking) {
                that.mod.footnotes.fnEditor.view.state.doc.descendants((node, pos) => {
                    if (stillLooking && (node.type.name === 'heading' || node.type.name === 'figure') && node.attrs.id === id) {
                        that.scrollIntoView(that.mod.footnotes.fnEditor.view, pos)
                        stillLooking = false
                    }
                })
            }
        })
    } */

    setSaveTimers() {
        // Set Auto-save to send the document every two minutes, if it has changed.
        this.sendDocumentTimer = window.setInterval(() => {
            if (this.docInfo && this.docInfo.changed &&
                READ_ONLY_ROLES.indexOf(this.docInfo.access_rights) === -1) {
                this.save()
            }
        }, 120000)

        // Set Auto-save to send the title every 5 seconds, if it has changed.
        this.sendDocumentTitleTimer = window.setInterval(() => {
            if (this.docInfo.title_changed &&
                READ_ONLY_ROLES.indexOf(this.docInfo.access_rights) === -1) {
                this.docInfo.title_changed = false
                this.mod.serverCommunications.send(()=>({
                    type: 'update_title',
                    title: this.getDoc().title
                }))
            }
        }, 10000)

        // Auto save the document when the user leaves the page.
        window.addEventListener("beforeunload", () => {
            if (this.docInfo && this.docInfo.changed &&
                READ_ONLY_ROLES.indexOf(this.docInfo.access_rights) === -1) {
                this.save()
            }
        })
    }


    activateFidusPlugins() {
        // Add plugins.
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin](this)
                this.plugins[plugin].init()
            }
        })
    }

    askForDocument() {
        if (this.waitingForDocument) {
            return
        }
        this.waitingForDocument = true
        this.mod.serverCommunications.send(()=>({
            type: 'get_document'
        }))
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
                this.mod.footnotes.fnEditor.schema.cached.imageDB = imageGetter
            })
        } else {
            return Promise.resolve()
        }
    }

    receiveDocument(data) {

        // Reset collaboration
        this.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
        this.mod.collab.docChanges.unconfirmedSteps = {}
        if (this.mod.collab.docChanges.awaitingDiffResponse) {
            this.mod.collab.docChanges.enableDiffSending()
        }
        // Update document to newest document version
        let doc = updateDoc(data.doc)

        this.docInfo = data.doc_info
        this.docInfo.doc_version = doc.settings['doc_version']
        this.docInfo.changed = false
        this.docInfo.title_changed = false

        if (doc.version === 0) {
            // If the document is new, change the url.
            window.history.replaceState("", "", `/document/${this.docInfo.id}/`)
        }

        if (data.hasOwnProperty('user')) {
            this.user = data.user
        } else {
            this.user = this.docInfo.owner
        }

        this.mod.serverCommunications.send(() => ({
            type: 'participant_update'
        }))
        return this.getImageDB(this.docInfo.owner.id).then(() => {

            let stateDoc
            if (doc.contents.type) {
                stateDoc = docSchema.nodeFromJSON({type:'doc', content:[doc.contents]})
            } else {
                stateDoc = this.schema.topNodeType.createAndFill()
            }
            let plugins = this.statePlugins.map(plugin => {
                if (plugin[1]) {
                    return plugin[0](plugin[1](doc))
                } else {
                    return plugin[0]()
                }
            })

            let stateConfig = {
                schema: this.schema,
                doc: stateDoc,
                plugins
            }

            // Set document in prosemirror
            this.view.updateState(EditorState.create(stateConfig))

            // Set initial confirmed doc
            this.confirmedDoc = this.view.state.doc

            if (this.docInfo.unapplied_diffs.length > 0) {
                // We have unapplied diffs -- this should only happen if the last disconnect
                // happened before we could save or because we are connecting to a document
                // in the process of being edited by another client. We try to apply the
                // diffs and then save immediately.
                //try {
                    // We only try because this fails if the PM diff format has changed.

                while (this.docInfo.unapplied_diffs.length > 0) {
                    let diff = this.docInfo.unapplied_diffs.shift()
                    this.mod.collab.docChanges.applyDiff(diff)
                }
                //this.save()
                /*} catch (error) {
                    // We couldn't apply the diffs. They are likely corrupted.
                    // We remove remaining diffs, increase the version by one and
                    // save to the server.
                    this.doc.version += this.docInfo.unapplied_diffs.length + 1
                    this.docInfo.unapplied_diffs = []
                    console.warn('Diffs could not be applied correctly!')
                }*/
            }


            // Render footnotes based on main doc
            this.mod.footnotes.fnEditor.renderAllFootnotes()

            //  Setup comment handling
            this.mod.comments.store.setVersion(doc.comment_version)
            Object.values(doc.comments).forEach(comment => {
                this.mod.comments.store.addLocalComment(comment.id, comment.user,
                    comment.userName, comment.userAvatar, comment.date, comment.comment,
                    comment.answers, comment['review:isMajor'])
            })
            this.mod.comments.store.on("mustSend", () => {
                this.mod.collab.docChanges.sendToCollaborators()
            })
            this.mod.comments.layout.onChange()

            return this.getBibDB(this.docInfo.owner.id).then(() => {
                this.waitingForDocument = false
                // Get document settings
                this.mod.settings.check(this.view.state.doc.firstChild.attrs)

                this.mod.citations.layoutCitations()

            })
        })
    }

    // Creates a hash value for the entire document so that we can compare with
    // other clients if we really have the same contents.
    getHash() {
        return objectHash.MD5(
            this.confirmedDoc.toJSON(),
            {unorderedArrays: true}
        )
    }


    // Collect all components of the current doc. Needed for saving and export
    // filters
    getDoc() {
        let pmArticle = this.confirmedDoc.firstChild
        return {
            contents: pmArticle.toJSON(),
            metadata: getMetadata(pmArticle),
            settings: Object.assign(
                {doc_version: this.docInfo.doc_version},
                getSettings(pmArticle)
            ),
            title: pmArticle.firstChild.textContent.substring(0, 255),
            version: getVersion(this.view.state),
            comments: this.mod.comments.store.comments
        }
    }

    // Send changes to the document to the server
    save() {
        this.mod.serverCommunications.send(() => {
            let doc = this.getDoc()
            delete doc.comments
            return {
                type: 'update_doc',
                doc,
                hash: this.getHash()
            }
        })

        this.docInfo.changed = false

        return Promise.resolve()
    }

    // filter transactions.
    onFilterTransaction(transaction) {
        let prohibited = false

        if (READ_ONLY_ROLES.indexOf(this.docInfo.access_rights) > -1) {
            // User only has read access. Don't allow anything.
            prohibited = true
        } else if (COMMENT_ONLY_ROLES.indexOf(this.docInfo.access_rights) > -1) {
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
        let topMenuHeight = jQuery('header').outerHeight() + 10
        let distanceFromTop = view.coordsAtPos(pos).top - topMenuHeight
        window.scrollBy(0, distanceFromTop)
    }

    // Things to execute before every editor transaction
    onBeforeTransaction(view, transaction) {
        // Check if there are any headings or figures in the affected range.
        // Otherwise, skip.
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
        let foundIdElement = false //found heading or figure
        ranges.forEach(range => {
          transaction.doc.nodesBetween(
            range[0],
            range[1],
            (node, pos, parent) => {
                if (node.type.name === 'heading' || node.type.name === 'figure') {
                    foundIdElement = true
                }
            }
        )})

        if (!foundIdElement) {
            return
        }

        // Check that unique IDs only exist once in the document
        // If an ID is used more than once, add steps to change the ID of all
        // but the first occurence.
        let headingIds = [], doubleHeadingIds = []
        let figureIds = [], doubleFigureIds = []

        // ID should not be found in the other pm either. So we look through
        // those as well.
        let otherView = view === this.view ? this.mod.footnotes.fnEditor.view : this.view

        otherView.state.doc.descendants(node => {
            if (node.type.name === 'heading') {
                headingIds.push(node.attrs.id)
            } else if (node.type.name === 'figure') {
                figureIds.push(node.attrs.id)
            }
        })

        transaction.doc.descendants((node, pos) => {
            if (node.type.name === 'heading') {
                if (headingIds.includes(node.attrs.id)) {
                    doubleHeadingIds.push({
                        node,
                        pos
                    })
                }
                headingIds.push(node.attrs.id)
            }

            if (node.type.name === 'figure') {
                if (figureIds.includes(node.attrs.id)) {
                    doubleFigureIds.push({
                        node,
                        pos
                    })
                }
                figureIds.push(node.attrs.id)
            }

        })

        // Change the IDs of the nodes that having an ID that was used previously
        // already.
        doubleHeadingIds.forEach(doubleId => {
            let node = doubleId.node,
                posFrom = doubleId.pos,
                posTo = posFrom + node.nodeSize,
                blockId

            while (!blockId || headingIds.includes(blockId)) {
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

            headingIds.push(blockId)
        })


        doubleFigureIds.forEach(doubleId => {
            let node = doubleId.node,
                posFrom = doubleId.pos,
                posTo = posFrom + node.nodeSize,
                blockId

            while (!blockId || figureIds.includes(blockId)) {
                blockId = randomFigureId()
            }

            let attrs = {
                    equation: node.attrs.equation,
                    image: node.attrs.image,
                    figureCategory: node.attrs.figureCategory,
                    caption: node.attrs.caption,
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

            figureIds.push(blockId)
        })

    }

    // Things to be executed on every editor transaction.
    onTransaction(transaction, remote) {
        let updateBibliography = false, updateTitle = false, updateSettings = false,
            commentIds = []
            // Check what area is affected

        this.mod.footnotes.layout.updateDOM()

        this.mod.collab.docChanges.sendToCollaborators()

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

        if (updateTitle && !remote) {
            this.docInfo.title_changed = true
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

        this.docInfo.changed = true
    }

}
