/* Functions for ProseMirror integration.*/

import {ProseMirror} from "prosemirror/dist/edit/main"
import {fromDOM} from "prosemirror/dist/format"
import {serializeTo} from "prosemirror/dist/format"
import {Step} from "prosemirror/dist/transform"
import "prosemirror/dist/collab"
//import "prosemirror/dist/menu/menubar"

import {fidusSchema} from "./es6_modules/schema"
import {updateUI} from "./es6_modules/update-ui"
import {ModComments} from "./es6_modules/comments/mod"
import {ModFootnotes} from "./es6_modules/footnotes/mod"

import {UpdateScheduler} from "prosemirror/dist/ui/update"

export class Editor {
    constructor() {
        // Whether the editor is currently waiting for a document update. Set to true
        // initially so that diffs that arrive before document has been loaded are not
        // dealt with.
        this.waitingForDocument = true
        this.unconfirmedSteps = {}
        this.confirmStepsRequestCounter = 0
        this.collaborativeMode = false
        this.currentlyCheckingVersion = false
        this.awaitingDiffResponse = false
            //this.init()
    }

    init() {
        let that = this
        this.pm = this.makeEditor(document.getElementById('document-editable'))
        new ModFootnotes(this.pm)
        new UpdateScheduler(this.pm, "selectionChange change activeMarkChange blur focus setDoc", function() {
            updateUI(that.pm)
        })
        this.pm.on("change", editorHelpers.documentHasChanged)
        this.pm.on("transform", (transform, options) => that.onTransform(transform, options))
        new UpdateScheduler(this.pm, "flush setDoc", mathHelpers.layoutEmptyEquationNodes)
        new UpdateScheduler(this.pm, "flush setDoc", mathHelpers.layoutEmptyDisplayEquationNodes)
        new UpdateScheduler(this.pm, "flush setDoc", citationHelpers.formatCitationsInDocIfNew)
    }

    makeEditor(where) {
        return new ProseMirror({
            place: where,
            schema: fidusSchema,
            //    menuBar: true,
            collab: {
                version: 0
            }
        })
    }

    createDoc(aDocument) {
        let editorNode = document.createElement('div'),
            titleNode = aDocument.metadata.title ? exporter.obj2Node(aDocument.metadata.title) : document.createElement('div'),
            documentContentsNode = exporter.obj2Node(aDocument.contents),
            metadataSubtitleNode = aDocument.metadata.subtitle ? exporter.obj2Node(aDocument.metadata.subtitle) : document.createElement('div'),
            metadataAuthorsNode = aDocument.metadata.authors ? exporter.obj2Node(aDocument.metadata.authors) : document.createElement('div'),
            metadataAbstractNode = aDocument.metadata.abstract ? exporter.obj2Node(aDocument.metadata.abstract) : document.createElement('div'),
            metadataKeywordsNode = aDocument.metadata.keywords ? exporter.obj2Node(aDocument.metadata.keywords) : document.createElement('div'),
            doc

        titleNode.id = 'document-title'
        metadataSubtitleNode.id = 'metadata-subtitle'
        metadataAuthorsNode.id = 'metadata-authors'
        metadataAbstractNode.id = 'metadata-abstract'
        metadataKeywordsNode.id = 'metadata-keywords'
        documentContentsNode.id = 'document-contents'

        editorNode.appendChild(titleNode)
        editorNode.appendChild(metadataSubtitleNode)
        editorNode.appendChild(metadataAuthorsNode)
        editorNode.appendChild(metadataAbstractNode)
        editorNode.appendChild(metadataKeywordsNode)
        editorNode.appendChild(documentContentsNode)

        doc = fromDOM(fidusSchema, nodeConverter.modelToEditorNode(editorNode), {
            preserveWhitespace: true
        })
        return doc
    }

    update() {
        console.log('Updating editor')
        let that = this
        this.cancelCurrentlyCheckingVersion()
        this.unconfirmedSteps = {}
        if (this.awaitingDiffResponse) {
            this.enableDiffSending()
        }
        let theDocument = window.theDocument
        let theDocumentValues = window.theDocumentValues
        let doc = this.createDoc(theDocument)
        this.pm.setOption("collab", null)
        this.pm.setContent(doc)
        this.pm.setOption("collab", {
            version: theDocument.version
        })
        while (theDocumentValues.last_diffs.length > 0) {
            let diff = theDocumentValues.last_diffs.shift()
            this.applyDiff(diff)
        }
        theDocument.hash = this.getHash()
        this.pm.mod.collab.on("mustSend", function() {
            that.sendToCollaborators()
        })
        this.pm.signal("documentUpdated")
        new ModComments(this.pm, theDocument.comment_version)
        _.each(theDocument.comments, function(comment) {
            this.pm.mod.comments.store.addLocalComment(comment.id, comment.user,
                comment.userName, comment.userAvatar, comment.date, comment.comment,
                comment.answers, comment['review:isMajor'])
        })
        this.pm.mod.comments.store.on("mustSend", function() {
            that.sendToCollaborators()
        })
        this.enableUI()
        this.waitingForDocument = false
    }



    askForDocument() {
        if (this.waitingForDocument) {
            return;
        }
        this.waitingForDocument = true
        serverCommunications.send({
            type: 'get_document'
        })
    }

    enableUI() {
        bibliographyHelpers.initiate()

        jQuery('.savecopy, .download, .latex, .epub, .html, .print, .style, \
      .citationstyle, .tools-item, .papersize, .metadata-menu-item, \
      #open-close-header').removeClass('disabled')

        citationHelpers.formatCitationsInDoc()
        editorHelpers.displaySetting.set('documentstyle')
        editorHelpers.displaySetting.set('citationstyle')

        jQuery('span[data-citationstyle=' + theDocument.settings.citationstyle +
            ']').addClass('selected')
        editorHelpers.displaySetting.set('papersize')

        editorHelpers.layoutMetadata()

        if (theDocumentValues.rights === 'w') {
            jQuery('#editor-navigation').show()
            jQuery('.metadata-menu-item, #open-close-header, .save, \
          .multibuttonsCover, .papersize-menu, .metadata-menu, \
          .documentstyle-menu, .citationstyle-menu').removeClass('disabled')
            if (theDocumentValues.is_owner) {
                // bind the share dialog to the button if the user is the document owner
                jQuery('.share').removeClass('disabled')
            }
            mathHelpers.resetMath()
        } else if (theDocumentValues.rights === 'r') {
            // Try to disable contenteditable
            jQuery('.ProseMirror-content').attr('contenteditable', 'false')
        }
    }


    getUpdates(callback) {
        let outputNode = nodeConverter.editorToModelNode(serializeTo(this.pm.mod.collab.versionDoc, 'dom'))
        let theDocument = window.theDocument
        theDocument.title = this.pm.mod.collab.versionDoc.firstChild.textContent
        theDocument.version = this.pm.mod.collab.version
        theDocument.metadata.title = exporter.node2Obj(outputNode.getElementById('document-title'))
        theDocument.metadata.subtitle = exporter.node2Obj(outputNode.getElementById('metadata-subtitle'))
        theDocument.metadata.authors = exporter.node2Obj(outputNode.getElementById('metadata-authors'))
        theDocument.metadata.abstract = exporter.node2Obj(outputNode.getElementById('metadata-abstract'))
        theDocument.metadata.keywords = exporter.node2Obj(outputNode.getElementById('metadata-keywords'))
        theDocument.contents = exporter.node2Obj(outputNode.getElementById('document-contents'))
        theDocument.hash = this.getHash()
        theDocument.comments = this.pm.mod.comments.store.comments
        if (callback) {
            callback()
        }
    }

    sendToCollaborators() {
        if (this.awaitingDiffResponse ||
            !this.pm.mod.collab.hasSendableSteps() &&
            this.pm.mod.comments.store.unsentEvents().length === 0) {
            // We are waiting for the confirmation of previous steps, so don't
            // send anything now, or there is nothing to send.
            return
        }
        console.log('send to collabs')
        let toSend = this.pm.mod.collab.sendableSteps()
        let fnToSend = this.pm.mod.footnotes.fnPm.mod.collab.sendableSteps()
        let request_id = this.confirmStepsRequestCounter++
            let aPackage = {
                type: 'diff',
                diff_version: this.pm.mod.collab.version,
                diff: toSend.steps.map(s => s.toJSON()),
                footnote_diff: fnToSend.steps.map(s => s.toJSON()),
                comments: this.pm.mod.comments.store.unsentEvents(),
                comment_version: this.pm.mod.comments.store.version,
                request_id: request_id,
                hash: this.getHash()
            }
        serverCommunications.send(aPackage)
        this.unconfirmedSteps[request_id] = {
            diffs: toSend,
            footnote_diffs: fnToSend,
            comments: this.pm.mod.comments.store.hasUnsentEvents()
        }
        this.disableDiffSending()
    }

    confirmDiff(request_id) {
        console.log('confirming steps')
        let sentSteps = this.unconfirmedSteps[request_id]["diffs"]
        this.pm.mod.collab.confirmSteps(sentSteps)

        let sentFnSteps = this.unconfirmedSteps[request_id]["footnote_diffs"]
        this.pm.mod.footnotes.fnPm.mod.collab.confirmSteps(sentFnSteps)

        let sentComments = this.unconfirmedSteps[request_id]["comments"]
        this.pm.mod.comments.store.eventsSent(sentComments)

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
        this.pm.receiving = true
        let steps = [diff].map(j => Step.fromJSON(fidusSchema, j))
        let maps = this.pm.mod.collab.receive(steps)
        let unconfirmedMaps = this.pm.mod.collab.unconfirmedMaps
        maps = maps.concat(unconfirmedMaps)
        unconfirmedMaps.forEach(function(map) {
            // We add pseudo steps for all the unconfirmed steps so that the
            // unconfirmed maps will be applied when handling the transform
            steps.push({
                type: 'unconfirmed'
            })
        })
        let transform = {
            steps,
            maps
        }
        this.pm.signal("receivedTransform", transform)
        this.pm.receiving = false
    }

    updateComments(comments, comment_version) {
        console.log('receiving comment update')
        this.pm.mod.comments.store.receive(comments, comment_version)
    }

    getHash() {
        let string = JSON.stringify(this.pm.mod.collab.versionDoc)
        let len = string.length
        var hash = 0,
            char, i
        if (len == 0) return hash
        for (i = 0; i < len; i++) {
            char = string.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash
        }
        return hash
    }
    checkHash(version, hash) {
        console.log('Verifying hash')
        if (version === this.pm.mod.collab.version) {
            if (hash === this.getHash()) {
                console.log('Hash could be verified')
                return true
            }
            console.log('Hash could not be verified, requesting document.')
            this.disableDiffSending()
            this.askForDocument();
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
        if (this.connected) {
            this.disableDiffSending()
        }
        serverCommunications.send({
            type: 'check_diff_version',
            diff_version: this.pm.mod.collab.version
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

    // Things to be executed on every editor transform.
    onTransform(transform) {
        var updateBibliography = false
            // Check what area is affected
        transform.steps.forEach(function(step, index) {
            if (step.type === 'replace' && step.from.cmp(step.to) !== 0) {
                transform.docs[index].inlineNodesBetween(step.from, step.to, function(node) {
                    if (node.type.name === 'citation') {
                        // A citation was replaced
                        updateBibliography = true
                    }
                })
            }
        })

        if (updateBibliography) {
            // Recreate the bibliography on next flush.
            let formatCitations = new UpdateScheduler(this.pm, "flush", function() {
                formatCitations.detach()
                citationHelpers.formatCitationsInDoc()
            })
        }

    }

}

let theEditor = new Editor()

window.theEditor = theEditor
