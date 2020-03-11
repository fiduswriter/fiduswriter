import {
    whenReady,
    ensureCSS,
    WebSocketConnector,
    postJson,
    activateWait
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
    collab,
    sendableSteps
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
    ModTrack,
    acceptAllNoInsertions,
    amendTransaction
} from "./track"
import {
    ModNavigator
} from './navigator'
import {
    headerbarModel,
    toolbarModel,
    tableMenuModel,
    imageMenuModel,
    navigatorFilterModel,
    selectionMenuModel
} from "./menus"
import {
    ModMarginboxes
} from "./marginboxes"
import {
    ModDocumentTemplate
} from "./document_template"
import {
    getSettings
} from "../schema/convert"

import {
    accessRightsPlugin,
    contributorInputPlugin,
    citationRenderPlugin,
    clipboardPlugin,
    collabCaretsPlugin,
    commentsPlugin,
    documentTemplatePlugin,
    footnoteMarkersPlugin,
    headerbarPlugin,
    jumpHiddenNodesPlugin,
    tagInputPlugin,
    linksPlugin,
    marginboxesPlugin,
    placeholdersPlugin,
    selectionMenuPlugin,
    settingsPlugin,
    tableMenuPlugin,
    figurePlugin,
    tocRenderPlugin,
    toolbarPlugin,
    trackPlugin,
    searchPlugin,
} from "./state_plugins"
import {
    buildEditorKeymap
} from "./keymap"

export const COMMENT_ONLY_ROLES = ['review', 'comment']
export const READ_ONLY_ROLES = ['read', 'read-without-comments']
export const REVIEW_ROLES = ['review']

export class Editor {
    // A class that contains everything that happens on the editor page.
    // It is currently not possible to initialize more than one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor({app, user}, idString) {
        this.app = app
        this.user = user
        this.mod = {}
        // Whether the editor is currently waiting for a document update. Set to true
        // initially so that diffs that arrive before document has been loaded are not
        // dealt with.
        this.waitingForDocument = true

        this.docInfo = {
            rights: '',
            owner: undefined,
            is_owner: false,
            confirmedDoc: false, // The latest doc as confirmed by the server.
            dir: 'ltr' // standard direction, used in input fields, etc.
        }
        let id = parseInt(idString)
        if (isNaN(id)) {
            id = 0
            let templateId = parseInt(idString.slice(1))
            if (isNaN(templateId)) {
                templateId = 1
            }
            this.docInfo.templateId = templateId
        }
        this.docInfo.id = id
        this.schema = docSchema

        this.menu = {
            headerbarModel: headerbarModel(),
            toolbarModel: toolbarModel(),
            tableMenuModel: tableMenuModel(),
            imageMenuModel: imageMenuModel(),
            navigatorFilterModel: navigatorFilterModel(),
            selectionMenuModel: selectionMenuModel()
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
            [selectionMenuPlugin, () => ({editor: this})],
            [collabCaretsPlugin, () => ({editor: this})],
            [footnoteMarkersPlugin, () => ({editor: this})],
            [commentsPlugin, () => ({editor: this})],
            [marginboxesPlugin, () => ({editor: this})],
            [tagInputPlugin, () => ({editor: this})],
            [contributorInputPlugin, () => ({editor: this})],
            [clipboardPlugin, () => ({editor: this, viewType: 'main'})],
            [accessRightsPlugin, () => ({editor: this})],
            [settingsPlugin, () => ({editor: this})],
            [documentTemplatePlugin, () => ({editor: this})],
            [trackPlugin, () => ({editor: this})],
            [tableMenuPlugin, () => ({editor: this})],
            [figurePlugin, () => ({editor: this})],
            [tocRenderPlugin, () => ({editor: this})],
            [searchPlugin],
        ]
    }

    init() {
        ensureCSS([
            'mathlive.css',
            'mathlive.core.css',
            'editor.css',
            'tags.css',
            'contributors.css',
            'document.css',
            'carets.css',
            'tracking.css',
            'margin_boxes.css',
            'prosemirror.css',
            'footnotes.css',
            'chat.css',
            'access_rights_dialog.css',
            'citation_dialog.css',
            'review.css',
            'add_remove_dialog.css',
            'bibliography.css',
            'dot_menu.css',
            'cropper.min.css',
            'inline_tools.css'
        ])
        new ModDocumentTemplate(this)
        const initPromises = [
            whenReady(),
            this.mod.documentTemplate.getCitationStyles()
        ]
        if (this.docInfo.hasOwnProperty('templateId')) {
            initPromises.push(
                postJson(`/api/document/create_doc/${this.docInfo.templateId}/`).then(
                    ({json}) => {
                        this.docInfo.id = json.id
                        window.history.replaceState("", "", `/document/${this.docInfo.id}/`)
                        delete this.docInfo.templateId
                        return Promise.resolve()
                    }
                )
            )
        }
        return Promise.all(initPromises).then(() => {
            new ModCitations(this)
            new ModFootnotes(this)
            this.ws = new WebSocketConnector({
                url: `/ws/document/${this.docInfo.id}/`,
                appLoaded: () => this.view.state.plugins.length,
                anythingToSend: () => sendableSteps(this.view.state),
                initialMessage: () => {
                    const message = {
                        'type': 'subscribe'
                    }

                    if (this.ws.connectionCount) {
                        message.connection = this.ws.connectionCount
                    }
                    return message
                },
                resubScribed: () => {
                    this.mod.footnotes.fnEditor.renderAllFootnotes()
                    this.mod.collab.doc.checkVersion()
                },
                restartMessage: () => ({type: 'get_document'}), // Too many messages have been lost and we need to restart
                messagesElement: () => this.dom.querySelector('#unobtrusive_messages'),
                warningNotAllSent: gettext('Warning! Not all your changes have been saved! You could suffer data loss. Attempting to reconnect...'),
                infoDisconnected: gettext('Disconnected. Attempting to reconnect...'),
                receiveData: data => {
                    if (document.body !== this.dom) {
                        return // user navigated away.
                    }
                    switch (data.type) {
                        case 'chat':
                            this.mod.collab.chat.newMessage(data)
                            break
                        case 'connections':
                            this.mod.collab.updateParticipantList(data.participant_list)
                            break
                        case 'styles':
                            this.mod.documentTemplate.setStyles(data.styles)
                            break
                        case 'doc_data':
                            this.mod.collab.doc.receiveDocument(data)
                            break
                        case 'confirm_version':
                            this.mod.collab.doc.cancelCurrentlyCheckingVersion()
                            if (data["v"] !== this.docInfo.version) {
                                this.mod.collab.doc.checkVersion()
                                return
                            }
                            this.mod.collab.doc.enableDiffSending()
                            break
                        case 'selection_change':
                            this.mod.collab.doc.cancelCurrentlyCheckingVersion()
                            if (data["v"] !== this.docInfo.version) {
                                this.mod.collab.doc.checkVersion()
                                return
                            }
                            this.mod.collab.doc.receiveSelectionChange(data)
                            break
                        case 'diff':
                            if (data["cid"] === this.client_id) {
                                // The diff origins from the local user.
                                this.mod.collab.doc.confirmDiff(data["rid"])
                                return
                            }
                            if (data["v"] !== this.docInfo.version) {
                                this.mod.collab.doc.checkVersion()
                                return
                            }
                            this.mod.collab.doc.receiveFromCollaborators(data)
                            break
                        case 'confirm_diff':
                            this.mod.collab.doc.confirmDiff(data["rid"])
                            break
                        case 'reject_diff':
                            this.mod.collab.doc.rejectDiff(data["rid"])
                            break
                    }
                }

            })
            this.render()
            activateWait(true)
            this.initEditor()
        })
    }

    close() {
        if (this.menu.toolbarViews) {
            this.menu.toolbarViews.forEach(view => view.destroy())
        }
        if (this.menu.selectionMenuViews) {
            this.menu.selectionMenuViews.forEach(view => view.destroy())
        }
        if (this.menu.headerView) {
            this.menu.headerView.destroy()
        }
        if (this.ws) {
            this.ws.close()
        }
    }

    render() {
        this.dom = document.createElement('body')
        document.body = this.dom
        this.dom.classList.add('editor')
        this.dom.classList.add('scrollable')
        this.dom.innerHTML = `<div id="editor">
            <div id="wait"><i class="fa fa-spinner fa-pulse"></i></div>
            <header>
                <nav id="headerbar"><div></div></nav>
                <nav id="toolbar"><div></div></nav>
            </header>
            <div id="navigator"></div>
            <div id="editor-content">
                <div id="flow">
                    <div id="paper-editable">
                        <div id="document-editable" class="user-contents"></div>
                        <div id="footnote-box-container" class="user-contents">
                            <div id="citation-footnote-box-container"></div>
                        </div>
                    </div>
                    <div id="bibliography" class="article-bibliography user-contents"></div>
                </div>
                <nav id="selection-menu"><div></div></nav>
                <div id="margin-box-column">
                    <div id="margin-box-filter"></div>
                    <div id="margin-box-container"><div></div></div>
                </div>
            </div>
            <div id="chat">
                <i class="resize-button fa fa-angle-double-down"></i>
                <div id="chat-container"></div>
                <div id="messageform" contentEditable="true" class="empty"></div>
                <audio id="chat-notification">
                    <source src="${settings.STATIC_URL}ogg/chat_notification.ogg?v=${transpile.VERSION}" type="audio/ogg">
                </audio>
            </div>
        </div>
        <div id="unobtrusive_messages"></div>`
        const feedbackTab = new FeedbackTab()
        feedbackTab.init()
    }

    onResize() {
        if (!this.view || !this.mod.marginboxes) {
            // Editor not yet set up
            return
        }
        this.mod.marginboxes.updateDOM()
        this.mod.footnotes.layout.updateDOM()
        this.menu.toolbarViews.forEach(view => view.onResize())
    }

    initEditor() {
        let setFocus = false
        this.view = new EditorView(this.dom.querySelector('#document-editable'), {
            state: EditorState.create({
                schema: this.schema
            }),
            handleDOMEvents: {
                focus: (view, _event) => {
                    if (!setFocus) {
                        this.currentView = this.view
                        // We focus once more, as focus may have disappeared due to
                        // disappearing placeholders.
                        setFocus = true
                        view.focus()
                        setFocus = false
                    }
                }
            },
            dispatchTransaction: tr => {
                const trackedTr = amendTransaction(tr, this.view.state, this)
                const {state: newState, transactions} = this.view.state.applyTransaction(trackedTr)
                this.view.updateState(newState)
                transactions.forEach(subTr => {
                    const footTr = subTr.getMeta('footTr')
                    if (footTr) {
                        this.mod.footnotes.fnEditor.view.dispatch(footTr)
                    }
                })

                this.mod.collab.doc.sendToCollaborators()
            }

        })
        // The editor that is currently being edited in -- main or footnote editor
        this.currentView = this.view
        this.mod.citations.init()
        this.mod.footnotes.init()
        new ModDB(this)
        new ModCollab(this)
        new ModTrack(this)
        new ModMarginboxes(this)
        this.mod.marginboxes.init()
        new ModComments(this)
        new ModNavigator(this)
        this.mod.navigator.init()
        this.activateFidusPlugins()
        this.ws.init()
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

    // Collect all components of the current doc. Needed for saving and export
    // filters
    getDoc(options={}) {
        const pmArticle = options.changes === 'acceptAllNoInsertions' ?
            acceptAllNoInsertions(this.docInfo.confirmedDoc).firstChild :
            this.docInfo.confirmedDoc.firstChild
            let title = ""
            pmArticle.firstChild.forEach(
                child => {
                    if (!child.marks.find(mark => mark.type.name==='deletion')) {
                        title += child.textContent
                    }
                }
            )
        return {
            contents: pmArticle.toJSON(),
            settings: getSettings(pmArticle),
            title: title.substring(0, 255),
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
            } else if ((node.type.groups.includes('heading') || node.type.name === 'figure') && node.attrs.id === id) {
                foundPos = pos + 1
                view = this.view
            } else {
                const anchorMark = node.marks.find(mark => mark.type.name === 'anchor')
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
                } else if ((node.type.groups.includes('heading') || node.type.name === 'figure') && node.attrs.id === id) {
                    foundPos = pos + 1
                    view = this.mod.footnotes.fnEditor.view
                } else {
                    const anchorMark = node.marks.find(mark => mark.type.name === 'anchor')
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
        const topMenuHeight = this.dom.querySelector('header').offsetHeight + 10
        const $pos = view.state.doc.resolve(pos)
        view.dispatch(view.state.tr.setSelection(new TextSelection($pos, $pos)))
        view.focus()
        const distanceFromTop = view.coordsAtPos(pos).top - topMenuHeight
        window.scrollBy(0, distanceFromTop)
        return
    }

}
