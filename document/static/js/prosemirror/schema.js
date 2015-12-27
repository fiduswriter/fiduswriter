/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit schema.es6.js and run ./es6-compiler.sh */
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

	"use strict";

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var Title = (function (_pm$Textblock) {
	  _inherits(Title, _pm$Textblock);

	  function Title() {
	    _classCallCheck(this, Title);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(Title).apply(this, arguments));
	  }

	  return Title;
	})(pm.Textblock);

	Title.register("parseDOM", {
	  tag: "div",
	  parse: function parse(dom, state) {
	    if (!dom.id === 'document-title') return false;
	    state.wrapIn(dom, this);
	  }
	});

	var MetaData = (function (_pm$Block) {
	  _inherits(MetaData, _pm$Block);

	  function MetaData() {
	    _classCallCheck(this, MetaData);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(MetaData).apply(this, arguments));
	  }

	  return MetaData;
	})(pm.Block);

	MetaData.register("parseDOM", {
	  tag: "div",
	  parse: function parse(dom, state) {
	    if (!dom.id === 'document-metadata') return false;
	    state.wrapIn(dom, this);
	  }
	});

	var MetaDataSubtitle = (function (_pm$Textblock2) {
	  _inherits(MetaDataSubtitle, _pm$Textblock2);

	  function MetaDataSubtitle() {
	    _classCallCheck(this, MetaDataSubtitle);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(MetaDataSubtitle).apply(this, arguments));
	  }

	  return MetaDataSubtitle;
	})(pm.Textblock);

	MetaDataSubtitle.register("parseDOM", {
	  tag: "div",
	  parse: function parse(dom, state) {
	    if (!dom.id === 'metadata-subtitle') return false;
	    state.wrapIn(dom, this);
	  }
	});

	var MetaDataAuthors = (function (_pm$Textblock3) {
	  _inherits(MetaDataAuthors, _pm$Textblock3);

	  function MetaDataAuthors() {
	    _classCallCheck(this, MetaDataAuthors);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(MetaDataAuthors).apply(this, arguments));
	  }

	  return MetaDataAuthors;
	})(pm.Textblock);

	MetaDataAuthors.register("parseDOM", {
	  tag: "div",
	  parse: function parse(dom, state) {
	    if (!dom.id === 'metadata-authors') return false;
	    state.wrapIn(dom, this);
	  }
	});

	var MetaDataAbstract = (function (_pm$Block2) {
	  _inherits(MetaDataAbstract, _pm$Block2);

	  function MetaDataAbstract() {
	    _classCallCheck(this, MetaDataAbstract);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(MetaDataAbstract).apply(this, arguments));
	  }

	  return MetaDataAbstract;
	})(pm.Block);

	MetaDataAbstract.register("parseDOM", {
	  tag: "div",
	  parse: function parse(dom, state) {
	    if (!dom.id === 'metadata-abstract') return false;
	    state.wrapIn(dom, this);
	  }
	});

	var MetaDataKeywords = (function (_pm$Textblock4) {
	  _inherits(MetaDataKeywords, _pm$Textblock4);

	  function MetaDataKeywords() {
	    _classCallCheck(this, MetaDataKeywords);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(MetaDataKeywords).apply(this, arguments));
	  }

	  return MetaDataKeywords;
	})(pm.Textblock);

	MetaDataKeywords.register("parseDOM", {
	  tag: "div",
	  parse: function parse(dom, state) {
	    if (!dom.id === 'metadata-keywords') return false;
	    state.wrapIn(dom, this);
	  }
	});

	var DocumentContents = (function (_pm$Block3) {
	  _inherits(DocumentContents, _pm$Block3);

	  function DocumentContents() {
	    _classCallCheck(this, DocumentContents);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(DocumentContents).apply(this, arguments));
	  }

	  return DocumentContents;
	})(pm.Block);

	DocumentContents.register("parseDOM", {
	  tag: "div",
	  parse: function parse(dom, state) {
	    if (!dom.id === 'document-contents') return false;
	    state.wrapIn(dom, this);
	  }
	});

	var fidusSchema = new pm.Schema(pm.defaultSchema.spec.update({
	  title: Title,
	  metadata: MetaData,
	  metadatasubtitle: MetaDataSubtitle,
	  metadataauthors: MetaDataAuthors,
	  metadataabstract: MetaDataAbstract,
	  metadatakeywords: MetaDataKeywords,
	  documentcontents: DocumentContents
	}));

	window.fidusSchema = fidusSchema;



/***/ }
/******/ ]);