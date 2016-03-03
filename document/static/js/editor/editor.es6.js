/* Functions for ProseMirror integration.*/

import {ProseMirror} from "prosemirror/dist/edit/main"
import {fromDOM} from "prosemirror/dist/format"
import {serializeTo} from "prosemirror/dist/format"
import "prosemirror/dist/collab"
import {UpdateScheduler} from "prosemirror/dist/ui/update"
//import "prosemirror/dist/menu/menubar"

import {fidusSchema} from "./es6_modules/schema"
import {updateUI} from "./es6_modules/update-ui"
import {ModComments} from "./es6_modules/comments/mod"
import {ModFootnotes} from "./es6_modules/footnotes/mod"
import {ModCollab} from "./es6_modules/collab/mod"
import {ModTools} from "./es6_modules/tools/mod"
import {ModServerCommunications} from "./es6_modules/server-communications"

export class Editor {
    constructor() {
        this.mod = {}
        // Whether the editor is currently waiting for a document update. Set to true
        // initially so that diffs that arrive before document has been loaded are not
        // dealt with.
        this.waitingForDocument = true

        this.docInfo = {
            'sentHash': false,
            'rights': '',
            // In collaborative mode, only the first client to connect will have
            // theEditor.docInfo.control set to true.
            'control': false,
            'last_diffs': [],
            'is_owner': false,
            'is_new': false,
            'titleChanged': false,
            'changed': false
        }
        this.doc = {}
        this.user = false
        new ModServerCommunications(this)
        //this.init()
    }

    init() {
        let that = this
        this.pm = this.makeEditor(document.getElementById('document-editable'))
        new ModFootnotes(this)
        new ModCollab(this)
        new ModTools(this)
        new UpdateScheduler(this.pm, "selectionChange change activeMarkChange blur focus setDoc", function() {
            updateUI(that)
        })
        this.pm.on("change", editorHelpers.documentHasChanged)
        this.pm.on("transform", (transform, options) => {that.onTransform(transform, true)})
        this.pm.on("remoteTransform", (transform, options) => {that.onTransform(transform, false)})
        new UpdateScheduler(this.pm, "flush setDoc", mathHelpers.layoutEmptyEquationNodes)
        new UpdateScheduler(this.pm, "flush setDoc", mathHelpers.layoutEmptyDisplayEquationNodes)
        new UpdateScheduler(this.pm, "flush setDoc", citationHelpers.formatCitationsInDocIfNew)
    }

    makeEditor(where) {
        let pm = new ProseMirror({
            place: where,
            schema: fidusSchema,
            //    menuBar: true,
            collab: {
                version: 0
            }
        })
        pm.editor = this
        return pm
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
        this.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
        this.mod.collab.docChanges.unconfirmedSteps = {}
        if (this.mod.collab.docChanges.awaitingDiffResponse) {
            this.mod.collab.docChanges.enableDiffSending()
        }
        let doc = this.createDoc(this.doc)
        this.pm.setOption("collab", null)
        this.pm.setContent(doc)
        this.pm.setOption("collab", {
            version: this.doc.version
        })
        while (this.docInfo.last_diffs.length > 0) {
            let diff = this.docInfo.last_diffs.shift()
            this.mod.collab.docChanges.applyDiff(diff)
        }
        this.doc.hash = this.getHash()
        this.pm.mod.collab.on("mustSend", function() {
            that.mod.collab.docChanges.sendToCollaborators()
        })
        this.pm.signal("documentUpdated")
        new ModComments(this, this.doc.comment_version)
        _.each(this.doc.comments, function(comment) {
            that.mod.comments.store.addLocalComment(comment.id, comment.user,
                comment.userName, comment.userAvatar, comment.date, comment.comment,
                comment.answers, comment['review:isMajor'])
        })
        this.mod.comments.store.on("mustSend", function() {
            that.mod.collab.docChanges.sendToCollaborators()
        })
        this.enableUI()
        this.waitingForDocument = false
    }

    askForDocument() {
        if (this.waitingForDocument) {
            return
        }
        this.waitingForDocument = true
        this.mod.serverCommunications.send({
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

        jQuery('span[data-citationstyle=' + this.doc.settings.citationstyle +
            ']').addClass('selected')
        editorHelpers.displaySetting.set('papersize')

        editorHelpers.layoutMetadata()

        if (this.docInfo.rights === 'w') {
            jQuery('#editor-navigation').show()
            jQuery('.metadata-menu-item, #open-close-header, .save, \
          .multibuttonsCover, .papersize-menu, .metadata-menu, \
          .documentstyle-menu, .citationstyle-menu').removeClass('disabled')
            if (this.docInfo.is_owner) {
                // bind the share dialog to the button if the user is the document owner
                jQuery('.share').removeClass('disabled')
            }
            mathHelpers.resetMath()
        } else if (this.docInfo.rights === 'r') {
            // Try to disable contenteditable
            jQuery('.ProseMirror-content').attr('contenteditable', 'false')
        }
    }


    getUpdates(callback) {
        let outputNode = nodeConverter.editorToModelNode(serializeTo(this.pm.mod.collab.versionDoc, 'dom'))
        this.doc.title = this.pm.mod.collab.versionDoc.firstChild.textContent
        this.doc.version = this.pm.mod.collab.version
        this.doc.metadata.title = exporter.node2Obj(outputNode.getElementById('document-title'))
        this.doc.metadata.subtitle = exporter.node2Obj(outputNode.getElementById('metadata-subtitle'))
        this.doc.metadata.authors = exporter.node2Obj(outputNode.getElementById('metadata-authors'))
        this.doc.metadata.abstract = exporter.node2Obj(outputNode.getElementById('metadata-abstract'))
        this.doc.metadata.keywords = exporter.node2Obj(outputNode.getElementById('metadata-keywords'))
        this.doc.contents = exporter.node2Obj(outputNode.getElementById('document-contents'))
        this.doc.hash = this.getHash()
        this.doc.comments = this.mod.comments.store.comments
        if (callback) {
            callback()
        }
    }

    receiveDocument(data) {
        let that = this
        editorHelpers.copyDocumentValues(data.document, data.document_values)
        if (data.hasOwnProperty('user')) {
            this.user = data.user
        } else {
            this.user = this.doc.owner
        }
        usermediaHelpers.init(function(){
            that.update()
            that.mod.serverCommunications.send({
                type: 'participant_update'
            })
        })
    }

    // This client was participating in collaborative editing of this document
    // but not as the cleint that was in charge of saving. This has now changed
    // so that the current user is being asked to save the document.
    takeControl() {
        this.docInfo.control = true
        this.docInfo.sentHash = false
    }

    updateComments(comments, comment_version) {
        console.log('receiving comment update')
        this.mod.comments.store.receive(comments, comment_version)
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

    // Things to be executed on every editor transform.
    onTransform(transform, local) {
        let updateBibliography = false, updateTitle = false
            // Check what area is affected
        transform.steps.forEach(function(step, index) {
            if (step.type === 'replace') {
                if (step.from.cmp(step.to) !== 0) {
                    transform.docs[index].inlineNodesBetween(step.from, step.to, function(node) {
                        if (node.type.name === 'citation') {
                            // A citation was replaced
                            updateBibliography = true
                        }
                    })
                }

                if (step.from.path[0] === 0) {
                    updateTitle = true
                }
            }
        })

        if (updateBibliography) {
            // Recreate the bibliography on next flush.
            let formatCitations = new UpdateScheduler(this.pm, "flush", function() {
                formatCitations.detach()
                citationHelpers.formatCitationsInDoc()
            })
        }

        if (updateTitle) {
            let documentTitle = this.pm.doc.firstChild.textContent
            // The title has changed. We will update our document. Mark it as changed so
            // that an update may be sent to the server.
            if (documentTitle.substring(0, 255) !== this.doc.title) {
                this.doc.title = documentTitle.substring(0, 255)
                if (local) {
                    this.docInfo.titleChanged = true
                }
            }
        }

    }

}

let theEditor = new Editor()

window.theEditor = theEditor
