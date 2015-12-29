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
	    if (dom.id !== 'document-title') return false;
	    state.wrapIn(dom, this);
	  }
	});

	Title.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("div", {
	    id: 'document-title'
	  });
	  serializer.renderContent(node, dom);
	  return dom;
	};

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
	    if (dom.id !== 'document-metadata') return false;
	    state.wrapIn(dom, this);
	  }
	});

	MetaData.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("div", {
	    id: 'document-metadata'
	  });
	  serializer.renderContent(node, dom);
	  return dom;
	};

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
	    if (dom.id !== 'metadata-subtitle') return false;
	    state.wrapIn(dom, this);
	  }
	});

	MetaDataSubtitle.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("div", {
	    id: 'metadata-subtitle'
	  });
	  serializer.renderContent(node, dom);
	  return dom;
	};

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
	    if (dom.id !== 'metadata-authors') return false;
	    state.wrapIn(dom, this);
	  }
	});

	MetaDataAuthors.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("div", {
	    id: 'metadata-authors'
	  });
	  serializer.renderContent(node, dom);
	  return dom;
	};

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
	    if (dom.id !== 'metadata-abstract') return false;
	    state.wrapIn(dom, this);
	  }
	});

	MetaDataAbstract.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("div", {
	    id: 'metadata-abstract'
	  });
	  serializer.renderContent(node, dom);
	  return dom;
	};

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
	    if (dom.id !== 'metadata-keywords') return false;
	    state.wrapIn(dom, this);
	  }
	});

	MetaDataKeywords.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("div", {
	    id: 'metadata-keywords'
	  });
	  serializer.renderContent(node, dom);
	  return dom;
	};

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
	    if (dom.id !== 'document-contents') return false;
	    state.wrapIn(dom, this);
	  }
	});

	DocumentContents.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("div", {
	    id: 'document-contents'
	  });
	  serializer.renderContent(node, dom);
	  return dom;
	};

	var Footnote = (function (_pm$Inline) {
	  _inherits(Footnote, _pm$Inline);

	  function Footnote() {
	    _classCallCheck(this, Footnote);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(Footnote).apply(this, arguments));
	  }

	  return Footnote;
	})(pm.Inline);

	Footnote.register("parseDOM", {
	  tag: "span",
	  parse: function parse(dom, state) {
	    if (!dom.classList.contains('footnote')) return false;
	    state.wrapIn(dom, this); // Doesn't currently work, see https://github.com/ProseMirror/prosemirror/issues/109
	  }
	});

	Footnote.register("parseDOM", {
	  tag: "span",
	  parse: function parse(dom, state) {
	    if (!dom.classList.contains('pagination-footnote')) return false;
	    state.wrapIn(dom.firstChild.firstChild, this);
	  }
	});

	Footnote.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("span", {
	    class: 'pagination-footnote'
	  });
	  dom.appendChild(serializer.elt("span"));
	  dom.firstChild.appendChild(serializer.elt("span"));
	  serializer.renderContent(node, dom.firstChild.firstChild);
	  return dom;
	};

	var Citation = (function (_pm$Inline2) {
	  _inherits(Citation, _pm$Inline2);

	  function Citation() {
	    _classCallCheck(this, Citation);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(Citation).apply(this, arguments));
	  }

	  return Citation;
	})(pm.Inline);

	Citation.register("parseDOM", {
	  tag: "span",
	  parse: function parse(dom, state) {
	    if (!dom.classList.contains('citation')) return false;
	    state.insertFrom(dom, this, {
	      bibFormat: dom.getAttribute('data-bib-format'),
	      bibEntry: dom.getAttribute('data-bib-entry'),
	      bibBefore: dom.getAttribute('data-bib-before'),
	      bibPage: dom.getAttribute('data-bib-page')
	    });
	  }
	});

	Citation.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("span", {
	    class: 'citation',
	    dataBibFormat: node.attrs.bibFormat,
	    dataBibEntry: node.attrs.bibEntry,
	    dataBibBefore: node.attrs.bibBefore,
	    dataBibPage: node.attrs.bibPage
	  });
	  return dom;
	};

	var Equation = (function (_pm$Inline3) {
	  _inherits(Equation, _pm$Inline3);

	  function Equation() {
	    _classCallCheck(this, Equation);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(Equation).apply(this, arguments));
	  }

	  return Equation;
	})(pm.Inline);

	Equation.register("parseDOM", {
	  tag: "span",
	  parse: function parse(dom, state) {
	    if (!dom.classList.contains('equation')) return false;
	    state.insertFrom(dom, this, {
	      equation: dom.getAttribute('data-equation')
	    });
	  }
	});

	Equation.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("span", {
	    class: 'equation',
	    dataEquation: node.attrs.equation
	  });
	  return dom;
	};

	var Figure = (function (_pm$Block4) {
	  _inherits(Figure, _pm$Block4);

	  function Figure() {
	    _classCallCheck(this, Figure);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(Figure).apply(this, arguments));
	  }

	  return Figure;
	})(pm.Block);

	Figure.register("parseDOM", {
	  tag: "figure",
	  parse: function parse(dom, state) {
	    state.insertFrom(dom, this, {
	      equation: dom.getAttribute('data-equation'),
	      image: dom.getAttribute('data-image'),
	      figureCategory: dom.getAttribute('data-figure-category'),
	      caption: dom.getAttribute('data-caption')
	    });
	  }
	});

	Figure.prototype.serializeDOM = function (node, serializer) {
	  var dom = serializer.elt("figure", {
	    dataEquation: node.attrs.equation,
	    dataImage: node.attrs.image,
	    dataFigureCategory: node.attrs.figureCategory,
	    dataCaption: node.attrs.caption
	  });
	  if (node.attrs.image.length > 0) {
	    dom.appendChild(serializer.elt("div"));
	    dom.firstChild.appendChild(serializer.elt("img", {
	      "src": ImageDB[node.attrs.image].image
	    }));
	  } else {
	    dom.appendChild(serializer.elt("div", {
	      class: 'figure-equation',
	      dataEquation: node.attrs.equation
	    }));
	  }
	  var captionNode = serializer.elt("figcaption");
	  if (node.attrs.figureCategory !== 'none') {
	    var figureCatNode = serializer.elt("span", {
	      class: 'figure-cat-' + node.attrs.figureCategory,
	      dataFigureCategory: node.attrs.figureCategory
	    });
	    figureCatNode.innerHTML = node.attrs.figureCategory;
	    captionNode.appendChild(figureCatNode);
	  }
	  if (node.attrs.figureCaption !== '') {
	    var captionTextNode = serializer.elt("span", {
	      dataCaption: node.attrs.figureCaption
	    });
	    captionTextNode.innerHTML = node.attrs.figureCaption;

	    captionNode.appendChild(captionTextNode);
	  }
	  dom.appendChild(captionNode);
	  return dom;
	};

	var fidusSchema = new pm.Schema(pm.defaultSchema.spec.update({
	  title: Title,
	  metadata: MetaData,
	  metadatasubtitle: MetaDataSubtitle,
	  metadataauthors: MetaDataAuthors,
	  metadataabstract: MetaDataAbstract,
	  metadatakeywords: MetaDataKeywords,
	  documentcontents: DocumentContents,
	  footnote: Footnote,
	  citation: Citation,
	  equation: Equation,
	  figure: Figure
	}));

	window.fidusSchema = fidusSchema;



/***/ }
/******/ ]);