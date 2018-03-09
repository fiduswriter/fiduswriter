/* Functions for ProseMirror integration.*/
import {
    EditorState,
    Plugin,
    TextSelection
} from "prosemirror-state"
import {
    EditorView,
    Decoration,
    DecorationSet
} from "prosemirror-view"
import {
    history,
    redo,
    undo
} from "prosemirror-history"
import {
    baseKeymap
} from "prosemirror-commands"
import {
    keymap
} from "prosemirror-keymap"
import {
    collab
} from "prosemirror-collab"
import {
    tableEditing
} from "prosemirror-tables"
import {
    dropCursor
} from "prosemirror-dropcursor"
import {
    gapCursor
} from "prosemirror-gapcursor"
import {
    buildKeymap
} from "prosemirror-example-setup"

import * as plugins from "../../plugins/editor"
import {
    docSchema
} from "../schema/document"
import {
    ModComments
} from "./comments"
import {
    ModFootnotes
} from "./footnotes"
import {
    ModCitations
} from "./citations"
import {
    ModDB
} from "./databases"
import {
    ModCollab
} from "./collab"
import {
    ModTools
} from "./tools"
import {
    headerbarModel,
    toolbarModel
} from "./menus"
import {
    ModStyles
} from "./styles"
import {
    ModServerCommunications
} from "./server_communications"
import {
    getSettings
} from "../schema/convert"
import {
    BibliographyDB
} from "../bibliography/database"
import {
    ImageDB
} from "../images/database"

import {
    accessRightsPlugin,
    authorInputPlugin,
    collabCaretsPlugin,
    commentsPlugin,
    footnoteMarkersPlugin,
    headerbarPlugin,
    jumpHiddenNodesPlugin,
    keywordInputPlugin,
    linksPlugin,
    pastePlugin,
    placeholdersPlugin,
    settingsPlugin,
    toolbarPlugin,
    trackPlugin
} from "./state_plugins"
import {
    editorKeymap
} from "./keymap"

export const COMMENT_ONLY_ROLES = ['edit', 'review', 'comment']
export const READ_ONLY_ROLES = ['read', 'read-without-comments']
export const REVIEW_ROLES = ['review']

export class Editor {
    // A class that contains everything that happens on the editor page.
    // It is currently not possible to initialize more than one editor class, as it
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
        this.client_id = Math.floor(Math.random() * 0xFFFFFFFF)
        this.clientTimeAdjustment = 0
        this.statePlugins = [
            [keymap, () => editorKeymap],
            [keymap, () => buildKeymap(this.schema)],
            [keymap, () => baseKeymap],
            //[keymap, () => editorKeymap],
            [collab, () => ({clientID: this.client_id})],
            [linksPlugin, () => ({editor: this})],
            [history],
            [dropCursor],
            [gapCursor],
            [tableEditing],
            [jumpHiddenNodesPlugin],
            [placeholdersPlugin, () => ({editor: this})],
            [headerbarPlugin, () => ({editor: this})],
            [toolbarPlugin, () => ({editor: this})],
            [collabCaretsPlugin, () => ({editor: this})],
            [footnoteMarkersPlugin, () => ({editor: this})],
            [commentsPlugin, () => ({editor: this})],
            [keywordInputPlugin, () => ({editor: this})],
            [authorInputPlugin, () => ({editor: this})],
            [pastePlugin, () => ({editor: this})],
            [accessRightsPlugin, () => ({editor: this})],
            [settingsPlugin, () => ({editor: this})],
            [trackPlugin, () => ({editor: this})]
        ]
        new ModFootnotes(this)
        new ModServerCommunications(this)
        new ModDB(this)
    }

    init() {
        if (document.readyState === "complete") {
            this.initEditor()
        } else {
            document.addEventListener("DOMContentLoaded", event => this.initEditor())
        }
    }

    initEditor() {
        // The following two commands prevent Firefox from showing table controls.
        document.execCommand("enableObjectResizing", false, false)
        document.execCommand("enableInlineTableEditing", false, false)
        this.view = new EditorView(document.getElementById('document-editable'), {
            state: EditorState.create({
                schema: this.schema
            }),
            handleDOMEvents: {
                focus: (view, event) => {
                    this.currentView = this.view
                    // We focus once more, as focus may have disappeared due to
                    // disappearing placeholders.
                    view.focus()
                }
            },
            dispatchTransaction: (transaction) => {
                let newState = this.view.state.apply(transaction)
                this.view.updateState(newState)
                let remote = transaction.getMeta('remote')
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

    receiveDocument(data) {
        // Reset collaboration
        this.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
        this.mod.collab.docChanges.unconfirmedDiffs = {}
        if (this.mod.collab.docChanges.awaitingDiffResponse) {
            this.mod.collab.docChanges.enableDiffSending()
        }
        // Remember location hash to scroll there subsequently.
        let locationHash = window.location.hash

        this.clientTimeAdjustment = Date.now() - data.time 

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



        this.mod.db.bibDB.setDB(data.doc.bibliography)
        this.mod.db.imageDB.setDB(data.doc.images)
        // assign image DB to be used in document schema.
        this.schema.cached.imageDB = this.mod.db.imageDB
        // assign image DB to be used in footnote schema.
        this.mod.footnotes.fnEditor.schema.cached.imageDB = this.mod.db.imageDB
        this.user.bibDB = new BibliographyDB()
        this.user.bibDB.getDB()
        this.user.imageDB = new ImageDB()
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

        document.getElementById('flow').classList.remove('hide')
        // Set document in prosemirror
        this.view.updateState(EditorState.create(stateConfig))

        // Set initial confirmed doc
        this.docInfo.confirmedDoc = this.view.state.doc

        // Render footnotes based on main doc
        this.mod.footnotes.fnEditor.renderAllFootnotes()

        //  Setup comment handling
        this.mod.comments.store.reset()
        this.mod.comments.store.loadComments(doc.comments)
        this.mod.comments.layout.view()
        this.waitingForDocument = false
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
        let updateBibliography = false
            // Check what area is affected

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
                        }
                    )
                }
            }
        })

        if (updateBibliography) {
            // Recreate the bibliography
            this.mod.citations.resetCitations()
        } else {
            this.mod.citations.layoutCitations()
        }

    }

}
