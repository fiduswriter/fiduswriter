import * as objectHash from "object-hash/dist/object_hash"

/* Functions for ProseMirror integration.*/
import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {collabEditing} from "prosemirror-old/dist/collab"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {docSchema} from "../schema/document"
import {ModComments} from "./comments/mod"
import {ModFootnotes} from "./footnotes/mod"
import {ModCitations} from "./citations/mod"
import {ModCollab} from "./collab/mod"
import {ModTools} from "./tools/mod"
import {ModSettings} from "./settings/mod"
import {ModMenus} from "./menus/mod"
import {ModServerCommunications} from "./server-communications"
import {getSettings, getMetadata, updateDoc} from "../schema/convert"
import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"
import {Paste} from "./paste/paste"

export const COMMENT_ONLY_ROLES = ['edit', 'review', 'comment']
export const READ_ONLY_ROLES = ['read', 'read-without-comments']
export const REVIEW_ROLES = ['review']

export class Editor {
    // A class that contains everything that happens on the editor page.
    // It is currently not possible to initialize more thna one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor(id) {
        this.mod = {}
        // Whether the editor is currently waiting for a document update. Set to true
        // initially so that diffs that arrive before document has been loaded are not
        // dealt with.
        this.waitingForDocument = true

        this.docInfo = {
            rights: '',
            unapplied_diffs: [],
            is_owner: false,
            title_changed: false,
            changed: false,
        }
        this.schema = docSchema
        this.doc = {
            // Initially we only have the id.
            id
        }
        this.user = false
        new ModServerCommunications(this)
    }

    init() {
        let that = this
        new ModSettings(this)
        jQuery(document).ready(function() {
            that.startEditor()
        })
    }

    startEditor() {
        let that = this
        this.makeEditor()
        this.currentPm = this.pm // The editor that is currently being edited in -- main or footnote editor
        new ModFootnotes(this)
        new ModCitations(this)
        new ModMenus(this)
        new ModCollab(this)
        new ModTools(this)
        new ModComments(this)
        this.pm.on.change.add(function(){that.docInfo.changed = true})
        this.pm.on.filterTransform.add((transform) => {return that.onFilterTransform(transform)})
        this.pm.on.transform.add((transform, options) => {that.onTransform(transform, true)})
        this.pm.on.transformPastedHTML.add((inHTML) => {
            let ph = new Paste(inHTML, "main")
            return ph.getOutput()
        })
        this.pm.mod.collab.receivedTransform.add((transform, options) => {that.onTransform(transform, false)})
        this.mod.serverCommunications.init()
        this.setSaveTimers()
    }

    setSaveTimers() {
        let that = this
        // Set Auto-save to send the document every two minutes, if it has changed.
        this.sendDocumentTimer = window.setInterval(function() {
            if (that.docInfo && that.docInfo.changed &&
                READ_ONLY_ROLES.indexOf(that.docInfo.rights) === -1) {
                that.save()
            }
        }, 120000)

        // Set Auto-save to send the title every 5 seconds, if it has changed.
        this.sendDocumentTitleTimer = window.setInterval(function() {
            if (that.docInfo && that.docInfo.title_changed &&
                READ_ONLY_ROLES.indexOf(that.docInfo.rights) === -1) {
                that.docInfo.title_changed = false
                that.mod.serverCommunications.send({
                    type: 'update_title',
                    title: that.doc.title
                })
            }
        }, 10000)

        // Auto save the document when the user leaves the page.
        window.addEventListener("beforeunload", function (event) {
            if (that.docInfo && that.docInfo.changed &&
                READ_ONLY_ROLES.indexOf(that.docInfo.rights) === -1) {
                that.save()
            }
        })
    }

    makeEditor() {
        let that = this
        this.pm = new ProseMirror({
            place: document.getElementById('document-editable'),
            schema: this.schema,
            plugins: [collabEditing.config({version: 0})]
        })
        this.pm.addKeymap(buildKeymap(this.schema))
        // add mod to give us simple access to internals removed in PM 0.8.0
        this.pm.mod = {}
        this.pm.mod.collab = collabEditing.get(this.pm)
        // Ignore setDoc
        this.pm.on.beforeSetDoc.remove(this.pm.mod.collab.onSetDoc)
        this.pm.mod.collab.onSetDoc = function (){}
        // Trigger reset on setDoc
        this.pm.mod.collab.afterSetDoc = function (){
            // Reset all collab values and set document version
            let collab = that.pm.mod.collab
            collab.versionDoc = that.pm.doc
            collab.unconfirmedSteps = []
            collab.unconfirmedMaps = []
        }
        this.pm.on.setDoc.add(this.pm.mod.collab.afterSetDoc)
    }

    // Removes all content from the editor and adds the contents of this.doc.
    update() {
        // Updating editor
        let that = this
        this.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
        this.mod.collab.docChanges.unconfirmedSteps = {}
        if (this.mod.collab.docChanges.awaitingDiffResponse) {
            this.mod.collab.docChanges.enableDiffSending()
        }
        this.setPmDoc()
        this.pm.mod.collab.version = this.doc.version


        if (this.docInfo.unapplied_diffs.length > 0) {
            // We have unapplied diffs -- this hsould only happen if the last disconnect
            // happened before we could save. We try to apply the diffs and then save
            // immediately.
            try {
                // We only try because this fails if the PM diff format has changed
                // again.
                while (this.docInfo.unapplied_diffs.length > 0) {
                    let diff = this.docInfo.unapplied_diffs.shift()
                    this.mod.collab.docChanges.applyDiff(diff)
                }
            } catch (error) {
                // We couldn't apply the diffs. They are likely corrupted.
                // We set the original document, increase the version by one and
                // save to the server.
                this.setPmDoc()
                console.warn('Diffs could not be applied correctly!')
                this.pm.mod.collab.version = this.doc.version + this.docInfo.unapplied_diffs.length + 1
                this.docInfo.unapplied_diffs = []
            }
            this.save()
        }

        // Applying diffs through the receiving mechanism has also added all the
        // footnotes from diffs to list of footnotes without adding them to the
        // footnote editor. We therefore need to remove all markers so that they
        // will be found when footnotes are rendered.
        this.mod.footnotes.markers.removeAllMarkers()
        this.docInfo.hash = this.getHash()
        this.mod.comments.store.setVersion(this.doc.comment_version)
        this.pm.mod.collab.mustSend.add(function() {
            that.mod.collab.docChanges.sendToCollaborators()
        }, 0) // priority : 0 so that other things can be scheduled before this.
        this.pm.mod.collab.receivedTransform.add(
            (transform, options) => {
                that.onTransform(transform, false)
            }
        )
        this.mod.footnotes.fnEditor.renderAllFootnotes()
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

    setPmDoc() {
        let that = this
        // Given that the article node is the second outer-most node, we need
        // to wrap it in a doc node before setting it in PM.
        if (this.doc.contents.type) {
            let pmDoc = docSchema.nodeFromJSON({type:'doc',content:[this.doc.contents]})
            this.pm.setDoc(pmDoc)
        } else{
            // Document is new
            this.getUpdates(function(){
                that.setPmDoc() // We need to set the doc so that events such as for ui update are triggered.
            })
        }
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
            bibGetter.getDB(function(bibPks, bibCats){
                that.bibDB = bibGetter
                that.mod.menus.citation.appendManyToCitationDialog(bibPks)
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

        jQuery('.savecopy, .saverevision, .download, .template-export, .latex, .epub, .html, .print, .style, \
      .citationstyle, .tools-item, .papersize, .metadata-menu-item, \
      #open-close-header').removeClass('disabled')

        this.mod.settings.check(this.pm.doc.firstChild.attrs)

        if (READ_ONLY_ROLES.indexOf(this.docInfo.rights) > -1) {
            jQuery('#editor-navigation').hide()
            jQuery('.metadata-menu-item, #open-close-header, .save, \
          .multibuttonsCover, .papersize-menu, .metadata-menu, \
          .documentstyle-menu, .citationstyle-menu').addClass('disabled')
        } else {
            jQuery('#editor-navigation').show()
            jQuery('.metadata-menu-item, #open-close-header, .save, \
          .papersize-menu, .metadata-menu, \
          .documentstyle-menu, .citationstyle-menu').removeClass('disabled')
            if (this.docInfo.is_owner) {
                // bind the share dialog to the button if the user is the document owner
                jQuery('.share').removeClass('disabled')
                jQuery('.submit-ojs').removeClass('disabled')
            }
            if (COMMENT_ONLY_ROLES.indexOf(this.docInfo.rights) > -1) {
                let toolbar = jQuery('.editortoolbar')
                toolbar.find('.ui-buttonset').hide()
                toolbar.find('.comment-only').show()
            }
            else {
                jQuery('.metadata-menu-item, #open-close-header, .save, \
              .papersize-menu, .metadata-menu, \
              .documentstyle-menu, .citationstyle-menu').removeClass('disabled')
            }
        }
        jQuery('#revision-done').hide()
        if (REVIEW_ROLES.indexOf(this.docInfo.rights) > -1)  {
          jQuery('#reviewed').show()
          jQuery('#reviewerOJSReturn').show()
        }
        else {
          jQuery('#reviewed').hide()
          jQuery('#reviewerOJSReturn').hide()
          if (this.doc.submission.status == 'submitted' && this.doc.submission.user_id == this.user.id)
            jQuery('#revision-done').show()
        }

    }

    receiveDocument(data) {
        let that = this
        this.updateData(data.doc, data.doc_info)
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

    updateData(doc, docInfo) {
        let that = this
        this.doc = updateDoc(doc)
        this.docInfo = docInfo
        this.docInfo.changed = false
        this.docInfo.title_changed = false


        if (this.doc.version === 0) {
            // If the document is new, change the url.
            window.history.replaceState("", "", `/document/${this.doc.id}/`)
        }
    }

    updateComments(comments, comment_version) {
        this.mod.comments.store.receive(comments, comment_version)
    }

    // Creates a hash value for the entire document so that we can compare with other clients if
    // we really have the same contents
    getHash() {
        return objectHash.MD5(this.pm.mod.collab.versionDoc.toJSON(), {unorderedArrays: true})
    }

    // Get updates to document and then send updates to the server
    save(callback) {
        let that = this
        this.getUpdates(function() {
            that.sendDocumentUpdate(function(){
                if (callback) {
                    callback()
                }
            })
        })
    }

    // Collects updates of the document from ProseMirror and saves it under this.doc
    getUpdates(callback) {
        let pmArticle = this.pm.mod.collab.versionDoc.firstChild
        this.doc.contents = pmArticle.toJSON()
        this.doc.metadata = getMetadata(pmArticle)
        this.doc.settings = getSettings(pmArticle)
        this.doc.title = pmArticle.firstChild.textContent
        this.doc.version = this.pm.mod.collab.version
        this.docInfo.hash = this.getHash()
        this.doc.comments = this.mod.comments.store.comments
        if (callback) {
            callback()
        }
    }

    // Send changes to the document to the server
    sendDocumentUpdate(callback) {
        let doc = {
            title: this.doc.title,
            metadata: this.doc.metadata,
            settings: this.doc.settings,
            contents: this.doc.contents,
            version: this.doc.version,
        }

        this.mod.serverCommunications.send({
            type: 'update_doc',
            doc,
            hash: this.docInfo.hash
        })

        this.docInfo.changed = false

        if (callback) {
            callback()
        }
        return true
    }

    // filter transformations.
    onFilterTransform(transform) {
        let prohibited = false

        if (READ_ONLY_ROLES.indexOf(this.docInfo.rights) > -1) {
            // User only has read access. Don't allow anything.
            prohibited = true
        } else if (COMMENT_ONLY_ROLES.indexOf(this.docInfo.rights) > -1) {
            //User has a comment-only role (commentator, editor or reviewer)

            //Check all transformation steps. If step type not allowed = prohibit
            if (!transform.steps.every(function(step) {
                //check if in allowed array. if false - exit loop
                return (step.jsonID === 'addMark' || step.jsonID === 'removeMark') && step.mark.type.name === 'comment'
            })) {
                prohibited = true
            }
        }

        return prohibited
    }

    // Things to be executed on every editor transform.
    onTransform(transform, local) {
        let updateBibliography = false, updateTitle = false, updateSettings = false,
            commentIds = [], that = this
            // Check what area is affected

        transform.steps.forEach(function(step, index) {
            if (step.jsonID === 'replace' || step.jsonID === 'replaceAround') {
                if (step.from !== step.to) {
                    transform.docs[index].nodesBetween(
                        step.from,
                        step.to,
                        function(node, pos, parent) {
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
                        }
                    )
                    if (step.from===0 && step.jsonID === 'replaceAround') {
                        updateSettings = true
                    }
                }
                let docPart = that.pm.doc.resolve(step.from).node(2)
                if (docPart && docPart.type.name === 'title') {
                    updateTitle = true
                }
            }
        })

        if (updateBibliography) {
            // Recreate the bibliography on next flush.
            this.pm.scheduleDOMUpdate(() => {return that.mod.citations.resetCitations()})
        }

        if (updateTitle) {
            let documentTitle = this.pm.doc.firstChild.firstChild.textContent
            // The title has changed. We will update our document. Mark it as changed so
            // that an update may be sent to the server.
            if (documentTitle.substring(0, 255) !== this.doc.title) {
                this.doc.title = documentTitle.substring(0, 255)
                if (local) {
                    this.docInfo.title_changed = true
                }
            }
        }
        if (updateSettings) {
            this.mod.settings.check(this.pm.doc.firstChild.attrs)
        }
        if (local && commentIds.length > 0) {
            // Check if the deleted comment referrers still are somewhere else in the doc.
            // If not, delete them.
            // TODO: Is a timeout/scheduleDOMUpdate really needed here?
            this.pm.scheduleDOMUpdate(() => {return that.mod.comments.store.checkAndDelete(commentIds)})
        }

    }

}
