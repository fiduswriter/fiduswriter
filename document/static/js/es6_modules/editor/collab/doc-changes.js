import {Step} from "prosemirror-old/dist/transform"
import {docSchema} from "../../schema/document"

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
        if (version === this.mod.editor.pmCollab.version) {
            if (hash === this.mod.editor.getHash()) {
                console.log('Hash could be verified')
                return true
            }
            console.log('Hash could not be verified, requesting document.')
            this.disableDiffSending()
            this.mod.editor.askForDocument();
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
        this.mod.editor.mod.serverCommunications.send({
            type: 'check_diff_version',
            diff_version: this.mod.editor.pmCollab.version
        })
    }

    disableDiffSending() {
        this.awaitingDiffResponse = true
            // If no answer has been received from the server within 2 seconds, check the version
        this.checkDiffVersionTimer = window.setTimeout(
            () => {
                this.awaitingDiffResponse = false
                this.sendToCollaborators()
                this.checkDiffVersion()
            },
            2000
        )
    }

    enableDiffSending() {
        window.clearTimeout(this.checkDiffVersionTimer)
        this.awaitingDiffResponse = false
        this.sendToCollaborators()
    }

    sendToCollaborators() {
        if (this.awaitingDiffResponse ||
            !this.mod.editor.pmCollab.hasSendableSteps() &&
            this.mod.editor.mod.comments.store.unsentEvents().length === 0) {
            // We are waiting for the confirmation of previous steps, so don't
            // send anything now, or there is nothing to send.
            return
        }
        console.log('send to collabs')
        let toSend = this.mod.editor.pmCollab.sendableSteps()
        let fnToSend = this.mod.editor.mod.footnotes.fnPmCollab.sendableSteps()
        let request_id = this.confirmStepsRequestCounter++
            let aPackage = {
                type: 'diff',
                diff_version: this.mod.editor.pmCollab.version,
                diff: toSend.steps.map(s => {
                    let step = s.toJSON()
                    step.client_id = this.mod.editor.pmCollab.clientID
                    return step
                }),
                footnote_diff: fnToSend.steps.map(s => {
                    let step = s.toJSON()
                    step.client_id = this.mod.editor.mod.footnotes.fnPmCollab.clientID
                    return step
                }),
                comments: this.mod.editor.mod.comments.store.unsentEvents(),
                comment_version: this.mod.editor.mod.comments.store.version,
                request_id: request_id,
                hash: this.mod.editor.getHash()
            }
        this.mod.editor.mod.serverCommunications.send(aPackage)
        this.unconfirmedSteps[request_id] = {
            diffs: toSend.steps,
            footnote_diffs: fnToSend.steps,
            comments: this.mod.editor.mod.comments.store.hasUnsentEvents()
        }
        this.disableDiffSending()
    }

    receiveFromCollaborators(data) {
        if (this.mod.editor.waitingForDocument) {
            // We are currently waiting for a complete editor update, so
            // don't deal with incoming diffs.
            return
        }
        let editorHash = this.mod.editor.getHash()
        console.log(`Incoming diff: version: ${data.diff_version}, hash: ${data.hash}`)
        console.log(`Editor: version: ${this.mod.editor.pmCollab.version}, hash: ${editorHash}`)
        if (data.diff_version < this.mod.editor.pmCollab.version) {
            console.log('Removing excessive diffs')
            let outdatedDiffs = this.mod.editor.pmCollab.version - data.diff_version
            data.diff = data.diff.slice(outdatedDiffs)
        } else if (data.diff_version > this.mod.editor.pmCollab.version) {
            console.warn('Something is not correct. The local and remote versions do not match.')
            this.checkDiffVersion()
            return
        } else {
            console.log('version OK')
        }
        if (data.hash && data.hash !== editorHash) {
            console.warn('Something is not correct. The local and remote hash values do not match.')
            return false
        }
        if (data.comments && data.comments.length) {
            this.mod.editor.updateComments(data.comments, data.comments_version)
        }
        if (data.diff && data.diff.length) {
            data.diff.forEach(diff => this.applyDiff(diff))
        }
        if (data.footnote_diff && data.footnote_diff.length) {
            this.mod.editor.mod.footnotes.fnEditor.applyDiffs(data.footnote_diff)
        }

        if (!data.hash) {
            // No hash means this must have been created server side.
            if ('reject_request_id' in data) {
                console.log('rejecting steps')
                delete this.unconfirmedSteps[data.reject_request_id]
            }
            this.cancelCurrentlyCheckingVersion()
            this.enableDiffSending()
            // Because the update came directly from the server, we may
            // also have lost some collab updates to the footnote table.
            // Re-render the footnote table if needed.
            this.mod.editor.mod.footnotes.fnEditor.renderAllFootnotes()
        }
    }

    confirmDiff(request_id) {
        console.log('confirming steps')
        let sentSteps = this.unconfirmedSteps[request_id]["diffs"]
        this.mod.editor.pmCollab.receive(sentSteps, sentSteps.map(
            step => this.mod.editor.pmCollab.clientID
        ))

        let sentFnSteps = this.unconfirmedSteps[request_id]["footnote_diffs"]
        this.mod.editor.mod.footnotes.fnPmCollab.receive(
            sentFnSteps,
            sentFnSteps.map(step => this.mod.editor.mod.footnotes.fnPmCollab.clientID)
        )

        let sentComments = this.unconfirmedSteps[request_id]["comments"]
        this.mod.editor.mod.comments.store.eventsSent(sentComments)

        delete this.unconfirmedSteps[request_id]
        this.enableDiffSending()
    }


    applyDiff(diff) {
        this.receiving = true
        let steps = [diff].map(j => Step.fromJSON(docSchema, j))
        let client_ids = [diff].map(j => j.client_id)
        this.mod.editor.pmCollab.receive(steps, client_ids)
        this.receiving = false
    }


}
