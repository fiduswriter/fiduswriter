import {
    compare
} from "fast-json-patch"
import {
    sendableSteps,
    receiveTransaction
} from "prosemirror-collab"
import {
    Step,
    Mapping
} from "prosemirror-transform"
import {
    EditorState
} from "prosemirror-state"
import {
    getSelectionUpdate,
    removeCollaboratorSelection,
    updateCollaboratorSelection
} from "../state_plugins"
import {
    adjustDocToTemplate
} from "../../document_template"
import {
    showSystemMessage,
    deactivateWait
} from "../../common"
import {
    toMiniJSON
} from "../../schema/mini_json"
import {
    recreateTransform
} from "./recreate_transform"
import {
    trackedTransaction
} from "../track"

export class ModCollabDoc {
    constructor(mod) {
        mod.doc = this
        this.mod = mod

        this.unconfirmedDiffs = {}
        this.confirmStepsRequestCounter = 0
        this.awaitingDiffResponse = false
        this.receiving = false
        this.currentlyCheckingVersion = false

        this.trackOfflineLimit = 50 // Limit of local changes while offline for tracking to kick in when multiple users edit
        this.remoteTrackOfflineLimit = 20 // Limit of remote changes while offline for tracking to kick in when multiple users edit
    }

    cancelCurrentlyCheckingVersion() {
        this.currentlyCheckingVersion = false
        window.clearTimeout(this.enableCheckVersion)
    }

    checkVersion() {
        this.mod.editor.ws.send(() => {
            if (this.currentlyCheckingVersion | !this.mod.editor.docInfo
                .version) {
                return
            }
            this.currentlyCheckingVersion = true
            this.enableCheckVersion = window.setTimeout(
                () => {
                    this.currentlyCheckingVersion = false
                },
                1000
            )
            if (this.mod.editor.ws.connected) {
                this.disableDiffSending()
            }
            return {
                type: 'check_version',
                v: this.mod.editor.docInfo.version
            }
        })
    }

    disableDiffSending() {
        this.awaitingDiffResponse = true
        // If no answer has been received from the server within 2 seconds,
        // check the version
        this.sendNextDiffTimer = window.setTimeout(
            () => {
                this.awaitingDiffResponse = false
                this.sendToCollaborators()
            },
            8000
        )
    }

    enableDiffSending() {
        window.clearTimeout(this.sendNextDiffTimer)
        this.awaitingDiffResponse = false
        this.sendToCollaborators()
    }

    receiveDocument(data) {
        this.cancelCurrentlyCheckingVersion()
        if (this.mod.editor.docInfo.confirmedDoc) {
            this.adjustDocument(data)
        } else {
            this.loadDocument(data)
        }
    }

    adjustDocument(data) {
        // Adjust the document when reconnecting after offline and many changes
        // happening on server.
        if (this.mod.editor.docInfo.version < data.doc.v) {
            this.receiving = true
            this.mod.editor.docInfo.confirmedJson = JSON.parse(JSON.stringify(data.doc.contents))
            const confirmedState = EditorState.create({doc: this.mod.editor.docInfo.confirmedDoc})
            const unconfirmedTr = confirmedState.tr
            sendableSteps(this.mod.editor.view.state).steps.forEach(step => unconfirmedTr.step(step))
            const rollbackTr = this.mod.editor.view.state.tr
            unconfirmedTr.steps.slice().reverse().forEach(
                (step, index) => rollbackTr.step(step.invert(unconfirmedTr.docs[unconfirmedTr.docs.length - index - 1]))
            )
            // We reset to there being no local changes to send.
            this.mod.editor.view.dispatch(receiveTransaction(
                this.mod.editor.view.state,
                unconfirmedTr.steps,
                unconfirmedTr.steps.map(_step => this.mod.editor.client_id)
            ))
            this.mod.editor.view.dispatch(receiveTransaction(
                this.mod.editor.view.state,
                rollbackTr.steps,
                rollbackTr.steps.map(_step => 'remote')
            ))
            const toDoc = this.mod.editor.schema.nodeFromJSON({type:'doc', content:[
                data.doc.contents
            ]})
            const lostTr = recreateTransform(this.mod.editor.view.state.doc, toDoc)
            let tracked
            let localTr // local steps to be reapplied
            if (
                ['write', 'write-tracked'].includes(this.mod.editor.docInfo.access_rights) &&
                (
                    unconfirmedTr.steps.length > this.trackOfflineLimit ||
                    lostTr.steps.length > this.remoteTrackOfflineLimit
                )
            ) {
                tracked = true
                // Either this user has made 50 changes since going offline,
                // or the document has 20 changes to it. Therefore we add tracking
                // to the changes of this user and ask user to clean up.
                localTr = trackedTransaction(
                    unconfirmedTr,
                    confirmedState,
                    this.mod.editor.user,
                    false,
                    Date.now() - this.mod.editor.clientTimeAdjustment
                )
            } else {
                tracked = false
                localTr = unconfirmedTr
            }
            const rebasedTr = EditorState.create({doc: toDoc}).tr.setMeta('remote', true)
            const maps = localTr.mapping.maps.slice().reverse().map(map => map.invert()).concat(lostTr.mapping)
            localTr.steps.forEach(
                (step, index) => {
                    const mapped = step.map(new Mapping(maps.slice(localTr.steps.length - index)))
                    if (mapped && !rebasedTr.maybeStep(mapped).failed) {
                        maps.push(mapped.getMap())
                    }
                }
            )
            const usedImages = [],
                usedBibs = []
            const footnoteFind = (node, usedImages, usedBibs) => {
                if (node.name === 'citation') {
                    node.attrs.references.forEach(ref => usedBibs.push(parseInt(ref.id)))
                } else if (node.name === 'figure' && node.attrs.image) {
                    usedImages.push(node.attrs.image)
                } else if (node.content) {
                    node.content.forEach(subNode => footnoteFind(subNode, usedImages, usedBibs))
                }
            }
            rebasedTr.doc.descendants(node => {
                if (node.type.name === 'citation') {
                    node.attrs.references.forEach(ref => usedBibs.push(parseInt(ref.id)))
                } else if (node.type.name === 'figure' && node.attrs.image) {
                    usedImages.push(node.attrs.image)
                } else if (node.type.name === 'footnote' && node.attrs.footnote) {
                    node.attrs.footnote.forEach(subNode => footnoteFind(subNode, usedImages, usedBibs))
                }
            })
            const oldBibDB = this.mod.editor.mod.db.bibDB.db
            this.mod.editor.mod.db.bibDB.setDB(data.doc.bibliography)
            usedBibs.forEach(id => {
                if (!this.mod.editor.mod.db.bibDB.db[id] && oldBibDB[id]) {
                    this.mod.editor.mod.db.bibDB.updateReference(id, oldBibDB[id])
                }
            })
            const oldImageDB = this.mod.editor.mod.db.imageDB.db
            this.mod.editor.mod.db.imageDB.setDB(data.doc.images)
            usedImages.forEach(id => {
                if (!this.mod.editor.mod.db.imageDB.db[id] && oldImageDB[id]) {
                    this.mod.editor.mod.db.imageDB.setImage(id, oldImageDB[id])
                }
            })
            this.mod.editor.view.dispatch(receiveTransaction(
                this.mod.editor.view.state,
                lostTr.steps,
                lostTr.steps.map(_step => 'remote')
            ))
            this.mod.editor.docInfo.version = data.doc.v
            this.mod.editor.view.dispatch(rebasedTr)
            if (tracked) {
                showSystemMessage(
                    gettext(
                        'The document was modified substantially by other users while you were offline. We have merged your changes in as tracked changes. You should verify that your edits still make sense.'
                    )
                )
            }
            this.mod.editor.mod.footnotes.fnEditor.renderAllFootnotes()
            this.receiving = false
            this.sendToCollaborators()
        } else {
            // The server seems to have lost some data. We reset.
            this.loadDocument(data)
        }
    }

    loadDocument(data) {
        // Reset collaboration
        this.unconfirmedDiffs = {}
        if (this.awaitingDiffResponse) {
            this.enableDiffSending()
        }
        // Remember location hash to scroll there subsequently.
        const locationHash = window.location.hash

        this.mod.editor.clientTimeAdjustment = Date.now() - data.time

        this.mod.editor.docInfo = data.doc_info
        this.mod.editor.docInfo.version = data.doc.v
        this.mod.editor.docInfo.template = data.doc.template
        this.mod.editor.docInfo.updated = new Date()
        this.mod.editor.mod.db.bibDB.setDB(data.doc.bibliography)
        this.mod.editor.mod.db.imageDB.setDB(data.doc.images)
        this.mod.editor.docInfo.confirmedJson = JSON.parse(JSON.stringify(data.doc.contents))
        let stateDoc
        if (data.doc.contents.type) {
            stateDoc = this.mod.editor.schema.nodeFromJSON({type:'doc', content:[
                adjustDocToTemplate(
                    data.doc.contents,
                    this.mod.editor.docInfo.template.definition,
                    this.mod.editor.mod.documentTemplate.documentStyles,
                    this.mod.editor.schema
                )
            ]})
        } else {
            const definition = JSON.parse(JSON.stringify(this.mod.editor.docInfo.template.definition))
            if (!definition.type) {
                definition.type = 'article'
            }
            if (!definition.content) {
                definition.content = [{type: 'title'}]
            }
            stateDoc = this.mod.editor.schema.nodeFromJSON({type:'doc', content:[
                definition
            ]})
        }
        const plugins = this.mod.editor.statePlugins.map(plugin => {
            if (plugin[1]) {
                return plugin[0](plugin[1](data.doc))
            } else {
                return plugin[0]()
            }
        })

        const stateConfig = {
            schema: this.mod.editor.schema,
            doc: stateDoc,
            plugins
        }

        // Set document in prosemirror
        this.mod.editor.view.setProps({state: EditorState.create(stateConfig)})
        this.mod.editor.view.setProps({nodeViews: {}}) // Needed to initialize nodeViews in plugins
        // Set initial confirmed doc
        this.mod.editor.docInfo.confirmedDoc = this.mod.editor.view.state.doc

        // Render footnotes based on main doc
        this.mod.editor.mod.footnotes.fnEditor.renderAllFootnotes()

        //  Setup comment handling
        this.mod.editor.mod.comments.store.reset()
        this.mod.editor.mod.comments.store.loadComments(data.doc.comments)
        this.mod.editor.mod.marginboxes.view(this.mod.editor.view)
        // Set part specific settings
        this.mod.editor.mod.documentTemplate.addDocPartSettings()
        this.mod.editor.mod.documentTemplate.addCitationStylesMenuEntries()
        this.mod.editor.waitingForDocument = false
        deactivateWait()
        if (locationHash.length) {
            this.mod.editor.scrollIdIntoView(locationHash.slice(1))
        }
    }

    sendToCollaborators() {
        // Handle either doc change and comment updates OR caret update. Priority
        // for doc change/comment update.
        this.mod.editor.ws.send(() => {
            if (
                this.awaitingDiffResponse ||
                this.mod.editor.waitingForDocument ||
                this.receiving
            ) {
                return false
            } else if (
                sendableSteps(this.mod.editor.view.state) ||
                this.mod.editor.mod.comments.store.unsentEvents().length ||
                this.mod.editor.mod.db.bibDB.unsentEvents().length ||
                this.mod.editor.mod.db.imageDB.unsentEvents().length
            ) {
                this.disableDiffSending()
                const stepsToSend = sendableSteps(this.mod.editor.view
                        .state),
                    fnStepsToSend = sendableSteps(this.mod.editor.mod
                        .footnotes.fnEditor.view.state),
                    commentUpdates = this.mod.editor.mod.comments.store
                        .unsentEvents(),
                    bibliographyUpdates = this.mod.editor.mod.db.bibDB
                        .unsentEvents(),
                    imageUpdates = this.mod.editor.mod.db.imageDB.unsentEvents()

                if (!stepsToSend &&
                    !fnStepsToSend &&
                    !commentUpdates.length &&
                    !bibliographyUpdates.length &&
                    !imageUpdates.length
                ) {
                    // no diff. abandon operation
                    return
                }
                const rid = this.confirmStepsRequestCounter++,
                    unconfirmedDiff = {
                        type: 'diff',
                        v: this.mod.editor.docInfo.version,
                        rid
                    }

                unconfirmedDiff['cid'] = this.mod.editor.client_id

                if (stepsToSend) {
                    unconfirmedDiff['ds'] = stepsToSend.steps.map(
                        s => s.toJSON()
                    )
                    // We add a json diff in a format understandable by the
                    // server.
                    unconfirmedDiff['jd'] = compare(
                        this.mod.editor.docInfo.confirmedJson,
                        toMiniJSON(
                            this.mod.editor.view.state.doc.firstChild
                        )
                    )
                    // In case the title changed, we also add a title field to
                    // update the title field instantly - important for the
                    // document overview page.
                    let newTitle = ""
                    this.mod.editor.view.state.doc.firstChild.firstChild.forEach(
                        child => {
                            if (!child.marks.find(mark => mark.type.name === 'deletion')) {
                                newTitle += child.textContent
                            }
                        }
                    )
                    newTitle = newTitle.slice(0, 255)
                    let oldTitle = ""
                    this.mod.editor.docInfo.confirmedDoc.firstChild.firstChild.forEach(
                        child => {
                            if (!child.marks.find(mark => mark.type.name === 'deletion')) {
                                oldTitle += child.textContent
                            }
                        }
                    )
                    oldTitle = oldTitle.slice(0, 255)
                    if (
                        newTitle !== oldTitle
                    ) {
                        unconfirmedDiff['ti'] = newTitle
                    }
                }

                if (fnStepsToSend) {
                    // We add the client ID to every single step
                    unconfirmedDiff['fs'] = fnStepsToSend.steps.map(
                        s => s.toJSON()
                    )
                }
                if (commentUpdates.length) {
                    unconfirmedDiff["cu"] = commentUpdates
                }
                if (bibliographyUpdates.length) {
                    unconfirmedDiff["bu"] = bibliographyUpdates
                }
                if (imageUpdates.length) {
                    unconfirmedDiff["iu"] = imageUpdates
                }

                this.unconfirmedDiffs[rid] = Object.assign(
                    {doc: this.mod.editor.view.state.doc},
                    unconfirmedDiff
                )
                return unconfirmedDiff

            } else if (getSelectionUpdate(this.mod.editor.currentView.state)) {
                const currentView = this.mod.editor.currentView

                if (this.lastSelectionUpdateState === currentView.state) {
                    // Selection update has been sent for this state already. Skip
                    return false
                }
                this.lastSelectionUpdateState = currentView.state
                // Create a new caret as the current user
                const selectionUpdate = getSelectionUpdate(currentView.state)
                return {
                    type: 'selection_change',
                    id: this.mod.editor.user.id,
                    v: this.mod.editor.docInfo.version,
                    session_id: this.mod.editor.docInfo.session_id,
                    anchor: selectionUpdate.anchor,
                    head: selectionUpdate.head,
                    // Whether the selection is in the footnote or the main editor
                    editor: currentView === this.mod.editor.view ?
                        'main' : 'footnotes'
                }
            } else {
                return false
            }
        })

    }

    receiveSelectionChange(data) {
        const participant = this.mod.participants.find(par => par.id === data
            .id)
        let tr, fnTr
        if (!participant) {
            // participant is still unknown to us. Ignore
            return
        }
        if (data.editor === 'footnotes') {
            fnTr = updateCollaboratorSelection(
                this.mod.editor.mod.footnotes.fnEditor.view.state,
                participant,
                data
            )
            tr = removeCollaboratorSelection(
                this.mod.editor.view.state,
                data
            )
        } else {
            tr = updateCollaboratorSelection(
                this.mod.editor.view.state,
                participant,
                data
            )
            fnTr = removeCollaboratorSelection(
                this.mod.editor.mod.footnotes.fnEditor.view.state,
                data
            )
        }
        if (tr) {
            this.mod.editor.view.dispatch(tr)
        }
        if (fnTr) {
            this.mod.editor.mod.footnotes.fnEditor.view.dispatch(fnTr)
        }
    }

    receiveFromCollaborators(data) {
        this.mod.editor.docInfo.version++
        if (data["bu"]) { // bibliography updates
            this.mod.editor.mod.db.bibDB.receive(data["bu"])
        }
        if (data["iu"]) { // images updates
            this.mod.editor.mod.db.imageDB.receive(data["iu"])
        }
        if (data["cu"]) { // comment updates
            this.mod.editor.mod.comments.store.receive(data["cu"])
        }
        if (data["ds"]) { // document steps
            this.applyDiffs(data["ds"], data["cid"])
        }
        if (data["fs"]) { // footnote steps
            this.mod.editor.mod.footnotes.fnEditor.applyDiffs(data["fs"], data["cid"])
        }

        if (data.server_fix) {
            // Diff is a fix created by server due to missing diffs.
            if ('reject_request_id' in data) {
                delete this.unconfirmedDiffs[data.reject_request_id]
            }
            this.cancelCurrentlyCheckingVersion()

            // There may be unsent local changes. Send them now after .5 seconds,
            // in case collaborators want to send something first.
            this.enableDiffSending()
            window.setTimeout(() => this.sendToCollaborators(), 500)

        }
    }

    setConfirmedDoc(tr, stepsLength) {
        // Find the latest version of the doc without any unconfirmed local changes

        const rebased = tr.getMeta("rebased"),
            docNumber = rebased + stepsLength

        this.mod.editor.docInfo.confirmedDoc = docNumber === tr.docs.length ?
            tr.doc :
            tr.docs[docNumber]
        this.mod.editor.docInfo.confirmedJson = toMiniJSON(this.mod.editor.docInfo.confirmedDoc.firstChild)
    }

    confirmDiff(request_id) {
        const unconfirmedDiffs = this.unconfirmedDiffs[request_id]
        if (!unconfirmedDiffs) {
            return
        }
        this.mod.editor.docInfo.version++

        const sentSteps = unconfirmedDiffs["ds"] // document steps
        if (sentSteps) {
            const ourIds = sentSteps.map(
                _step => this.mod.editor.client_id
            )
            const tr = receiveTransaction(
                this.mod.editor.view.state,
                sentSteps,
                ourIds
            )
            this.mod.editor.view.dispatch(tr)
            this.mod.editor.docInfo.confirmedDoc = unconfirmedDiffs["doc"]
            this.mod.editor.docInfo.confirmedJson = toMiniJSON(
                this.mod.editor.docInfo.confirmedDoc.firstChild
            )
        }

        const sentFnSteps = unconfirmedDiffs["fs"] // footnote steps
        if (sentFnSteps) {
            const fnTr = receiveTransaction(
                this.mod.editor.mod.footnotes.fnEditor.view.state,
                sentFnSteps,
                sentFnSteps.map(
                    _step => this.mod.editor.client_id
                )
            )
            this.mod.editor.mod.footnotes.fnEditor.view.dispatch(fnTr)
        }

        const sentComments = unconfirmedDiffs["cu"] // comment updates
        if (sentComments) {
            this.mod.editor.mod.comments.store.eventsSent(sentComments)
        }

        const sentBibliographyUpdates = unconfirmedDiffs["bu"] // bibliography updates
        if (sentBibliographyUpdates) {
            this.mod.editor.mod.db.bibDB.eventsSent(sentBibliographyUpdates)
        }

        const sentImageUpdates = unconfirmedDiffs["iu"] // image updates
        if (sentImageUpdates) {
            this.mod.editor.mod.db.imageDB.eventsSent(sentImageUpdates)
        }

        delete this.unconfirmedDiffs[request_id]
        this.enableDiffSending()
    }

    rejectDiff(request_id) {
        delete this.unconfirmedDiffs[request_id]
        this.enableDiffSending()
    }

    applyDiffs(diffs, cid) {
        this.receiving = true
        const steps = diffs.map(j => Step.fromJSON(this.mod.editor.schema, j))
        const clientIds = diffs.map(_ => cid)
        const tr = receiveTransaction(
            this.mod.editor.view.state,
            steps,
            clientIds
        )
        tr.setMeta('remote', true)
        this.mod.editor.view.dispatch(tr)
        this.setConfirmedDoc(tr, steps.length)
        this.receiving = false
        this.sendToCollaborators()
    }
}
