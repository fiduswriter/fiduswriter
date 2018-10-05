/* Functions for ProseMirror integration.*/
import {
    whenReady,
    ensureCSS
} from "../common"
import {
    FeedbackTab
} from "../feedback"
import {
    EditorState,
    TextSelection
} from "prosemirror-state"
import {
    EditorView
} from "prosemirror-view"
import {
    history
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
    ModTrack,
    acceptAllNoInsertions
} from "./track"
import {
    headerbarModel,
    toolbarModel
} from "./menus"
import {
    ModMarginboxes
} from "./marginboxes"
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
    citationRenderPlugin,
    clipboardPlugin,
    collabCaretsPlugin,
    commentsPlugin,
    footnoteMarkersPlugin,
    headerbarPlugin,
    jumpHiddenNodesPlugin,
    keywordInputPlugin,
    linksPlugin,
    marginboxesPlugin,
    placeholdersPlugin,
    settingsPlugin,
    toolbarPlugin,
    trackPlugin
} from "./state_plugins"
import {
    buildEditorKeymap
} from "./keymap"

export const COMMENT_ONLY_ROLES = ['edit', 'review', 'comment']
export const READ_ONLY_ROLES = ['read', 'read-without-comments']
export const REVIEW_ROLES = ['review']

export class Editor {
    // A class that contains everything that happens on the editor page.
    // It is currently not possible to initialize more than one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor(id, {staticUrl, websocketUrl}) {
        this.staticUrl = staticUrl
        this.websocketUrl = websocketUrl
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
            confirmedDoc: false, // The latest doc as confirmed by the server.
            dir: 'ltr' // standard direction, used in input fields, etc.
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
            [keymap, () => buildEditorKeymap(this.schema)],
            [keymap, () => buildKeymap(this.schema)],
            [keymap, () => baseKeymap],
            [collab, () => ({clientID: this.client_id})],
            [linksPlugin, () => ({editor: this})],
            [history],
            [dropCursor],
            [gapCursor],
            [tableEditing],
            [jumpHiddenNodesPlugin],
            [placeholdersPlugin, () => ({editor: this})],
            [citationRenderPlugin, () => ({editor: this})],
            [headerbarPlugin, () => ({editor: this})],
            [toolbarPlugin, () => ({editor: this})],
            [collabCaretsPlugin, () => ({editor: this})],
            [footnoteMarkersPlugin, () => ({editor: this})],
            [commentsPlugin, () => ({editor: this})],
            [marginboxesPlugin, () => ({editor: this})],
            [keywordInputPlugin, () => ({editor: this})],
            [authorInputPlugin, () => ({editor: this})],
            [clipboardPlugin, () => ({editor: this, viewType: 'main'})],
            [accessRightsPlugin, () => ({editor: this})],
            [settingsPlugin, () => ({editor: this})],
            [trackPlugin, () => ({editor: this})]
        ]
        new ModCitations(this)
        new ModFootnotes(this)
        new ModServerCommunications(this)
        new ModDB(this)
    }

    init() {
        whenReady().then(() => {
            this.render()
            this.initEditor()
        })
    }

    render() {
        document.body = document.createElement('body')
        document.body.innerHTML = `<div id="editor">
            <div id="wait" class="active"><i class="fa fa-spinner fa-pulse"></i></div>
            <header>
                <nav id="headerbar">
                    <div></div>
                </nav>
                <nav id="toolbar">
                    <div></div>
                </nav>
            </header>
            <div id="editor-content">
                <div id="flow" class="comments-enabled hide">
                    <div id="paper-editable">
                        <div id="document-editable" class="user-contents"></div>
                        <div id="footnote-box-container" class="user-contents">
                            <div id="citation-footnote-box-container"></div>
                        </div>
                    </div>
                    <div class="article-bibliography user-contents"></div>
                </div>
                <div id="margin-box-container"></div>
            </div>
            <div id="chat">
                <i class="resize-button fa fa-angle-double-down"></i>
                <div id="chat-container"></div>
                <div id="messageform" contentEditable="true" class="empty"></div>
                <audio id="chat-notification">
                    <source src="${this.staticUrl}ogg/chat_notification.ogg?v=${$StaticUrls.transpile.version$}" type="audio/ogg">
                </audio>
            </div>
        </div>
        <div id="unobtrusive_messages"></div>`
        ensureCSS([
            'libs/katex/katex.min.css',
            'mathquill.css',
            'editor.css',
            'document.css',
            'carets.css',
            'tracking.css',
            'comments.css',
            'prosemirror.css',
            'footnotes.css',
            'chat.css',
            'access_rights_dialog.css',
            'citation_dialog.css',
            'review.css',
            'add_remove_dialog.css',
            'bibliography.css'
        ], this.staticUrl)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
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
            dispatchTransaction: (tr) => {
                let newState = this.view.state.apply(tr)
                this.view.updateState(newState)
                this.mod.collab.docChanges.sendToCollaborators()
            }

        })
        // The editor that is currently being edited in -- main or footnote editor
        this.currentView = this.view
        this.mod.footnotes.init()
        new ModCollab(this)
        new ModTools(this)
        new ModTrack(this)
        new ModMarginboxes(this)
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
        // assign bibDB to be used in document schema.
        this.schema.cached.bibDB = this.mod.db.bibDB
        // assign bibDB to be used in footnote schema.
        this.mod.footnotes.fnEditor.schema.cached.bibDB = this.mod.db.bibDB
        this.mod.db.imageDB.setDB(data.doc.images)
        // assign image DB to be used in document schema.
        this.schema.cached.imageDB = this.mod.db.imageDB
        // assign image DB to be used in footnote schema.
        this.mod.footnotes.fnEditor.schema.cached.imageDB = this.mod.db.imageDB
        this.user.bibDB = new BibliographyDB()
        this.user.bibDB.getDB()
        this.user.imageDB = new ImageDB()
        this.user.imageDB.getDB()
        this.docInfo.confirmedJson = JSON.parse(JSON.stringify(doc.contents))

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
        this.mod.marginboxes.view(this.view)
        this.waitingForDocument = false
        if (locationHash.length) {
            this.scrollIdIntoView(locationHash.slice(1))
        }
    }

    // Collect all components of the current doc. Needed for saving and export
    // filters
    getDoc(options={}) {
        let pmArticle = options.changes === 'acceptAllNoInsertions' ?
            acceptAllNoInsertions(this.docInfo.confirmedDoc).firstChild :
            this.docInfo.confirmedDoc.firstChild
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
        let topMenuHeight = document.querySelector('header').offsetHeight + 10
        let $pos = view.state.doc.resolve(pos)
        view.dispatch(view.state.tr.setSelection(new TextSelection($pos, $pos)))
        view.focus()
        let distanceFromTop = view.coordsAtPos(pos).top - topMenuHeight
        window.scrollBy(0, distanceFromTop)
        return
    }

}
