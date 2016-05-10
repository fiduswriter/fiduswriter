import * as objectHash from "object-hash/dist/object_hash"

/* Functions for ProseMirror integration.*/
import {ProseMirror} from "prosemirror/dist/edit/main"
import {fromDOM} from "prosemirror/dist/format"
import {serializeTo} from "prosemirror/dist/format"
import "prosemirror/dist/collab"
import {scheduleDOMUpdate} from "prosemirror/dist/ui/update"
//import "prosemirror/dist/menu/menubar"

import {fidusSchema} from "./schema"
import {ModComments} from "./comments/mod"
import {ModFootnotes} from "./footnotes/mod"
import {ModCitations} from "./citations/mod"
import {ModCollab} from "./collab/mod"
import {ModTools} from "./tools/mod"
import {ModSettings} from "./settings/mod"
import {ModMenus} from "./menus/mod"
import {ModServerCommunications} from "./server-communications"
import {ModNodeConvert} from "./node-convert"
import {node2Obj, obj2Node} from "../exporter/json"
import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"
import {PasteHandler} from "./paste"

export class Editor {
    // A class that contains everything that happens on the editor page.
    // It is currently not possible to initialize more thna one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
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
            // this.editor.docInfo.control set to true.
            'control': false,
            'last_diffs': [],
            'is_owner': false,
            'is_new': false,
            'titleChanged': false,
            'changed': false
        }
        this.schema = fidusSchema
        this.doc = {}
        this.user = false
        new ModSettings(this)
        new ModNodeConvert(this)
        new ModServerCommunications(this)
        this.init()
    }

    init() {
        let that = this

        jQuery(document).ready(function() {
            that.startEditor()
        })
    }

    startEditor() {
        let that = this
        this.pm = this.makeEditor(document.getElementById('document-editable'))
        this.currentPm = this.pm // The editor that is currently being edited in -- main or footnote editor
        new ModFootnotes(this)
        new ModCitations(this)
        new ModMenus(this)
        new ModCollab(this)
        new ModTools(this)
        new ModComments(this)
        this.pm.on("change", function(){that.docInfo.changed = true})
        this.pm.on("filterTransform", (transform) => {return that.onFilterTransform(transform)})
        this.pm.on("transform", (transform, options) => {that.onTransform(transform, true)})
        this.pm.on("transformPastedHTML", (inHTML) => {
            let ph = new PasteHandler(inHTML, "main")
            return ph.outHTML
        })
        this.pm.mod.collab.on("collabTransform", (transform, options) => {that.onTransform(transform, false)})
        this.setSaveTimers()
    }

    setSaveTimers() {
        let that = this
        // Set Auto-save to send the document every two minutes, if it has changed.
        this.sendDocumentTimer = setInterval(function() {
            if (that.docInfo && that.docInfo.changed) {
                that.getUpdates(function() {
                    that.sendDocumentUpdate()
                })
            }
        }, 120000)

        // Set Auto-save to send the title every 5 seconds, if it has changed.
        this.sendDocumentTitleTimer = setInterval(function() {
            if (that.docInfo && that.docInfo.titleChanged) {
                that.docInfo.titleChanged = false
                that.mod.serverCommunications.send({
                    type: 'update_title',
                    title: that.doc.title
                })
            }
        }, 10000)
    }

    makeEditor(where) {
        let pm = new ProseMirror({
            place: where,
            schema: this.schema,
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
            titleNode = aDocument.metadata.title ? obj2Node(aDocument.metadata.title) : document.createElement('div'),
            documentContentsNode = obj2Node(aDocument.contents),
            metadataSubtitleNode = aDocument.metadata.subtitle ? obj2Node(aDocument.metadata.subtitle) : document.createElement('div'),
            metadataAuthorsNode = aDocument.metadata.authors ? obj2Node(aDocument.metadata.authors) : document.createElement('div'),
            metadataAbstractNode = aDocument.metadata.abstract ? obj2Node(aDocument.metadata.abstract) : document.createElement('div'),
            metadataKeywordsNode = aDocument.metadata.keywords ? obj2Node(aDocument.metadata.keywords) : document.createElement('div'),
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

        doc = fromDOM(this.schema, this.mod.nodeConvert.modelToEditorNode(editorNode), {
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
        this.mod.comments.store.setVersion(this.doc.comment_version)
        this.pm.mod.collab.on("mustSend", function() {
            that.mod.collab.docChanges.sendToCollaborators()
        })
        this.pm.signal("documentUpdated")
        _.each(this.doc.comments, function(comment) {
            that.mod.comments.store.addLocalComment(comment.id, comment.user,
                comment.userName, comment.userAvatar, comment.date, comment.comment,
                comment.answers, comment['review:isMajor'])
        })
        this.mod.comments.store.on("mustSend", function() {
            that.mod.collab.docChanges.sendToCollaborators()
        })
        this.getBibDB(this.doc.owner.id, function(){
            that.enableUI()
        })
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

    removeBibDB() {
        delete this.bibDB
        // TODO: Need to to remove all entries of citation dialog!
    }

    getBibDB(userId, callback) {
        let that = this
        if (!this.bibDB) { // Don't get the bibliography again if we already have it.
            let bibGetter = new BibliographyDB(userId, true, false, false)
            bibGetter.getBibDB(function(bibPks, bibCats){
                that.bibDB = bibGetter
                that.mod.menus.citation.appendManyToCitationDialog(bibPks)
                that.mod.citations.layoutCitations()
                that.mod.menus.header.enableExportMenu()
                if (callback) {
                    callback()
                }
            })
        } else {
            callback()
        }
    }

    removeImageDB() {
        delete this.imageDB
    }

    getImageDB(userId, callback) {
        let that = this
        if (!this.imageDB) {
            let imageGetter = new ImageDB(userId)
            imageGetter.getDB(function(){
                that.imageDB = imageGetter
                that.schema.cached.imageDB = imageGetter // assign image DB to be used in schema.
                that.mod.footnotes.schema.cached.imageDB = imageGetter // assign image DB to be used in footnote schema.
                callback()
            })
        } else {
            callback()
        }
    }

    enableUI() {

        //this.mod.citations.layoutCitations()

        jQuery('.savecopy, .saverevision, .download, .latex, .epub, .html, .print, .style, \
      .citationstyle, .tools-item, .papersize, .metadata-menu-item, \
      #open-close-header').removeClass('disabled')


        this.mod.settings.layout.displayDocumentstyle()
        this.mod.settings.layout.displayCitationstyle()

        jQuery('span[data-citationstyle=' + this.doc.settings.citationstyle +
            ']').addClass('selected')
        this.mod.settings.layout.displayPapersize()

        this.mod.settings.layout.layoutMetadata()

        if (this.docInfo.rights === 'w') {
            jQuery('#editor-navigation').show()
            jQuery('.metadata-menu-item, #open-close-header, .save, \
          .multibuttonsCover, .papersize-menu, .metadata-menu, \
          .documentstyle-menu, .citationstyle-menu').removeClass('disabled')
            if (this.docInfo.is_owner) {
                // bind the share dialog to the button if the user is the document owner
                jQuery('.share').removeClass('disabled')
            }
        } else if (this.docInfo.rights === 'r') {
            // Try to disable contenteditable
            jQuery('.ProseMirror-content').attr('contenteditable', 'false')
        }
    }


    getUpdates(callback) {
        let outputNode = this.mod.nodeConvert.editorToModelNode(serializeTo(this.pm.mod.collab.versionDoc, 'dom'))
        this.doc.title = this.pm.mod.collab.versionDoc.firstChild.textContent
        this.doc.version = this.pm.mod.collab.version
        this.doc.metadata.title = node2Obj(outputNode.getElementById('document-title'))
        this.doc.metadata.subtitle = node2Obj(outputNode.getElementById('metadata-subtitle'))
        this.doc.metadata.authors = node2Obj(outputNode.getElementById('metadata-authors'))
        this.doc.metadata.abstract = node2Obj(outputNode.getElementById('metadata-abstract'))
        this.doc.metadata.keywords = node2Obj(outputNode.getElementById('metadata-keywords'))
        this.doc.contents = node2Obj(outputNode.getElementById('document-contents'))
        this.doc.hash = this.getHash()
        this.doc.comments = this.mod.comments.store.comments
        if (callback) {
            callback()
        }
    }

    receiveDocument(data) {
        let that = this
        this.receiveDocumentValues(data.document, data.document_values)
        if (data.hasOwnProperty('user')) {
            this.user = data.user
        } else {
            this.user = this.doc.owner
        }
        this.getImageDB(this.doc.owner.id, function(){
            that.update()
            that.mod.serverCommunications.send({
                type: 'participant_update'
            })
        })
    }

    receiveDocumentValues(dataDoc, dataDocInfo) {
        let that = this
        this.doc = dataDoc
        this.docInfo = dataDocInfo
        this.docInfo.changed = false
        this.docInfo.titleChanged = false

        let defaultSettings = [
            ['papersize', 1117],
            ['citationstyle', 'apa'], // TODO: make this calculated. Not everyone will have apa installed
            ['documentstyle', window.defaultDocumentStyle]
        ]


        defaultSettings.forEach(function(variable) {
            if (that.doc.settings[variable[0]] === undefined) {
                that.doc.settings[variable[0]] = variable[1]
            }
        })


        if (this.docInfo.is_new) {
            // If the document is new, change the url. Then forget that the document is new.
            window.history.replaceState("", "", "/document/" + this.doc.id +
                "/");
            delete this.docInfo.is_new
        }
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

    // Creates a hash value for the entire document so that we can compare with other clients if
    // we really have the same contents
    getHash() {
        let doc = this.pm.mod.collab.versionDoc.copy()
        // We need to convert the footnotes from HTML to PM nodes and from that
        // to JavaScript objects, to ensure that the attribute order of everything
        // within the footnote will be the same in all browsers, so that the
        // resulting checksums are the same.
        doc.descendants(function(node){
            if (node.type.name==='footnote') {
                node.attr.contents = this.mod.footnotes.fnEditor.htmlTofootnoteNode(node.attr.contents)
            }
        })
        return objectHash.MD5(JSON.parse(JSON.stringify(doc.toJSON())), {unorderedArrays: true})
    }

    sendDocumentUpdate(callback) {
        let documentData = {
            metadata: this.doc.metadata,
            contents: this.doc.contents,
            version: this.doc.version,
            hash: this.doc.hash
        }

        this.mod.serverCommunications.send({
            type: 'update_document',
            document: documentData
        })

        this.docInfo.changed = false

        if (callback) {
            callback()
        }
        return true
    }

    // filter transformations, disallowing all transformations going across document parts/footnotes.
    onFilterTransform(transform) {
        let prohibited = false
        const docParts = ['title', 'metadatasubtitle', 'metadataauthors', 'metadataabstract',
            'metadatakeywords', 'documentcontents']
        /* There should always be exactly 6 parts to the document (title,
         * subtitle, authors, abstract, keywords & contents).
         * If the output doc of the transform uses a different number of parts
         * or the parts are of different types, we prohibit the transform.
         */
        if (transform.doc.childCount === 6) {
            let index = 0
            transform.doc.forEach(function(childNode){
                if (docParts[index] !== childNode.type.name) {
                    prohibited = true
                }
                index++
            })
        } else {
            prohibited = true
        }
        return prohibited
    }

    // Things to be executed on every editor transform.
    onTransform(transform, local) {
        let updateBibliography = false, updateTitle = false, commentIds = [], that = this
            // Check what area is affected
        transform.steps.forEach(function(step, index) {
            if (step.type === 'replace') {
                if (step.from !== step.to) {
                    transform.docs[index].nodesBetween(step.from, step.to, function(node, pos, parent) {
                        if (node.type.name === 'citation') {
                            // A citation was replaced
                            updateBibliography = true
                        }
                        if (local) {
                            let commentId = that.mod.comments.layout.findCommentId(node)
                            if (commentId !== false && commentIds.indexOf(commentId)===-1) {
                                commentIds.push(commentId)
                            }
                        }

                    })
                }

                if (that.pm.doc.resolve(step.from).node(1).type.name === 'title') {
                    updateTitle = true
                }
            }
        })

        if (updateBibliography) {
            // Recreate the bibliography on next flush.
            scheduleDOMUpdate(this.pm, () => {return that.mod.citations.resetCitations()})
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
        if (local && commentIds.length > 0) {
            // Check if the deleted comment referrers still are somewhere else in the doc.
            // If not, delete them.
            // TODO: Is a timeout/scheduleDOMUpdate really needed here?
            scheduleDOMUpdate(this.pm, () => {return that.mod.comments.store.checkAndDelete(commentIds)})
        }

    }

}
