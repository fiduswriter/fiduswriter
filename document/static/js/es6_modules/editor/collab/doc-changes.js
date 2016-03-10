import {Step} from "prosemirror/dist/transform"
import {fidusSchema} from "../schema"

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
        if (version === this.mod.editor.pm.mod.collab.version) {
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
        clearTimeout(this.enableCheckDiffVersion)
    }

    checkDiffVersion() {
        let that = this
        if (this.currentlyCheckingVersion) {
            return
        }
        this.currentlyCheckingVersion = true
        this.enableCheckDiffVersion = setTimeout(function() {
            that.currentlyCheckingVersion = false
        }, 1000)
        if (this.mod.editor.mod.serverCommunications.connected) {
            this.disableDiffSending()
        }
        this.mod.editor.mod.serverCommunications.send({
            type: 'check_diff_version',
            diff_version: this.mod.editor.pm.mod.collab.version
        })
    }

    disableDiffSending() {
        let that = this
        this.awaitingDiffResponse = true
            // If no answer has been received from the server within 2 seconds, check the version
        this.checkDiffVersionTimer = setTimeout(function() {
            that.awaitingDiffResponse = false
            that.sendToCollaborators()
            that.checkDiffVersion()
        }, 2000)
    }

    enableDiffSending() {
        clearTimeout(this.checkDiffVersionTimer)
        this.awaitingDiffResponse = false
        this.sendToCollaborators()
    }

    sendToCollaborators() {
        if (this.awaitingDiffResponse ||
            !this.mod.editor.pm.mod.collab.hasSendableSteps() &&
            this.mod.editor.mod.comments.store.unsentEvents().length === 0) {
            // We are waiting for the confirmation of previous steps, so don't
            // send anything now, or there is nothing to send.
            return
        }
        console.log('send to collabs')
        let toSend = this.mod.editor.pm.mod.collab.sendableSteps()
        let fnToSend = this.mod.editor.mod.footnotes.fnPm.mod.collab.sendableSteps()
        let request_id = this.confirmStepsRequestCounter++
            let aPackage = {
                type: 'diff',
                diff_version: this.mod.editor.pm.mod.collab.version,
                diff: toSend.steps.map(s => s.toJSON()),
                footnote_diff: fnToSend.steps.map(s => s.toJSON()),
                comments: this.mod.editor.mod.comments.store.unsentEvents(),
                comment_version: this.mod.editor.mod.comments.store.version,
                request_id: request_id,
                hash: this.mod.editor.getHash()
            }
        this.mod.editor.mod.serverCommunications.send(aPackage)
        this.unconfirmedSteps[request_id] = {
            diffs: toSend,
            footnote_diffs: fnToSend,
            comments: this.mod.editor.mod.comments.store.hasUnsentEvents()
        }
        this.disableDiffSending()
    }

    receiveFromCollaborators(data) {
        let that = this
        if (this.mod.editor.waitingForDocument) {
            // We are currently waiting for a complete editor update, so
            // don't deal with incoming diffs.
            return
        }
        let editorHash = this.mod.editor.getHash()
        console.log('Incoming diff: version: '+data.diff_version+', hash: '+data.hash)
        console.log('Editor: version: '+this.mod.editor.pm.mod.collab.version+', hash: '+editorHash)
        if (data.diff_version !== this.mod.editor.pm.mod.collab.version) {
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
            data.diff.forEach(function(diff) {
                that.applyDiff(diff)
            })
        }
        if (data.footnote_diff && data.footnote_diff.length) {
            this.mod.editor.modfootnotes.fnEditor.applyDiffs(data.footnote_diff)
        }
        if (data.reject_request_id) {
            this.rejectDiff(data.reject_request_id)
        }
        if (!data.hash) {
            // No hash means this must have been created server side.
            this.cancelCurrentlyCheckingVersion()
            this.enableDiffSending()
            // Because the uypdate came directly from the sevrer, we may
            // also have lost some collab updates to the footnote table.
            // Re-render the footnote table if needed.
            this.mod.editor.mod.footnotes.fnEditor.renderAllFootnotes()
        }
    }

    confirmDiff(request_id) {
        console.log('confirming steps')
        let sentSteps = this.unconfirmedSteps[request_id]["diffs"]
        this.mod.editor.pm.mod.collab.confirmSteps(sentSteps)

        let sentFnSteps = this.unconfirmedSteps[request_id]["footnote_diffs"]
        this.mod.editor.mod.footnotes.fnPm.mod.collab.confirmSteps(sentFnSteps)

        let sentComments = this.unconfirmedSteps[request_id]["comments"]
        this.mod.editor.mod.comments.store.eventsSent(sentComments)

        delete this.unconfirmedSteps[request_id]
        this.enableDiffSending()
    }

    rejectDiff(request_id) {
        console.log('rejecting steps')
        this.enableDiffSending()
        delete this.unconfirmedSteps[request_id]
        this.sendToCollaborators()
    }

    applyDiff(diff) {
        this.receiving = true
        let steps = [diff].map(j => Step.fromJSON(fidusSchema, j))
        let docs = []
        let doc = this.mod.editor.pm.mod.collab.versionDoc
        docs.push(doc)
        let maps = steps.map(step => {
            let result = step.apply(doc)
            doc = result.doc
            docs.push(doc)
            return result.map
        })

        let unconfirmedMaps = this.mod.editor.pm.mod.collab.unconfirmedMaps
        let unconfirmedSteps = this.mod.editor.pm.mod.collab.unconfirmedSteps
        maps = maps.concat(unconfirmedMaps)
        unconfirmedSteps.forEach(function(step) {
            // We add pseudo steps for all the unconfirmed steps so that the
            // unconfirmed maps will be applied when handling the transform
            steps.push({
                type: 'unconfirmed'
            })
            // We add real docs
            let result = step.apply(doc)
            doc = result.doc
            docs.push(doc)
        })
        let transform = {
            steps,
            maps,
            docs
        }
        this.mod.editor.pm.mod.collab.receive(steps)
        this.mod.editor.pm.signal("remoteTransform", transform)
        this.receiving = false
    }


}
