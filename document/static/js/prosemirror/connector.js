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

	function makeEditor(where, doc) {
	  return new pm.ProseMirror({
	    place: where,
	    schema: fidusSchema,
	    doc: doc,
	    menuBar: true
	  });
	};

	theEditor.loadDocument = function (aDocument) {
	  var editorNode = document.createElement('div'),
	      titleNode = exporter.obj2Node(aDocument.metadata.title),
	      metadataNode = document.createElement('div'),
	      documentContentsNode = exporter.obj2Node(aDocument.contents),
	      metadataSubtitleNode = aDocument.metadata.subtitle ? exporter.obj2Node(aDocument.metadata.subtitle) : document.createElement('div'),
	      metadataAuthorsNode = aDocument.metadata.authors ? exporter.obj2Node(aDocument.metadata.authors) : document.createElement('div'),
	      metadataAbstractNode = aDocument.metadata.abstract ? exporter.obj2Node(aDocument.metadata.abstract) : document.createElement('div'),
	      metadataKeywordsNode = aDocument.metadata.keywords ? exporter.obj2Node(aDocument.metadata.keywords) : document.createElement('div');

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

	  //      console.log(editorNode.innerHTML)

	  var doc = pm.fromDOM(fidusSchema, editorNode);
	  theEditor.editor = makeEditor(document.getElementById('document-editable'), doc);

	  var editorTools = document.getElementById('editor-tools-wrapper');
	  //editorTools.innerHTML = '';
	  //editorTools.appendChild(document.querySelector('.ProseMirror-menubar'));
	};

	theEditor.fromDOM = pm.fromDOM;
	theEditor.schema = fidusSchema;

	window.theEditor = theEditor;



/***/ }
/******/ ]);