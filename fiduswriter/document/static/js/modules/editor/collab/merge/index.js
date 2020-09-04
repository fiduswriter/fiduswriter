
import {
    EditorState
} from "prosemirror-state"
import {
    Mapping
} from "prosemirror-transform"
import {
    sendableSteps,
    receiveTransaction
} from "prosemirror-collab"
import {
    showSystemMessage,
    addAlert
} from "../../../common"
import {
    WRITE_ROLES
} from "../../"
import {
    trackedTransaction
} from "../../track"
import {
    recreateTransform
} from "./recreate_transform"
import {
    changeSet
} from "./changeset"
import {
    MergeEditor
} from "./editor"
import {
    simplifyTransform
} from "./tools"


export class Merge {
    constructor(mod) {
        this.mod = mod
        this.trackOfflineLimit = 50// Limit of local changes while offline for tracking to kick in when multiple users edit
        this.remoteTrackOfflineLimit = 20 // Limit of remote changes while offline for tracking to kick in when multiple users edit
    }

    rollbackDoc() {
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
        return unconfirmedTr
    }

    mergeDoc(doc) {
        // Adjust the document when reconnecting after offline and many changes
        // happening on server.
        this.mod.doc.receiving = true
        this.mod.editor.docInfo.confirmedJson = JSON.parse(JSON.stringify(doc.content))
        const unconfirmedTr = this.rollbackDoc()
        const toDoc = this.mod.editor.schema.nodeFromJSON({type: 'doc', content: [
            doc.content
        ]})

        // Apply the online Transaction
        const remoteTr = recreateTransform(this.mod.editor.view.state.doc, toDoc)
        this.mod.editor.view.dispatch(receiveTransaction(
            this.mod.editor.view.state,
            remoteTr.steps,
            remoteTr.steps.map(_step => 'remote')
        ).setMeta('remote', true))
        // Set the version
        this.mod.editor.docInfo.version = doc.v

        this.mergeTr(
            unconfirmedTr,
            simplifyTransform(remoteTr), // We split the complex steps that delete and insert into simple steps so that finding conflicts is more pronounced.
            {
                images: doc.images,
                bibliography: doc.bibliography
            }
        )
        this.mod.doc.receiving = false
    }

    mergeDiff(steps, clientIds) {
        const unconfirmedTr = this.rollbackDoc()
        const remoteTr = receiveTransaction(
            this.mod.editor.view.state,
            steps,
            clientIds
        )
        this.mod.editor.view.dispatch(remoteTr.setMeta('remote', true))
        this.mergeTr(
            unconfirmedTr,
            remoteTr,
            false
        )

    }

    mergeTr(unconfirmedTr, remoteTr, db) {

        const remoteChangeSet = new changeSet(remoteTr)
        const conflicts = remoteChangeSet.findConflicts(unconfirmedTr, remoteTr)

        // If no conflicts arises auto-merge the document
        if (conflicts.length > 0) {
            const editor = new MergeEditor(
                this.mod.editor,
                this.mod.editor.docInfo.confirmedDoc,
                unconfirmedTr.doc,
                remoteTr.doc,
                unconfirmedTr,
                remoteTr,
                db
            )
            editor.init()
        } else {
            this.autoMerge(unconfirmedTr, remoteTr, db)
        }
        // this.mod.doc.sendToCollaborators()
    }

    autoMerge(unconfirmedTr, remoteTr, db) {
        /* This automerges documents in case of no conflicts */
        const rebasedTr = EditorState.create({doc: remoteTr.doc}).tr.setMeta('remote', true)
        const maps = new Mapping([].concat(unconfirmedTr.mapping.maps.slice().reverse().map(map => map.invert())).concat(remoteTr.mapping.maps.slice()))

        unconfirmedTr.steps.forEach(
            (step, index) => {
                const mapped = step.map(maps.slice(unconfirmedTr.steps.length - index))
                if (mapped && !rebasedTr.maybeStep(mapped).failed) {
                    maps.appendMap(mapped.getMap())
                    maps.setMirror(unconfirmedTr.steps.length - index - 1, (unconfirmedTr.steps.length + remoteTr.steps.length + rebasedTr.steps.length - 1))
                }
            }
        )

        let tracked
        let rebasedTrackedTr // offline steps to be tracked
        if (
            WRITE_ROLES.includes(this.mod.editor.docInfo.access_rights) &&
            (
                unconfirmedTr.steps.length > this.trackOfflineLimit ||
                remoteTr.steps.length > this.remoteTrackOfflineLimit
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

        if (db) {
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
            this.mod.editor.mod.db.bibDB.setDB(db.bibliography)
            usedBibs.forEach(id => {
                if (!this.mod.editor.mod.db.bibDB.db[id] && oldBibDB[id]) {
                    this.mod.editor.mod.db.bibDB.updateReference(id, oldBibDB[id])
                }
            })
            const oldImageDB = this.mod.editor.mod.db.imageDB.db
            this.mod.editor.mod.db.imageDB.setDB(db.images)
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
                            () => {},
                            (id) => {
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
        }

        // this.mod.editor.docInfo.version = doc.v
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
