import * as plugins from "../plugins/editor"

/* Functions for ProseMirror integration.*/
import {EditorState, Plugin, TextSelection} from "prosemirror-state"
import {EditorView, Decoration, DecorationSet} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {toggleMark, baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap/dist/keymap"
import {buildKeymap} from "prosemirror-example-setup"
import {collab} from "prosemirror-collab"
import {tableEditing} from "prosemirror-tables"
import {dropCursor} from "prosemirror-dropcursor"

import {docSchema} from "../schema/document"
import {ModComments} from "./comments"
import {ModFootnotes} from "./footnotes"
import {ModCitations} from "./citations"
import {ModDB} from "./databases"
import {ModCollab} from "./collab"
import {ModTools} from "./tools"
import {ModSettings} from "./settings"
import {headerbarModel, toolbarModel} from "./menus"
import {ModStyles} from "./styles"
import {ModServerCommunications} from "./server-communications"
import {getSettings} from "../schema/convert"
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
import {keywordInputPlugin} from "./plugins/keyword-input"

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
            owner: undefined,
            is_owner: false,
            confirmedDoc: false // The latest doc as confirmed by the server.
        }
        this.schema = docSchema
        this.user = false

        this.menu = {
            headerbarModel,
            toolbarModel
        }
        this.statePlugins = [
            [linksPlugin, () => ({editor: this})],
            [history],
            [keymap, () => baseKeymap],
            [keymap, () => buildKeymap(this.schema)],
            [collab],
            [dropCursor],
            [tableEditing],
            [placeholdersPlugin],
            [headerbarPlugin, () => ({editor: this})],
            [toolbarPlugin, () => ({editor: this})],
            [collabCaretsPlugin],
            [footnoteMarkersPlugin, () => ({editor: this})],
            [commentsPlugin, () => ({editor: this})],
            [keywordInputPlugin, () => ({editor: this})]
        ]
        new ModFootnotes(this)
        new ModServerCommunications(this)
        new ModDB(this)
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

    receiveDocument(data) {

        // Reset collaboration
        this.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
        this.mod.collab.docChanges.unconfirmedDiffs = {}
        if (this.mod.collab.docChanges.awaitingDiffResponse) {
            this.mod.collab.docChanges.enableDiffSending()
        }
        // Remember location hash to scroll there subsequently.
        let locationHash = window.location.hash
        let doc = data.doc

        this.docInfo = data.doc_info
        this.docInfo.version = doc["v"]

        if (this.docInfo.version === 0) {
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

        this.mod.db.bibDB.setDB(data.doc.bibliography)
        this.mod.db.imageDB.setDB(data.doc.images)
        // assign image DB to be used in document schema.
        this.schema.cached.imageDB = this.mod.db.imageDB
        // assign image DB to be used in footnote schema.
        this.mod.footnotes.fnEditor.schema.cached.imageDB = this.mod.db.imageDB
        this.user.bibDB = new BibliographyDB(this.user.id, true)
        this.user.bibDB.getDB()
        this.user.imageDB = new ImageDB(this.user.id, true)
        this.user.imageDB.getDB()

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
        this.docInfo.confirmedDoc = this.view.state.doc

        // Render footnotes based on main doc
        this.mod.footnotes.fnEditor.renderAllFootnotes()

        //  Setup comment handling
        this.mod.comments.store.reset()
        Object.values(doc.comments).forEach(comment => {
            this.mod.comments.store.addLocalComment(comment.id, comment.user,
                comment.userName, comment.userAvatar, comment.date, comment.comment,
                comment.answers, comment['review:isMajor'])
        })
        this.mod.comments.layout.onChange()
        this.waitingForDocument = false
        // Get document settings
        this.mod.settings.check(this.view.state.doc.firstChild.attrs)
        this.mod.citations.layoutCitations()
        if (locationHash.length) {
            this.scrollIdIntoView(locationHash.slice(1))
        }
    }

    // Collect all components of the current doc. Needed for saving and export
    // filters
    getDoc() {
        let pmArticle = this.docInfo.confirmedDoc.firstChild
        return {
            contents: pmArticle.toJSON(),
            settings: getSettings(pmArticle),
            title: pmArticle.firstChild.textContent.substring(0, 255),
            version: this.docInfo.version,
            comments: this.mod.comments.store.comments,
            id: this.docInfo.id
        }
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
    scrollIdIntoView(id) {

        let foundPos = false,
            view

        this.view.state.doc.descendants((node, pos) => {
            if (foundPos) {
                return
            } else if ((node.type.name === 'heading' || node.type.name === 'figure') && node.attrs.id === id) {
                foundPos = pos + 1
                view = this.view
            } else {
                let anchorMark = node.marks.find(mark => mark.type.name === 'anchor')
                if (anchorMark && anchorMark.attrs.id === id) {
                    foundPos = pos + 1
                    view = this.view
                }
            }
        })

        if (!foundPos) {
            this.mod.footnotes.fnEditor.view.state.doc.descendants((node, pos) => {
                if (foundPos) {
                    return
                } else if ((node.type.name === 'heading' || node.type.name === 'figure') && node.attrs.id === id) {
                    foundPos = pos + 1
                    view = this.mod.footnotes.fnEditor.view
                } else {
                    let anchorMark = node.marks.find(mark => mark.type.name === 'anchor')
                    if (anchorMark && anchorMark.attrs.id === id) {
                        foundPos = pos + 1
                        view = this.mod.footnotes.fnEditor.view
                    }
                }
            })
        }
        if (foundPos) {
            this.scrollPosIntoView(foundPos, view)
        }

    }

    scrollPosIntoView(pos, view) {
        let topMenuHeight = jQuery('header').outerHeight() + 10
        let $pos = view.state.doc.resolve(pos)
        view.dispatch(view.state.tr.setSelection(new TextSelection($pos, $pos)))
        view.focus()
        let distanceFromTop = view.coordsAtPos(pos).top - topMenuHeight
        window.scrollBy(0, distanceFromTop)
        return
    }

    // Things to be executed on every editor transaction.
    onTransaction(transaction, remote) {
        let updateBibliography = false, updateSettings = false,
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
            }
        })

        if (updateBibliography) {
            // Recreate the bibliography
            this.mod.citations.resetCitations()
        } else {
            this.mod.citations.layoutCitations()
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
