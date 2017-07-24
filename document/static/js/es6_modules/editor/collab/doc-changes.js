import {sendableSteps, receiveTransaction, getVersion} from "prosemirror-collab"
import {Step} from "prosemirror-transform"

import {docSchema} from "../../schema/document"
import {getSelectionUpdate, removeCollaboratorSelection, updateCollaboratorSelection} from "../plugins/collab-carets"

export class ModCollabDocChanges {
    constructor(mod) {
        mod.docChanges = this
        this.mod = mod

        this.unconfirmedSteps = {}
        this.confirmStepsRequestCounter = 0
        this.awaitingDiffResponse = false
        this.receiving = false
        this.currentlyCheckingVersion = false
    }

    checkHash(version, hash) {
        console.log('Verifying hash')
        if (version === getVersion(this.mod.editor.view.state)) {
            if (hash === this.mod.editor.getHash()) {
                console.log('Hash could be verified')
                return true
            }
            console.log('Hash could not be verified, requesting document.')
            this.disableDiffSending()
            this.mod.editor.askForDocument()
            return false
        } else {
            this.checkDiffVersion()
            return false
        }
    }

    cancelCurrentlyCheckingVersion() {
        this.currentlyCheckingVersion = false
        window.clearTimeout(this.enableCheckDiffVersion)
    }

    checkDiffVersion() {
        if (this.currentlyCheckingVersion) {
            return
        }
        this.currentlyCheckingVersion = true
        this.enableCheckDiffVersion = window.setTimeout(
            () => {this.currentlyCheckingVersion = false},
            1000
        )
        if (this.mod.editor.mod.serverCommunications.connected) {
            this.disableDiffSending()
        }
        this.mod.editor.mod.serverCommunications.send(() => ({
            type: 'check_diff_version',
            diff_version: getVersion(this.mod.editor.view.state)
        }))
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
            2000
        )
    }

    enableDiffSending() {
        window.clearTimeout(this.sendNextDiffTimer)
        this.awaitingDiffResponse = false
        this.sendToCollaborators()
    }

    sendToCollaborators() {
        if (this.awaitingDiffResponse || this.mod.editor.waitingForDocument) {
            // We are waiting for the confirmation of previous steps, so don't
            // send anything now.
            return
        }

        // Handle either doc change and comment updates OR caret update. Priority
        // for doc change/comment update.
        if (
            sendableSteps(this.mod.editor.view.state) ||
            this.mod.editor.mod.comments.store.unsentEvents().length
        ) {
            this.mod.editor.mod.serverCommunications.send(() => {
                let stepsToSend = sendableSteps(this.mod.editor.view.state)
                let comments = this.mod.editor.mod.comments.store.unsentEvents()
                let fnStepsToSend = sendableSteps(this.mod.editor.mod.footnotes.fnEditor.view.state)
                let request_id = this.confirmStepsRequestCounter++
                // We add the client ID to every single step
                let diff = stepsToSend ? stepsToSend.steps.map(s => {
                    let step = s.toJSON()
                    step.client_id = stepsToSend.clientID
                    return step
                }) : []
                let footnote_diff = fnStepsToSend ? fnStepsToSend.steps.map(s => {
                    let step = s.toJSON()
                    step.client_id = fnStepsToSend.clientID
                    return step
                }) : []

                this.unconfirmedSteps[request_id] = {
                    diff,
                    footnote_diff,
                    comments: this.mod.editor.mod.comments.store.hasUnsentEvents()
                }

                return {
                    type: 'diff',
                    diff_version: getVersion(this.mod.editor.view.state),
                    diff,
                    footnote_diff,
                    comments,
                    comment_version: this.mod.editor.mod.comments.store.version,
                    request_id
                }
            })
            this.disableDiffSending()

        } else if (getSelectionUpdate(this.mod.editor.currentView.state)) {
            let currentView = this.mod.editor.currentView
            // Create a new caret as the current user
            this.mod.editor.mod.serverCommunications.send(() => {
                let selectionUpdate = getSelectionUpdate(currentView.state)
                return {
                    type: 'selection_change',
                    id: this.mod.editor.user.id,
                    diff_version: getVersion(this.mod.editor.view.state),
                    session_id: this.mod.editor.docInfo.session_id,
                    anchor: selectionUpdate.anchor,
                    head: selectionUpdate.head,
                    // Whether the selection is in the footnote or the main editor
                    editor: currentView === this.mod.editor.view ? 'main' : 'footnotes'
                }
            })
        }

    }

    receiveSelectionChange(data) {
        let transaction, fnTransaction
        if (data.editor === 'footnotes') {
            fnTransaction = updateCollaboratorSelection(
                this.mod.editor.mod.footnotes.fnEditor.view.state,
                this.mod.participants.find(par  => par.id === data.id),
                data
            )
            transaction = removeCollaboratorSelection(
                this.mod.editor.view.state,
                data
            )
        } else {
            transaction = updateCollaboratorSelection(
                this.mod.editor.view.state,
                this.mod.participants.find(par  => par.id === data.id),
                data
            )
            fnTransaction = removeCollaboratorSelection(
                this.mod.editor.mod.footnotes.fnEditor.view.state,
                data
            )
        }
        if (transaction) {
            this.mod.editor.view.dispatch(transaction)
        }
        if (fnTransaction) {
            this.mod.editor.mod.footnotes.fnEditor.view.dispatch(fnTransaction)
        }
    }

    receiveFromCollaborators(data) {
        if (data.comments && data.comments.length) {
            this.mod.editor.mod.comments.store.receive(data.comments, data.comment_version)
        }
        if (data.diff && data.diff.length) {
            data.diff.forEach(diff => this.applyDiff(diff))
        }
        if (data.footnote_diff && data.footnote_diff.length) {
            this.mod.editor.mod.footnotes.fnEditor.applyDiffs(data.footnote_diff)
        }

        if (data.server_fix) {
            // Diff is a fix created by server due to missing diffs.
            if ('reject_request_id' in data) {
                delete this.unconfirmedSteps[data.reject_request_id]
            }
            this.cancelCurrentlyCheckingVersion()

            // The update came directly from the server, so we may
            // also have lost some collab updates to the footnote table.
            // Re-render the footnote table if needed.
            this.mod.editor.mod.footnotes.fnEditor.renderAllFootnotes()
            // There may be unsent local changes. Send them now after .5 seconds,
            // in case collaborators want to send something first.
            this.enableDiffSending()
            window.setTimeout(() => this.sendToCollaborators(), 500)

        }
    }

    setConfirmedDoc(transaction) {
        // Find the latest version of the doc without any unconfirmed local changes
        let rebased = transaction.getMeta("rebased")
        this.mod.editor.confirmedDoc = rebased > 0 ? transaction.docs[transaction.steps.length - rebased] : transaction.doc
    }

    confirmDiff(request_id) {
        let sentSteps = this.unconfirmedSteps[request_id]["diff"]
        let transaction = receiveTransaction(
            this.mod.editor.view.state,
            sentSteps,
            sentSteps.map(
                step => step.client_id
            )
        )
        this.setConfirmedDoc(transaction)
        this.mod.editor.view.dispatch(transaction)
        let sentFnSteps = this.unconfirmedSteps[request_id]["footnote_diff"]
        this.mod.editor.mod.footnotes.fnEditor.view.dispatch(
            receiveTransaction(
                this.mod.editor.mod.footnotes.fnEditor.view.state,
                sentFnSteps,
                sentFnSteps.map(
                    step => step.client_id
                )
            )
        )

        let sentComments = this.unconfirmedSteps[request_id]["comments"]
        this.mod.editor.mod.comments.store.eventsSent(sentComments)

        delete this.unconfirmedSteps[request_id]
        this.enableDiffSending()
    }

    rejectDiff(request_id) {
        delete this.unconfirmedSteps[request_id]
        this.enableDiffSending()
    }

    applyDiff(diff) {
        this.receiving = true
        let step = Step.fromJSON(docSchema, diff)
        let transaction = receiveTransaction(
            this.mod.editor.view.state,
            [step],
            [diff.client_id]
        )
        transaction.setMeta('remote', true)
        this.mod.editor.view.dispatch(transaction)
        this.setConfirmedDoc(transaction)
        this.receiving = false
    }

}
