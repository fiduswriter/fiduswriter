
import {
    EditorState
} from "prosemirror-state"
import {
    EditorView
} from "prosemirror-view"
import {
    Mapping,
    AddMarkStep,
    RemoveMarkStep,
    ReplaceStep,
    ReplaceAroundStep
} from "prosemirror-transform"
import {
    collab,
    sendableSteps,
    receiveTransaction
} from "prosemirror-collab"
import {
    baseKeymap
} from "prosemirror-commands"
import {
    keymap
} from "prosemirror-keymap"
import {
    dropCursor
} from "prosemirror-dropcursor"
import {
    gapCursor
} from "prosemirror-gapcursor"
import {
    buildKeymap
} from "prosemirror-example-setup"
import {
    Slice
} from "prosemirror-model"
import {
    showSystemMessage,
    Dialog,
    activateWait,
    deactivateWait,
    addAlert,
    faqDialog
} from "../../../common"
import {
    BIBLIOGRAPHY_HEADERS
} from "../../../schema/i18n"
import {
    RenderCitations
} from "../../../citations/render"
import {
    WRITE_ROLES
} from "../../"
import {
    trackedTransaction,
} from "../../track"
import {
    jumpHiddenNodesPlugin,
    searchPlugin,
//    clipboardPlugin
} from "../../state_plugins"
import {
    buildEditorKeymap
} from "../../keymap"
import {
    recreateTransform
} from "./recreate_transform"
import {
    FootnoteView
} from "./footnotes"
import {
    diffPlugin,
    dispatchRemoveDiffMark,
    updateMarkData,
    checkPresenceOfDiffMark
} from "./state_plugin"
import {
    changeSet
} from "./changeset"

export class Merge {
    constructor(mod) {
        this.mod = mod
        this.trackOfflineLimit = 50// Limit of local changes while offline for tracking to kick in when multiple users edit
        this.remoteTrackOfflineLimit = 20 // Limit of remote changes while offline for tracking to kick in when multiple users edit
        this.mergeDialog = false
        this.mergeView1 = false
        this.mergeView2 = false
        this.mergeView3 = false
        this.mergedDocMap = false // the maps of the middle editor ,used for applying steps automatically
        this.offlineTr = false // The online transaction
        this.onlineTr = false // The offline Transaction
        this.imageDataModified = {} // To hold data related to re-uploaded images.
        this.schema = this.mod.editor.schema
        this.diffPlugin = [
            [diffPlugin, () => ({merge: this})],
            [keymap, () => buildEditorKeymap(this.schema)],
            [keymap, () => buildKeymap(this.schema)],
            [keymap, () => baseKeymap],
            [collab, () => ({clientID: this.mod.editor.client_id})],
            // [history],
            [dropCursor],
            [gapCursor],
            // [tableEditing],
            [jumpHiddenNodesPlugin],
            [searchPlugin],
            //[clipboardPlugin, () => ({editor: this.mod.editor, viewType: 'main'})]
        ]
    }

    adjustDocument(data) {
        // Adjust the document when reconnecting after offline and many changes
        // happening on server.
        if (this.mod.editor.docInfo.version < data.doc.v && sendableSteps(this.mod.editor.view.state)) {
            this.mod.doc.receiving = true
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
            ).setMeta('remote', true))
            const toDoc = this.schema.nodeFromJSON({type: 'doc', content: [
                data.doc.contents
            ]})

            // Apply the online Transaction
            const lostTr = recreateTransform(this.mod.editor.view.state.doc, toDoc)
            this.mod.editor.view.dispatch(receiveTransaction(
                this.mod.editor.view.state,
                lostTr.steps,
                lostTr.steps.map(_step => 'remote')
            ).setMeta('remote', true))

            // We split the complex steps that delete and insert into simple steps so that finding conflicts is more pronounced.
            const modifiedLostTr = this.modifyTr(lostTr)
            const lostChangeSet = new changeSet(modifiedLostTr)
            const conflicts = lostChangeSet.findConflicts(unconfirmedTr, modifiedLostTr)
            // Set the version
            this.mod.editor.docInfo.version = data.doc.v

            // If no conflicts arises auto-merge the document
            if (conflicts.length > 0) {
                this.diffMerge(confirmedState.doc, unconfirmedTr.doc, toDoc, unconfirmedTr, lostTr, data)
            } else {
                this.autoMerge(unconfirmedTr, lostTr, data)
            }

            this.mod.doc.receiving = false
            // this.mod.doc.sendToCollaborators()
        } else {
            // The server seems to have lost some data. We reset.
            this.mod.doc.loadDocument(data)
        }
    }



    updateDB(doc, data) {
        /* Used to update the image,bib DB and update the doc in case if missing/lost images
        (update the image data with re-uploaded images) */
        let usedImages = []
        const usedBibs = []
        const footnoteFind = (node, usedImages, usedBibs) => {
            if (node.name === 'citation') {
                node.attrs.references.forEach(ref => usedBibs.push(parseInt(ref.id)))
            } else if (node.name === 'figure' && node.attrs.image) {
                usedImages.push(node.attrs.image)
            } else if (node.content) {
                node.content.forEach(subNode => footnoteFind(subNode, usedImages, usedBibs))
            }
        }

        // Looking at rebased doc so that it contains the merged document !!!
        doc.descendants(node => {
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
        let imageUploadFailDialogShown = false
        this.mod.editor.mod.db.imageDB.setDB(data.doc.images)
        usedImages = new Set(usedImages)
        usedImages = Array.from(usedImages)
        usedImages.forEach(id => {
            if (!this.mod.editor.mod.db.imageDB.db[id] && oldImageDB[id]) {
                // If the image was uploaded by the offline user we know that he may not have deleted it so we can resend it normally
                if (Object.keys(this.mod.editor.app.imageDB.db).includes(
                    String(id))) {
                    this.mod.editor.mod.db.imageDB.setImage(id, oldImageDB[id])
                } else {
                    // If the image was uploaded by someone else , to set the image we have to reupload it again as there is backend check to associate who can add an image with the image owner.
                    this.mod.editor.mod.db.imageDB.reUploadImage(id, oldImageDB[id].image, oldImageDB[id].title, oldImageDB[id].copyright).then(
                        ({id, newId})=>{
                            this.imageDataModified[id] = newId
                            // Update the image node if there are any re uploaded images.
                            this.mergeView1.state.doc.descendants((node, pos) => {
                                if (node.type.name === 'figure' && node.attrs.image == id) {
                                    const attrs = Object.assign({}, node.attrs)
                                    attrs["image"] = newId
                                    const nodeType = this.mergeView1.state.schema.nodes['figure']
                                    const transaction = this.mergeView1.state.tr.setNodeMarkup(pos, nodeType, attrs)
                                    transaction.setMeta('mapAppended', true)
                                    this.mergeView1.dispatch(transaction)
                                }
                            })
                            this.mergeView2.state.doc.descendants((node, pos) => {
                                if (node.type.name === 'figure' && node.attrs.image == id) {
                                    const attrs = Object.assign({}, node.attrs)
                                    attrs["image"] = newId
                                    const nodeType = this.mergeView2.state.schema.nodes['figure']
                                    const transaction = this.mergeView2.state.tr.setNodeMarkup(pos, nodeType, attrs)
                                    transaction.setMeta('mapAppended', true)
                                    this.mergeView2.dispatch(transaction)
                                }
                            })
                        },
                        (id)=>{
                            // In case of failure make the id as false so the failed upload image is empty for the offline user too!
                            this.mergeView1.state.doc.descendants((node, pos) => {
                                if (node.type.name === 'figure' && node.attrs.image == id) {
                                    const attrs = Object.assign({}, node.attrs)
                                    attrs["image"] = false
                                    const nodeType = this.mergeView1.state.schema.nodes['figure']
                                    const transaction = this.mergeView1.state.tr.setNodeMarkup(pos, nodeType, attrs)
                                    transaction.setMeta('mapAppended', true)
                                    this.mergeView1.dispatch(transaction)
                                }
                            })
                            this.mergeView2.state.doc.descendants((node, pos) => {
                                if (node.type.name === 'figure' && node.attrs.image == id) {
                                    const attrs = Object.assign({}, node.attrs)
                                    attrs["image"] = false
                                    const nodeType = this.mergeView2.state.schema.nodes['figure']
                                    const transaction = this.mergeView2.state.tr.setNodeMarkup(pos, nodeType, attrs)
                                    transaction.setMeta('mapAppended', true)
                                    this.mergeView2.dispatch(transaction)
                                }
                            })
                            if (!imageUploadFailDialogShown) {
                                imageUploadFailDialogShown =  true
                                showSystemMessage(gettext("One or more of the image(s) you copied could not be found on the server. Consider re-uploading them once the document is merged."))
                            }
                        }
                    )
                }
            }
        })
    }

    applyChangesToEditor(tr, onlineDoc) {
        /* Applies the change from diff editor to main editor */
        const OnlineStepsLost = recreateTransform(onlineDoc, this.mod.editor.view.state.doc)
        const onlineStepsLostChangeset = new changeSet(OnlineStepsLost)
        tr = this.modifyTr(tr) // Split complex steps that insert and delete into simple insertions and deletion steps.
        const conflicts = onlineStepsLostChangeset.findConflicts(tr, OnlineStepsLost)
        if (conflicts.length > 0) {
            this.openDiffEditors(onlineDoc, tr.doc, OnlineStepsLost.doc, tr, OnlineStepsLost)
        } else {
            const newTr = this.mod.editor.view.state.tr
            const maps = new Mapping([].concat(tr.mapping.maps.slice().reverse().map(map=>map.invert())).concat(OnlineStepsLost.mapping.maps))
            tr.steps.forEach((step, index)=>{
                const mapped = step.map(maps.slice(tr.steps.length - index))
                if (mapped && !newTr.maybeStep(mapped).failed) {
                    maps.appendMap(mapped.getMap())
                    maps.setMirror(tr.steps.length - index - 1, (tr.steps.length + OnlineStepsLost.steps.length + newTr.steps.length - 1))
                }
            })
            newTr.setMeta('remote', true)
            this.mod.editor.view.dispatch(newTr)
            this.mod.editor.mod.footnotes.fnEditor.renderAllFootnotes()
        }
    }

    findNotTrackedSteps(tr, trackedSteps) {
        /* Find steps not tracked by PM , usually steps that cause change of attrs */
        const nonTrackedSteps = []
        tr.steps.forEach((step, index)=>{
            // mark steps other than replace steps as not tracked if not tracked by changeset
            // these steps should effectively only be the node attrs change steps.
            if (!trackedSteps.includes(index) && (step instanceof ReplaceAroundStep || step instanceof AddMarkStep || step instanceof RemoveMarkStep)) {
                nonTrackedSteps.push(step)
            }
        })
        return nonTrackedSteps
    }

    markBlockDiffs(tr, from, to, difftype, stepsInvolved) {
        /* This Function is used to add diff data to Block Elements. */
        tr.doc.nodesBetween(
            from,
            to,
            (node, pos) => {
                if (pos < from || ['bullet_list', 'ordered_list'].includes(node.type.name)) {
                    return true
                }
                else if (node.isInline) {
                    return false
                }
                if (node.attrs.diffdata) {
                    const diffdata = []
                    diffdata.push({type: difftype, from: from, to: to, steps: stepsInvolved})
                    tr.setNodeMarkup(pos, null, Object.assign({}, node.attrs, {diffdata}), node.marks)
                }
            }
        )
    }

    startMerge(offlineTr, onlineTr, onlineDoc) {
        /* start the merge process of moving changes to the editor */
        // Remove all diff related marks
        dispatchRemoveDiffMark(this.mergeView2, 0, this.mergeView2.state.doc.content.size)

        // Apply all the marks that are not handled by recreate steps!
        const markTr = this.mergeView2.state.tr
        const onlineMaps = onlineTr.mapping.maps.slice().reverse().map(map=>map.invert())
        const onlineRebaseMapping = new Mapping(onlineMaps)
        onlineRebaseMapping.appendMapping(this.mergedDocMap)
        this.onStepsNotTracked.forEach(markstep=>{
            const stepIndex = parseInt(onlineTr.steps.indexOf(markstep))
            const onlineRebaseMap = onlineRebaseMapping.slice(onlineTr.steps.length - stepIndex)
            const mappedMarkStep = markstep.map(onlineRebaseMap)
            if (mappedMarkStep && !markTr.maybeStep(mappedMarkStep).failed) {
                this.mergedDocMap.appendMap(mappedMarkStep.getMap())
                onlineRebaseMapping.appendMap(mappedMarkStep.getMap())
                onlineRebaseMapping.setMirror(onlineTr.steps.length - stepIndex - 1, (onlineTr.steps.length + this.mergedDocMap.maps.length - 1))
            }
        })
        const offlineRebaseMapping = new Mapping()
        offlineRebaseMapping.appendMappingInverted(offlineTr.mapping)
        offlineRebaseMapping.appendMapping(this.mergedDocMap)
        this.offStepsNotTracked.forEach(markstep=>{
            const stepIndex = offlineTr.steps.indexOf(markstep)
            const offlineRebaseMap = offlineRebaseMapping.slice(offlineTr.steps.length - stepIndex)
            const mappedMarkStep = markstep.map(offlineRebaseMap)
            if (mappedMarkStep && !markTr.maybeStep(mappedMarkStep).failed) {
                this.mergedDocMap.appendMap(mappedMarkStep.getMap())
                offlineRebaseMapping.appendMap(mappedMarkStep.getMap())
                offlineRebaseMapping.setMirror(offlineTr.steps.length - stepIndex - 1, (offlineTr.steps.length + this.mergedDocMap.maps.length - 1))
            }
        })
        this.mergeView2.dispatch(markTr)
        this.mergeDialog.close()
        const mergedDoc = this.mergeView2.state.doc
        //CleanUp
        this.mergeView1.destroy()
        this.mergeView2.destroy()
        this.mergeView3.destroy()
        this.mergeView1 = false
        this.mergeView2 = false
        this.mergeView3 = false
        this.mergedDocMap = false
        this.mergeDialog = false
        this.offlineMarkSteps = false
        this.onlineMarkSteps = false
        this.Dep = false
        this.offStepsNotTracked = false
        this.onStepsNotTracked = false
        this.imageDataModified = {}

        this.applyChangesToEditor(recreateTransform(onlineDoc, mergedDoc), onlineDoc)
    }

    checkResolution() {
        /* To Check if all the diffs are resolved */
        const offlineVersionDoc = this.mergeView1.state.doc,
            onlineVersionDoc = this.mergeView3.state.doc,
            mergedVersionDoc = this.mergeView2.state.doc
        let diffAttrPresent = false
        if (offlineVersionDoc.rangeHasMark(0, offlineVersionDoc.content.size, this.schema.marks.DiffMark) ||
            onlineVersionDoc.rangeHasMark(0, onlineVersionDoc.content.size, this.schema.marks.DiffMark) ||
            mergedVersionDoc.rangeHasMark(0, mergedVersionDoc.content.size, this.schema.marks.DiffMark)
        ) {
            return true
        }
        offlineVersionDoc.nodesBetween(0, offlineVersionDoc.content.size, (node, _pos)=>{
            if (node.attrs.diffdata && node.attrs.diffdata.length > 0) {
                diffAttrPresent = true
            }
        })
        onlineVersionDoc.nodesBetween(0, onlineVersionDoc.content.size, (node, _pos)=>{
            if (node.attrs.diffdata && node.attrs.diffdata.length > 0) {
                diffAttrPresent = true
            }
        })
        mergedVersionDoc.nodesBetween(0, mergedVersionDoc.content.size, (node, _pos)=>{
            if (node.attrs.diffdata && node.attrs.diffdata.length > 0) {
                diffAttrPresent = true
            }
        })
        if (diffAttrPresent) {
            return true
        }
        return false
    }

    createMergeDialog(offlineTr, onlineTr, onlineDoc) {
        const buttons = [{
            text: gettext("Merge Complete"),
            classes: 'fw-dark',
            click: () => {
                if (!this.checkResolution()) {
                    this.startMerge(offlineTr, onlineTr, onlineDoc)
                } else {
                    const warningDialog = new Dialog({
                        id: 'merge-res-warning',
                        title: gettext("Merge Resolution warning"),
                        body: gettext("Not all changes have been resolved. Please make sure to review all the changes to before proceeding."),
                        buttons: [{
                            text: gettext("Proceed to Merge"),
                            classes: 'fw-dark',
                            click: ()=>{
                                this.startMerge(offlineTr, onlineTr, onlineDoc)
                                warningDialog.close()
                            }
                        }]
                    })
                    warningDialog.open()
                }
            }
        }]
        const dialog = new Dialog({
            id: 'editor-merge-view',
            title: gettext("Merging Offline Document"),
            body: `<div style="display:flex"><div class="offline-heading">${gettext("Offline Document")}</div><div class="merged-heading">${gettext("Merged Document")}</div> <div class="online-heading">${gettext("Online Document")}</div></div><div class= "user-contents" style="display:flex;"><div id="editor-diff-1" style="float:left;padding:15px;"></div><div id="editor-diff" class="merged-view" style="padding:15px;"></div><div id="editor-diff-2" style="float:right;padding:15px;"></div></div>`,
            height: 600,
            width: window.innerwidth,
            canClose: false,
            help: () => {
                const helpDialog = new faqDialog({
                    title: gettext('Merge Dialog Frequent Questions'),
                    questions: [
                        [
                            gettext("Why am I seeing this merge window?"),
                            gettext("You are seeing this merge window, because you were offline for a long time, and the changes you made to the document while you were offline, conflicted with the changes made by the online user. So it was not possible to resolve them automatically. So that is why you are seeing this window.")
                        ],
                        [
                            gettext("Am I the only one seeing this window?"),
                            gettext("Yes, you are the only one who can see this window. Therefore it would be great if you could ask your collaborators to stop editing the document, so that once you are finished with the merge, it will not lead to more conflicts once you try to merge with the document edited by the collaborators.")
                        ],
                        [
                            gettext("What if my collaborators continue working on the document while I am merging?"),
                            gettext("Do not worry, we can handle such a situation as we will simply show you another merge dialog.")
                        ],
                        [
                            gettext("Why am I seeing three editors?"),
                            gettext("The editor on the left will show the offline version of the document (the document resulting from your changes ), the editor on the middle contains the last synced version of the document, and the editor on the right contains the online version of the document (document resulting from the online users edits).")
                        ],
                        [
                            gettext("What are the green and red highlights in the editors?"),
                            gettext("The editors on left and right will show content that are highlighted in green, and the editor in the middle will contain text that are highlighted usually in red. The text marked in green corresponds to the text that was edited (added) by online users or you. The text marked in red corresponds to text that was deleted by either you or the online user. Deletions will be marked only in the middle editor and the insertions will be marked in the other editors only.")
                        ],
                        [
                            gettext("How do I accept or reject a particular change?"),
                            interpolate(
                                gettext("Accepting or rejecting a change from editors, causes a change in the editor in the middle. You can accept a change by directly clicking on the highlighted text , which shows up a drop, where in you can either accept/reject a change. When you click on the highlighted text, it also highlights the changes that will get accepted. %(mergeImage)s As shown in the above image one can click on a highlighted change, and click on accept change. On accepting a change it will be reflected in the merged document editor in the middle. Rejecting a change works in the same way except on reject a change the highlight of the change will be lost, with it the ability to accept, reject or copy a change."),
                                {mergeImage: `<img src="${settings_STATIC_URL}img/accept-change.png" class = "merge-img">`},
                                true
                            )

                        ],
                        [
                            gettext("I cannot accept a particular change. What do I do?"),
                            gettext("If you cannot automatically accept a change into the middle editor, do not worry. You can choose to copy the change either by clicking on the copy button or manually copy the change and then you can paste it in the middle editor. It is as simple as that!")
                        ],
                        [
                            gettext("Can I edit content in all three editors?"),
                            gettext("You can edit the content in all the editors. But do keep in mind that whatever you type in the left most and right most editor will not be tracked (you cannot accept or reject it). And moreover the edits made in these two editors will not be preserved once the merge is completed.")
                        ],
                        [
                            gettext("Does the order in which I work on merging the changes matter?"),
                            gettext("It is always better that you try to accept the changes in a linear fashion.")
                        ],
                        [
                            gettext("What do I do after completing the merge?"),
                            gettext("After the merge is completed, you can click on the button 'Merge Complete' which in turn will move your changes to the main editor. Do note if other users made significant changes to the document while you were merging the document, you might have to merge the documents together again.")
                        ]
                    ]
                })
                helpDialog.open()
            },
            buttons
        })
        return dialog
    }

    bindEditorView(elementId, doc) {
        /* Binds the editor view */
        const editor = this.mod.editor
        const plugins = this.diffPlugin.map(plugin=>{
            if (plugin[1]) {
                return plugin[0](plugin[1](doc))
            } else {
                return plugin[0]()
            }
        })
        let editorView
        if (elementId == "editor-diff") {
            editorView = new EditorView(document.getElementById(elementId), {
                state: EditorState.create({
                    schema: this.schema,
                    doc: doc,
                    plugins: plugins,
                }),
                dispatchTransaction: tr => {
                    let mapTr = tr
                    if (tr.docChanged) {
                        const mapAppended = tr.getMeta('mapAppended')
                        const noTrack = tr.getMeta('notrack')
                        if (!mapAppended)
                            this.mergedDocMap.appendMapping(tr.mapping)
                        mapTr = updateMarkData(mapTr, this.imageDataModified)
                        if (!noTrack) { // Track only manual insertions
                            mapTr = trackedTransaction(
                                mapTr,
                                this.mergeView2.state,
                                this.mod.editor.user,
                                !this.mergeView2.state.doc.firstChild.attrs.tracked && this.mod.editor.docInfo.access_rights !== 'write-tracked',
                                Date.now() - this.mod.editor.clientTimeAdjustment
                            )
                        }
                    }
                    const newState = editorView.state.apply(mapTr)
                    editorView.updateState(newState)
                    this.renderCitation(editorView, elementId)
                },
                nodeViews: {
                    footnote(node, view, getPos) { return new FootnoteView(node, view, getPos, editor) }
                }
            })

        } else {
            editorView = new EditorView(document.getElementById(elementId), {
                state: EditorState.create({
                    schema: this.schema,
                    doc: doc,
                    plugins: plugins,
                }),
                dispatchTransaction: tr => {
                    const mapTr = updateMarkData(tr, this.imageDataModified)
                    const newState = editorView.state.apply(mapTr)
                    editorView.updateState(newState)
                    this.renderCitation(editorView, elementId)
                },
                nodeViews: {
                    footnote(node, view, getPos) { return new FootnoteView(node, view, getPos, editor) }
                }
            })
        }
        return editorView
    }

    markChangesinDiffEditor(changeset, insertionView, deletionView, insertionClass, deletionClass, tr) {
        /* This marks all the changes in the diff editor */
        // Mark the insertions in insertion View & deletions in deletionView
        const insertionMarksTr = insertionView.state.tr
        const deletionMarksTr = deletionView.state.tr
        let stepsTrackedByChangeset = []
        // Use the changeset to create the marks
        changeset.changes.forEach(change=>{
            if (change.inserted.length > 0) {
                let stepsInvolved = []
                change.inserted.forEach(insertion=>stepsInvolved.push(parseInt(insertion.data.step)))
                const stepsSet = new Set(stepsInvolved)
                stepsInvolved = Array.from(stepsSet)

                // Add the footnote related steps because the changeset tracks change but misses some steps related to insertion of footnote node!
                tr.steps.forEach((step, index)=>{
                    if (step.from >= change.fromB && step.to <= change.toB && step instanceof ReplaceStep && !stepsInvolved.includes(index)) {
                        const Step1 = step.toJSON()
                        if (Step1.slice && Step1.from !== Step1.to && Step1.slice.content.length == 1 && (Step1.slice.content[0].type === "footnote" || Step1.slice.content[0].type === "citation")) {
                            stepsInvolved.push(index)
                        }
                    } else if (step.from >= change.fromB && step.to <= change.toB && step instanceof AddMarkStep && !stepsInvolved.includes(index)) {
                        const Step1 = step.toJSON()
                        if (Step1.mark && ["strong", "em", "underline", "link", "deletion", "insertion", "comment"].includes(Step1.mark.type)) {
                            stepsInvolved.push(index)
                        }
                    }
                })

                stepsInvolved.sort((a, b)=>a - b)
                const insertionMark = this.schema.marks.DiffMark.create({diff: insertionClass, steps: JSON.stringify(stepsInvolved), from: change.fromB, to: change.toB})
                insertionMarksTr.addMark(change.fromB, change.toB, insertionMark)
                this.markBlockDiffs(insertionMarksTr, change.fromB, change.toB, insertionClass, stepsInvolved)
                if (checkPresenceOfDiffMark(insertionMarksTr.doc, change.fromB, change.toB))
                    stepsTrackedByChangeset = stepsTrackedByChangeset.concat(stepsInvolved)
            } if (change.deleted.length > 0) {
                let stepsInvolved = []
                change.deleted.forEach(deletion=>stepsInvolved.push(parseInt(deletion.data.step)))
                const stepsSet = new Set(stepsInvolved)
                stepsInvolved = Array.from(stepsSet)
                stepsInvolved.sort((a, b)=>a - b)
                const deletionMark = this.schema.marks.DiffMark.create({diff: deletionClass, steps: JSON.stringify(stepsInvolved), from: change.fromA, to: change.toA})
                deletionMarksTr.addMark(change.fromA, change.toA, deletionMark)
                this.markBlockDiffs(deletionMarksTr, change.fromA, change.toA, deletionClass, stepsInvolved)
                if (checkPresenceOfDiffMark(deletionMarksTr.doc, change.fromA, change.toA))
                    stepsTrackedByChangeset = stepsTrackedByChangeset.concat(stepsInvolved)
            }
        })


        // Add all the footnote/mark/citation related steps that are not tracked by changeset!!!!!
        tr.steps.forEach((step, index)=>{
            const from = tr.mapping.slice(index).map(step.from)
            const to = tr.mapping.slice(index).map(step.to, -1)
            if (step instanceof ReplaceStep && !stepsTrackedByChangeset.includes(index)) {
                const Step1 = step.toJSON()
                if (Step1.slice && Step1.slice.content.length == 1 && Step1.slice.content[0].type === "footnote") {
                    const insertionMark = this.schema.marks.DiffMark.create({diff: insertionClass, steps: JSON.stringify([index]), from: from,  to: to})
                    insertionMarksTr.addMark(from, to, insertionMark)
                    stepsTrackedByChangeset.push(index)
                } else if (Step1.slice && Step1.slice.content.length == 1 && Step1.slice.content[0].type === "citation") {
                    const insertionMark = this.schema.marks.DiffMark.create({diff: insertionClass, steps: JSON.stringify([index]), from: from, to: to})
                    insertionMarksTr.addMark(from, to, insertionMark)
                    stepsTrackedByChangeset.push(index)
                }
                else if (Step1.slice && Step1.slice.content.length == 1 && Step1.slice.content[0].type === "figure") {
                    if (Step1.from == Step1.to) {
                        this.markBlockDiffs(insertionMarksTr, Step1.from, Step1.to + 1, insertionClass, [index])
                    } else {
                        this.markBlockDiffs(insertionMarksTr, Step1.from, Step1.to, insertionClass, [index])
                    }
                    stepsTrackedByChangeset.push(index)
                }
            }
            else if ((step instanceof AddMarkStep || step instanceof RemoveMarkStep) && !stepsTrackedByChangeset.includes(index)) {
                const Step1 = step.toJSON()
                if (Step1.mark && ["strong", "em", "underline", "link", "deletion", "comment"].includes(Step1.mark.type)) {
                    if (step instanceof AddMarkStep) {
                        const insertionMark = this.schema.marks.DiffMark.create({diff: insertionClass, steps: JSON.stringify([index]), from: from, to: to})
                        stepsTrackedByChangeset.push(index)
                        insertionMarksTr.addMark(from, to, insertionMark)
                    } else if (step instanceof RemoveMarkStep) {
                        const deletionMark = this.schema.marks.DiffMark.create({diff: deletionClass, steps: JSON.stringify([index]), from: from, to: to})
                        deletionMarksTr.addMark(from, to, deletionMark)
                        stepsTrackedByChangeset.push(index)
                    }
                }
            }
        })

        // Dispatch the transactions
        insertionMarksTr.setMeta('initialDiffMap', true).setMeta('mapAppended', true).setMeta('notrack', true)
        deletionMarksTr.setMeta('initialDiffMap', true).setMeta('mapAppended', true).setMeta('notrack', true)
        insertionView.dispatch(insertionMarksTr)
        deletionView.dispatch(deletionMarksTr)

        //Return steps that are tracked in the diff editor
        return stepsTrackedByChangeset
    }

    renderCitation(view, elementId) {
        const settings = view.state.doc.firstChild.attrs,
            bibliographyHeader = settings.bibliography_header[settings.language] || BIBLIOGRAPHY_HEADERS[settings.language]
        const citRenderer = new RenderCitations(
            document.getElementById(elementId),
            settings.citationstyle,
            bibliographyHeader,
            this.mod.editor.mod.db.bibDB,
            this.mod.editor.app.csl
        )
        citRenderer.init()
    }

    modifyTr(tr) {
        /* This splits complex insertion & Deletion steps into simple insertion and deletion
        steps */
        if (tr.docChanged && tr.docs.length > 0) {
            const trState = EditorState.create({doc: tr.docs[0]})
            const newTr = trState.tr
            for (let index = 0; index < tr.steps.length ; index++) {
                const step = tr.steps[index]
                if (step instanceof ReplaceStep && step.from !== step.to) {
                    const modifiedStep = step.slice.size ? new ReplaceStep(
                        step.to, // We insert all the same steps, but with "from"/"to" both set to "to" in order not to delete content. Mapped as needed.
                        step.to,
                        step.slice,
                        step.structure
                    ) : false
                    if (modifiedStep) {
                        // If while breaking down any step the step fails , we return the original tr (we just split steps containing both insertions and deletions into simple steps which does just insertion/deletion. should not make a big difference.)
                        if (newTr.maybeStep(modifiedStep).failed) {
                            return tr
                        }
                        if (newTr.maybeStep(new ReplaceStep(step.from, step.to, Slice.empty, step.structure)).failed) {
                            return tr
                        }
                    } else {
                        if (newTr.maybeStep(step).failed) {
                            return tr
                        }
                    }

                } else {
                    if (newTr.maybeStep(step).failed) {
                        return tr
                    }
                }
            }
            return newTr
        } else {
            return tr
        }
    }

    unHideSections(view) {
        let offset = 1, attrs
        const unHideSectionTr = view.state.tr
        view.state.doc.firstChild.forEach((child, docNodeOffset, _index) => {
            if (child.attrs.optional) {
                offset += docNodeOffset
                attrs = Object.assign({}, child.attrs)
                attrs.hidden = false
                unHideSectionTr.setNodeMarkup(offset, false, attrs)
                offset = 1
            }
        })
        unHideSectionTr.setMeta("notrack", true).setMeta('mapAppended', true)
        view.dispatch(unHideSectionTr)
    }

    unHideSectionsinAllDoc() {
        /* Unhide all the optional sections */
        this.unHideSections(this.mergeView1)
        this.unHideSections(this.mergeView2)
        this.unHideSections(this.mergeView3)
    }

    openDiffEditors(cpDoc, offlineDoc, onlineDoc, offlineTr, onlineTr) {
        /* Create the diff editors */
        // Put a wait screen
        activateWait()

        this.mergeDialog  = this.createMergeDialog(offlineTr, onlineTr, onlineDoc)
        this.mergeDialog.open()
        onlineTr = this.modifyTr(onlineTr)
        offlineTr = this.modifyTr(offlineTr)
        this.offlineTr = offlineTr
        this.onlineTr = onlineTr
        this.mergedDocMap = new Mapping()

        // Create multiple editor views
        this.mergeView1 = this.bindEditorView('editor-diff-1', offlineDoc)
        this.mergeView2 = this.bindEditorView('editor-diff', cpDoc)
        this.mergeView3 = this.bindEditorView('editor-diff-2', onlineDoc)

        const offlineChangeset = new changeSet(offlineTr).getChangeSet()
        const onlineChangeset = new changeSet(onlineTr).getChangeSet()

        // Unhide All Sections in All the 3 views
        this.unHideSectionsinAllDoc()

        const offlineTrackedSteps = this.markChangesinDiffEditor(offlineChangeset, this.mergeView1, this.mergeView2, "offline-inserted", "offline-deleted", offlineTr)
        const onlineTrackedSteps = this.markChangesinDiffEditor(onlineChangeset, this.mergeView3, this.mergeView2, "online-inserted", "online-deleted", onlineTr)

        if (this.mergeView1.state.doc.firstChild.attrs.tracked || this.mergeView3.state.doc.firstChild.attrs.tracked) {
            const article = this.mergeView2.state.doc.firstChild
            const attrs = Object.assign({}, article.attrs)
            attrs.tracked = true
            this.mergeView2.dispatch(
                this.mergeView2.state.tr.setNodeMarkup(0, false, attrs).setMeta('notrack', true).setMeta('mapAppended', true)
            )
        }

        this.renderCitation(this.mergeView1, 'editor-diff-1')
        this.renderCitation(this.mergeView2, 'editor-diff')
        this.renderCitation(this.mergeView3, 'editor-diff-2')

        this.offStepsNotTracked = this.findNotTrackedSteps(offlineTr, offlineTrackedSteps)
        this.onStepsNotTracked = this.findNotTrackedSteps(onlineTr, onlineTrackedSteps)

        deactivateWait()
    }

    diffMerge(cpDoc, offlineDoc, onlineDoc, offlineTr, onlineTr, data) {
        // Update the Bib and image DB before hand with the data from the offline document and the socket data.
        this.openDiffEditors(cpDoc, offlineDoc, onlineDoc, offlineTr, onlineTr)
        this.updateDB(offlineDoc, data) // Updating the editor DB is one-time operation.
    }

    autoMerge(unconfirmedTr, lostTr, data) {
        /* This automerges documents incase of no conflicts */
        const toDoc = this.schema.nodeFromJSON({type: 'doc', content: [
            data.doc.contents
        ]})
        const rebasedTr = EditorState.create({doc: toDoc}).tr.setMeta('remote', true)
        const maps = new Mapping([].concat(unconfirmedTr.mapping.maps.slice().reverse().map(map=>map.invert())).concat(lostTr.mapping.maps.slice()))

        unconfirmedTr.steps.forEach(
            (step, index) => {
                const mapped = step.map(maps.slice(unconfirmedTr.steps.length - index))
                if (mapped && !rebasedTr.maybeStep(mapped).failed) {
                    maps.appendMap(mapped.getMap())
                    maps.setMirror(unconfirmedTr.steps.length - index - 1, (unconfirmedTr.steps.length + lostTr.steps.length + rebasedTr.steps.length - 1))
                }
            }
        )

        let tracked
        let rebasedTrackedTr // offline steps to be tracked
        if (
            WRITE_ROLES.includes(this.mod.editor.docInfo.access_rights) &&
            (
                unconfirmedTr.steps.length > this.trackOfflineLimit ||
                lostTr.steps.length > this.remoteTrackOfflineLimit
            )
        ) {
            tracked = true
            // Either this user has made 50 changes since going offline,
            // or the document has 20 changes to it. Therefore we add tracking
            // to the changes of this user and ask user to clean up.
            rebasedTrackedTr = trackedTransaction(
                rebasedTr,
                this.mod.editor.view.state,
                this.mod.editor.user,
                false,
                Date.now() - this.mod.editor.clientTimeAdjustment
            )
        } else {
            tracked = false
            rebasedTrackedTr = rebasedTr
        }

        let usedImages = []
        const usedBibs = []
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
        // Remove the Duplicated image ID's
        usedImages = new Set(usedImages)
        usedImages = Array.from(usedImages)
        usedImages.forEach(id => {
            if (!this.mod.editor.mod.db.imageDB.db[id] && oldImageDB[id]) {
                // If the image was uploaded by the offline user we know that he may not have deleted it so we can resend it normally
                if (Object.keys(this.mod.editor.app.imageDB.db).includes(id)) {
                    this.mod.editor.mod.db.imageDB.setImage(id, oldImageDB[id])
                } else {
                    // If the image was uploaded by someone else , to set the image we have to reupload it again as there is backend check to associate who can add an image with the image owner.
                    this.mod.editor.mod.db.imageDB.reUploadImage(id, oldImageDB[id].image, oldImageDB[id].title, oldImageDB[id].copyright).then(
                        ()=>{},
                        (id)=>{
                            const transaction = this.mod.editor.view.state.tr
                            this.mod.editor.view.state.doc.descendants((node, pos) => {
                                if (node.type.name === 'figure' && node.attrs.image == id) {
                                    const attrs = Object.assign({}, node.attrs)
                                    attrs["image"] = false
                                    const nodeType = this.mod.editor.currentView.state.schema.nodes['figure']
                                    transaction.setNodeMarkup(pos, nodeType, attrs)
                                }
                            })
                            this.mod.editor.view.dispatch(transaction)
                            addAlert('error', gettext("One of the Image(s) you copied could not be found on the server. Please try uploading it again."))
                        }
                    )
                }
            }
        })

        // this.mod.editor.docInfo.version = data.doc.v
        rebasedTrackedTr.setMeta('remote', true)
        this.mod.editor.view.dispatch(rebasedTrackedTr)

        if (tracked) {
            showSystemMessage(
                gettext(
                    'The document was modified substantially by other users while you were offline. We have merged your changes in as tracked changes. You should verify that your edits still make sense.'
                )
            )
        }
        this.mod.editor.mod.footnotes.fnEditor.renderAllFootnotes()

    }

}
