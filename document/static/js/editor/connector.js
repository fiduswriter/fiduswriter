/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit connector.es6.js and run ./es6-compiler.sh */
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	'use strict';

	/* Functions for ProseMirror integration.*/

	var theEditor = {};

	function makeEditor(where, doc, version) {
	    return new pm.ProseMirror({
	        place: where,
	        schema: fidusSchema,
	        doc: doc,
	        menuBar: true,
	        collab: { version: version }
	    });
	};

	theEditor.createDoc = function (aDocument) {
	    var editorNode = document.createElement('div'),
	        titleNode = aDocument.metadata.title ? exporter.obj2Node(aDocument.metadata.title) : document.createElement('div'),
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

	    doc = pm.fromDOM(fidusSchema, editorNode);

	    return doc;
	};

	theEditor.initiate = function (aDocument) {
	    var doc = theEditor.createDoc(aDocument);
	    theEditor.editor = makeEditor(document.getElementById('document-editable'), doc, aDocument.version);
	    new UpdateUI(theEditor.editor, "selectionChange change activeMarkChange");
	    theEditor.editor.on('change', editorHelpers.documentHasChanged);
	    theEditor.editor.mod.collab.on('mustSend', theEditor.sendToCollaborators);
	};

	theEditor.update = function (aDocument) {
	    var doc = theEditor.createDoc(aDocument);
	    theEditor.editor.setOption("collab", null);
	    theEditor.editor.setContent(doc);
	    theEditor.editor.setOption("collab", { version: aDocument.version });
	    theEditor.editor.mod.collab.on('mustSend', theEditor.sendToCollaborators);
	};

	theEditor.getUpdates = function (callback) {
	    var outputNode = pm.serializeTo(theEditor.editor.mod.collab.versionDoc, 'dom');
	    theDocument.title = theEditor.editor.doc.firstChild.textContent;
	    theDocument.version = theEditor.editor.mod.collab.version;
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

	theEditor.unconfirmedSteps = {};

	var confirmStepsRequestCounter = 0;

	theEditor.sendToCollaborators = function () {
	    console.log('send to collabs');
	    var toSend = theEditor.editor.mod.collab.sendableSteps();
	    var request_id = confirmStepsRequestCounter++;
	    var aPackage = {
	        type: 'diff',
	        version: theEditor.editor.mod.collab.version,
	        diff: toSend.steps.map(function (s) {
	            return s.toJSON();
	        }),
	        request_id: request_id
	    };
	    serverCommunications.send(aPackage);
	    theEditor.unconfirmedSteps[request_id] = toSend;
	};

	theEditor.confirmDiff = function (request_id) {
	    console.log('confirming steps');
	    var sentSteps = theEditor.unconfirmedSteps[request_id];
	    theEditor.editor.mod.collab.confirmSteps(sentSteps);
	};

	theEditor.applyDiffs = function (aPackage) {
	    theEditor.editor.mod.collab.receive(aPackage.diff.map(function (j) {
	        return pm.Step.fromJSON(fidusSchema, j);
	    }));
	};

	theEditor.startCollaborativeMode = function () {
	    theDocumentValues.collaborativeMode = true;
	};

	theEditor.stopCollaborativeMode = function () {
	    theDocumentValues.collaborativeMode = false;
	};

	theEditor.getHash = function () {
	    var string = theEditor.editor.getContent('html');
	    var len = string.length;
	    var hash = 0,
	        char,
	        i;
	    if (len == 0) return hash;
	    for (i = 0; i < len; i++) {
	        char = string.charCodeAt(i);
	        hash = (hash << 5) - hash + char;
	        hash = hash & hash;
	    }
	    return hash;
	};

	theEditor.checkHash = function (hash) {
	    console.log('Verifying hash');
	    if (hash === theEditor.getHash()) {
	        console.log('Hash could be verified');
	        return true;
	    }
	    console.log('Hash could not be verified, requesting document.');
	    serverCommunications.send({ type: 'get_document_update' });
	    return false;
	};

	theEditor.fromDOM = pm.fromDOM;
	theEditor.schema = fidusSchema;

	window.theEditor = theEditor;



/***/ }
/******/ ]);