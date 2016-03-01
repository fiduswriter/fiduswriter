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

import {UpdateScheduler, scheduleDOMUpdate} from "prosemirror/dist/ui/update"

var theEditor = {}

function makeEditor (where) {
  return new ProseMirror({
    place: where,
    schema: fidusSchema,
//    menuBar: true,
    collab: {version: 0}
  })
}


theEditor.createDoc = function (aDocument) {
    var editorNode = document.createElement('div'),
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

theEditor.initiate = function () {
      theEditor.editor = makeEditor(document.getElementById('document-editable'))
      new ModFootnotes(theEditor.editor)
      new UpdateScheduler(theEditor.editor, "selectionChange change activeMarkChange blur focus setDoc", function () {updateUI(theEditor.editor)})
      theEditor.editor.on("change", editorHelpers.documentHasChanged)
      theEditor.editor.on("transform", (transform, options) => theEditor.onTransform(transform, options))
      new UpdateScheduler(theEditor.editor, "flush setDoc", mathHelpers.layoutEmptyEquationNodes)
      new UpdateScheduler(theEditor.editor, "flush setDoc", mathHelpers.layoutEmptyDisplayEquationNodes)
      new UpdateScheduler(theEditor.editor, "flush setDoc", citationHelpers.formatCitationsInDocIfNew)
}


theEditor.update = function () {
      console.log('Updating editor')
      theEditor.cancelCurrentlyCheckingVersion()
      theEditor.unconfirmedSteps = {}
      if (theEditor.awaitingDiffResponse) {
          theEditor.enableDiffSending()
      }
      let doc = theEditor.createDoc(theDocument)
      theEditor.editor.setOption("collab", null)
      theEditor.editor.setContent(doc)
      theEditor.editor.setOption("collab", {version: theDocument.version})
      while (theDocumentValues.last_diffs.length > 0) {
          let diff = theDocumentValues.last_diffs.shift()
          theEditor.applyDiff(diff)
      }
      theDocument.hash = theEditor.getHash()
      theEditor.editor.mod.collab.on("mustSend", theEditor.sendToCollaborators)
      theEditor.editor.signal("documentUpdated")
      new ModComments(theEditor.editor, theDocument.comment_version)
      _.each(theDocument.comments, function (comment){
        theEditor.editor.mod.comments.store.addLocalComment(comment.id, comment.user,
          comment.userName, comment.userAvatar, comment.date, comment.comment, comment.answers, comment['review:isMajor'])
      })
      theEditor.editor.mod.comments.store.on("mustSend", theEditor.sendToCollaborators)
      theEditor.enableUI()
      theEditor.waitingForDocument = false
}

// Whether the editor is currently waiting for a document update. Set to true
// initially so that diffs that arrive before document has been loaded are not
// dealt with.
theEditor.waitingForDocument = true

theEditor.askForDocument = function () {
    if (theEditor.waitingForDocument) {
        return;
    }
    theEditor.waitingForDocument = true
    serverCommunications.send({
        type: 'get_document'
    })
}

theEditor.enableUI = function () {
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


theEditor.getUpdates = function (callback) {
      let outputNode = nodeConverter.editorToModelNode(serializeTo(theEditor.editor.mod.collab.versionDoc,'dom'))
      theDocument.title = theEditor.editor.mod.collab.versionDoc.firstChild.textContent
      theDocument.version = theEditor.editor.mod.collab.version
      theDocument.metadata.title = exporter.node2Obj(outputNode.getElementById('document-title'))
      theDocument.metadata.subtitle = exporter.node2Obj(outputNode.getElementById('metadata-subtitle'))
      theDocument.metadata.authors = exporter.node2Obj(outputNode.getElementById('metadata-authors'))
      theDocument.metadata.abstract = exporter.node2Obj(outputNode.getElementById('metadata-abstract'))
      theDocument.metadata.keywords = exporter.node2Obj(outputNode.getElementById('metadata-keywords'))
      theDocument.contents = exporter.node2Obj(outputNode.getElementById('document-contents'))
      theDocument.hash = theEditor.getHash()
      theDocument.comments = theEditor.editor.mod.comments.store.comments
      if (callback) {
          callback()
      }
}

theEditor.unconfirmedSteps = {}

var confirmStepsRequestCounter = 0

theEditor.sendToCollaborators = function () {
      if (theEditor.awaitingDiffResponse ||
        !theEditor.editor.mod.collab.hasSendableSteps() &&
        theEditor.editor.mod.comments.store.unsentEvents().length === 0) {
          // We are waiting for the confirmation of previous steps, so don't
          // send anything now, or there is nothing to send.
          return
      }
      console.log('send to collabs')
      let toSend = theEditor.editor.mod.collab.sendableSteps()
      let fnToSend = theEditor.editor.mod.footnotes.fnPm.mod.collab.sendableSteps()
      let request_id = confirmStepsRequestCounter++
      let aPackage = {
          type: 'diff',
          diff_version: theEditor.editor.mod.collab.version,
          diff: toSend.steps.map(s => s.toJSON()),
          footnote_diff: fnToSend.steps.map(s => s.toJSON()),
          comments: theEditor.editor.mod.comments.store.unsentEvents(),
          comment_version: theEditor.editor.mod.comments.store.version,
          request_id: request_id,
          hash: theEditor.getHash()
      }
      serverCommunications.send(aPackage)
      theEditor.unconfirmedSteps[request_id] = {
          diffs: toSend,
          footnote_diffs: fnToSend,
          comments: theEditor.editor.mod.comments.store.hasUnsentEvents()
      }
      theEditor.disableDiffSending()
}

theEditor.confirmDiff = function (request_id) {
    console.log('confirming steps')
    let sentSteps = theEditor.unconfirmedSteps[request_id]["diffs"]
    theEditor.editor.mod.collab.confirmSteps(sentSteps)

    let sentFnSteps = theEditor.unconfirmedSteps[request_id]["footnote_diffs"]
    theEditor.editor.mod.footnotes.fnPm.mod.collab.confirmSteps(sentFnSteps)

    let sentComments = theEditor.unconfirmedSteps[request_id]["comments"]
    theEditor.editor.mod.comments.store.eventsSent(sentComments)

    delete theEditor.unconfirmedSteps[request_id]
    theEditor.enableDiffSending()
}

theEditor.rejectDiff = function (request_id) {
    console.log('rejecting steps')
    theEditor.enableDiffSending()
    delete theEditor.unconfirmedSteps[request_id]
    theEditor.sendToCollaborators()
}

theEditor.applyDiff = function(diff) {
    theEditor.editor.receiving = true
    let steps = [diff].map(j => Step.fromJSON(fidusSchema, j))
    let maps = theEditor.editor.mod.collab.receive(steps)
    let unconfirmedMaps = theEditor.editor.mod.collab.unconfirmedMaps
    maps = maps.concat(unconfirmedMaps)
    unconfirmedMaps.forEach(function(map){
        // We add pseudo steps for all the unconfirmed steps so that the
        // unconfirmed maps will be applied when handling the transform
        steps.push({type: 'unconfirmed'})
    })
    let transform = {steps,maps}
    theEditor.editor.signal("receivedTransform", transform)
    theEditor.editor.receiving = false
}

theEditor.updateComments = function(comments, comment_version) {
    console.log('receiving comment update')
    theEditor.editor.mod.comments.store.receive(comments, comment_version)
}

theEditor.collaborativeMode = false

theEditor.getHash = function () {
    let string = JSON.stringify(theEditor.editor.mod.collab.versionDoc)
    let len = string.length
    var hash = 0, char, i
    if (len == 0) return hash
    for (i = 0; i < len; i++) {
        char = string.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return hash
}
theEditor.checkHash = function(version, hash) {
    console.log('Verifying hash')
    if (version===theEditor.editor.mod.collab.version) {
      if(hash===theEditor.getHash()) {
          console.log('Hash could be verified')
          return true
      }
      console.log('Hash could not be verified, requesting document.')
      theEditor.disableDiffSending()
      theEditor.askForDocument();
      return false
    } else {
        theEditor.checkDiffVersion()
        return false
    }
}

theEditor.currentlyCheckingVersion = false

theEditor.cancelCurrentlyCheckingVersion = function() {
    theEditor.currentlyCheckingVersion = false
    clearTimeout(theEditor.enableCheckDiffVersion)
}

theEditor.checkDiffVersion = function() {
    if (theEditor.currentlyCheckingVersion) {
        return
    }
    theEditor.currentlyCheckingVersion = true
    theEditor.enableCheckDiffVersion = setTimeout(function(){
        theEditor.currentlyCheckingVersion = false
    }, 1000)
    if (theEditor.connected) {
        theEditor.disableDiffSending()
    }
    serverCommunications.send({
      type: 'check_diff_version',
      diff_version: theEditor.editor.mod.collab.version
    })
}

theEditor.awaitingDiffResponse = false

theEditor.disableDiffSending = function() {
    theEditor.awaitingDiffResponse = true
    // If no answer has been received from the server within 2 seconds, check the version
    theEditor.checkDiffVersionTimer = setTimeout(function(){
        theEditor.awaitingDiffResponse = false
        theEditor.sendToCollaborators()
        theEditor.checkDiffVersion()
    }, 2000)
}

theEditor.enableDiffSending = function() {
    clearTimeout(theEditor.checkDiffVersionTimer)
    theEditor.awaitingDiffResponse = false
    theEditor.sendToCollaborators()
}

// Things to be executed on every editor transform.
theEditor.onTransform = function(transform) {
  var updateBibliography = false
  // Check what area is affected
  transform.steps.forEach(function(step, index){
      if (step.type==='replace' && step.from.cmp(step.to) !== 0) {
          transform.docs[index].inlineNodesBetween(step.from, step.to, function(node) {
              if (node.type.name==='citation') {
                  // A citation was replaced
                  updateBibliography = true
              }
          })
      }
  })

  if (updateBibliography) {
      // Recreate the bibliography on next flush.
      scheduleDOMUpdate(theEditor.editor, citationHelpers.formatCitationsInDoc)
  }


}

window.theEditor = theEditor
