/* Functions for ProseMirror integration.*/

var theEditor = {};

function makeEditor (where, doc) {
  return new pm.ProseMirror({
    place: where,
    schema: fidusSchema,
    doc: doc,
    menuBar: true,
    collab: {version: 0}
  })
};


theEditor.createDoc = function (aDocument) {
    var editorNode = document.createElement('div'),
      titleNode = exporter.obj2Node(aDocument.metadata.title),
      metadataNode = document.createElement('div'),
      documentContentsNode = exporter.obj2Node(aDocument.contents),
      metadataSubtitleNode = aDocument.metadata.subtitle ? exporter.obj2Node(aDocument.metadata.subtitle) : document.createElement('div'),
      metadataAuthorsNode = aDocument.metadata.authors ? exporter.obj2Node(aDocument.metadata.authors) : document.createElement('div'),
      metadataAbstractNode = aDocument.metadata.abstract ? exporter.obj2Node(aDocument.metadata.abstract) : document.createElement('div'),
      metadataKeywordsNode = aDocument.metadata.keywords ? exporter.obj2Node(aDocument.metadata.keywords) : document.createElement('div'),
      doc;

      titleNode.id = 'document-title';
      metadataNode.id = 'document-metadata';
      metadataSubtitleNode.id = 'metadata-subtitle';
      metadataAuthorsNode.id = 'metadata-authors';
      metadataAbstractNode.id = 'metadata-abstract';
      metadataKeywordsNode.id = 'metadata-keywords';
      documentContentsNode.id = 'document-contents';

      editorNode.appendChild(titleNode);
      metadataNode.appendChild(metadataSubtitleNode);
      metadataNode.appendChild(metadataAuthorsNode);
      metadataNode.appendChild(metadataAbstractNode);
      metadataNode.appendChild(metadataKeywordsNode);
      editorNode.appendChild(metadataNode);
      editorNode.appendChild(documentContentsNode);

      doc = pm.fromDOM(fidusSchema, editorNode)

      return doc;
};

theEditor.initiate = function (aDocument) {
      let doc = theEditor.createDoc(aDocument);
      theEditor.editor = makeEditor(document.getElementById('document-editable'), doc);
      new UpdateUI(theEditor.editor, "selectionChange change activeMarkChange");
      theEditor.editor.on('change', editorHelpers.documentHasChanged);
      theEditor.editor.mod.collab.on('mustSend', theEditor.sendToCollaborators);
};

theEditor.update = function (aDocument) {
      let doc = theEditor.createDoc(aDocument);
      theEditor.editor.setOption("collab", null)
      theEditor.editor.setContent(doc);
      theEditor.editor.setOption("collab", {version: 0})
      theEditor.editor.mod.collab.on('mustSend', theEditor.sendToCollaborators);
};

theEditor.getUpdates = function (callback) {
      var outputNode = theEditor.editor.getContent('dom');
      theDocument.title = theEditor.editor.doc.firstChild.textContent;
      theDocument.metadata.title = exporter.node2Obj(outputNode.getElementById('document-title'));
      theDocument.metadata.subtitle = exporter.node2Obj(outputNode.getElementById('metadata-subtitle'));
      theDocument.metadata.authors = exporter.node2Obj(outputNode.getElementById('metadata-authors'));
      theDocument.metadata.abstract = exporter.node2Obj(outputNode.getElementById('metadata-abstract'));
      theDocument.metadata.keywords = exporter.node2Obj(outputNode.getElementById('metadata-keywords'));
      theDocument.contents = exporter.node2Obj(outputNode.getElementById('document-contents'));

      if (callback) {
          callback();
      }
};

theEditor.sendToCollaborators = function () {
    console.log('send to collabs')
      let pm = theEditor.editor
      let toSend = pm.mod.collab.sendableSteps()
      if (theDocumentValues.collaborativeMode) {
          let aPackage = {
              type: 'diff',
              time: new Date().getTime() + window.clientOffsetTime,
              diff: toSend.steps.map(s => s.toJSON())
          }
          serverCommunications.send(aPackage);
      }

      pm.mod.collab.confirmSteps(toSend)
    };

theEditor.applyDiffs = function(aPackage) {
    theEditor.editor.mod.collab.receive(aPackage.diff.map(j => pm.Step.fromJSON(fidusSchema, j)));
}


theEditor.startCollaborativeMode = function () {
    theDocumentValues.collaborativeMode = true;
};

theEditor.stopCollaborativeMode = function () {
    theDocumentValues.collaborativeMode = false;
};

theEditor.getHash = function () {
    let string = theEditor.editor.getContent('html')
    let len = string.length
    var hash = 0, char, i;
    if (len == 0) return hash;
    for (i = 0; i < len; i++) {
        char = string.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash;
    }
    return hash;
};

theEditor.checkHash = function(hash) {
    console.log('Verifying hash')
    if (hash===theEditor.getHash()) {
        console.log('Hash could be verified');
        return true;
    }
    console.log('Hash could not be verified, requesting document.');
    serverCommunications.send({type: 'get_document_update'});
    return false;
}

theEditor.fromDOM = pm.fromDOM;
theEditor.schema = fidusSchema;

window.theEditor = theEditor;
