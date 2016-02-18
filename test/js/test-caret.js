/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit test-caret.es6.js and run ./es6-compiler.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.elt = elt;
exports.requestAnimationFrame = requestAnimationFrame;
exports.contains = contains;
exports.insertCSS = insertCSS;
exports.ensureCSSAdded = ensureCSSAdded;
function elt(tag, attrs) {
  var result = document.createElement(tag);
  if (attrs) for (var name in attrs) {
    if (name == "style") result.style.cssText = attrs[name];else if (attrs[name] != null) result.setAttribute(name, attrs[name]);
  }

  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  for (var i = 0; i < args.length; i++) {
    add(args[i], result);
  }return result;
}

function add(value, target) {
  if (typeof value == "string") value = document.createTextNode(value);

  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      add(value[i], target);
    }
  } else {
    target.appendChild(value);
  }
}

var reqFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

function requestAnimationFrame(f) {
  if (reqFrame) reqFrame(f);else setTimeout(f, 10);
}

var ie_upto10 = /MSIE \d/.test(navigator.userAgent);
var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);

var browser = exports.browser = {
  mac: /Mac/.test(navigator.platform),
  ie_upto10: ie_upto10,
  ie_11up: ie_11up,
  ie: ie_upto10 || ie_11up,
  gecko: /gecko\/\d/i.test(navigator.userAgent)
};

// : (DOMNode, DOMNode) → bool
// Check whether a DOM node is an ancestor of another DOM node.
function contains(parent, child) {
  // Android browser and IE will return false if child is a text node.
  if (child.nodeType != 1) child = child.parentNode;
  return child && parent.contains(child);
}

var accumulatedCSS = "",
    cssNode = null;

function insertCSS(css) {
  if (cssNode) cssNode.textContent += css;else accumulatedCSS += css;
}

// This is called when a ProseMirror instance is created, to ensure
// the CSS is in the DOM.
function ensureCSSAdded() {
  if (!cssNode) {
    cssNode = document.createElement("style");
    cssNode.textContent = "/* ProseMirror CSS */\n" + accumulatedCSS;
    document.head.insertBefore(cssNode, document.head.firstChild);
  }
}
},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pathFromDOM = pathFromDOM;
exports.widthFromDOM = widthFromDOM;
exports.posFromDOM = posFromDOM;
exports.findByPath = findByPath;
exports.pathToDOM = pathToDOM;
exports.childContainer = childContainer;
exports.DOMFromPos = DOMFromPos;
exports.scrollIntoView = scrollIntoView;
exports.posAtCoords = posAtCoords;
exports.coordsAtPos = coordsAtPos;
exports.setDOMSelectionToPos = setDOMSelectionToPos;
exports.selectableNodeAbove = selectableNodeAbove;
exports.handleNodeClick = handleNodeClick;

var _model = require("../model");

var _dom = require("../dom");

var _error = require("../util/error");

// : (ProseMirror, DOMNode) → [number]
// Get the path for a given a DOM node in a document.
function pathFromDOM(pm, node) {
  var path = [];
  for (; node != pm.content;) {
    var attr = node.getAttribute("pm-offset");
    if (attr) path.unshift(+attr);
    node = node.parentNode;
  }
  return path;
}

function widthFromDOM(dom) {
  var attr = dom.getAttribute("pm-leaf");
  return attr && attr != "true" ? +attr : 1;
}

function posFromDOM(pm, dom, domOffset, loose) {
  if (!loose && pm.operation && pm.doc != pm.operation.doc) _error.AssertionError.raise("Fetching a position from an outdated DOM structure");

  if (domOffset == null) {
    domOffset = Array.prototype.indexOf.call(dom.parentNode.childNodes, dom);
    dom = dom.parentNode;
  }

  var extraOffset = 0,
      tag = undefined;
  for (;;) {
    var adjust = 0;
    if (dom.nodeType == 3) {
      extraOffset += domOffset;
    } else if (dom.hasAttribute("pm-container")) {
      break;
    } else if (tag = dom.getAttribute("pm-inner-offset")) {
      extraOffset += +tag;
      adjust = -1;
    } else if (domOffset && domOffset == dom.childNodes.length) {
      adjust = 1;
    }

    var parent = dom.parentNode;
    domOffset = adjust < 0 ? 0 : Array.prototype.indexOf.call(parent.childNodes, dom) + adjust;
    dom = parent;
  }

  var path = pathFromDOM(pm, dom);
  if (dom.hasAttribute("pm-leaf")) return _model.Pos.from(path, extraOffset + (domOffset ? 1 : 0));

  var offset = 0;
  for (var i = domOffset - 1; i >= 0; i--) {
    var child = dom.childNodes[i];
    if (child.nodeType == 3) {
      if (loose) extraOffset += child.nodeValue.length;
    } else if (tag = child.getAttribute("pm-offset")) {
      offset = +tag + widthFromDOM(child);
      break;
    } else if (loose && !child.hasAttribute("pm-ignore")) {
      extraOffset += child.textContent.length;
    }
  }
  return new _model.Pos(path, offset + extraOffset);
}

// : (DOMNode, number, ?bool)
// Get a child node of a parent node at a given offset.
function findByPath(node, n, fromEnd) {
  var container = childContainer(node);
  for (var ch = fromEnd ? container.lastChild : container.firstChild; ch; ch = fromEnd ? ch.previousSibling : ch.nextSibling) {
    if (ch.nodeType != 1) continue;
    var offset = ch.getAttribute("pm-offset");
    if (offset && +offset == n) return ch;
  }
}

// : (DOMNode, [number]) → DOMNode
// Get a descendant node at a path relative to an ancestor node.
function pathToDOM(parent, path) {
  var node = parent;
  for (var i = 0; i < path.length; i++) {
    node = findByPath(node, path[i]);
    if (!node) _error.AssertionError.raise("Failed to resolve path " + path.join("/"));
  }
  return node;
}

function childContainer(dom) {
  return dom.hasAttribute("pm-container") ? dom : dom.querySelector("[pm-container]");
}

function findByOffset(node, offset, after) {
  for (var ch = node.firstChild, i = 0, attr; ch; ch = ch.nextSibling, i++) {
    if (ch.nodeType == 1 && (attr = ch.getAttribute("pm-offset"))) {
      var diff = offset - +attr,
          width = widthFromDOM(ch);
      if (diff >= 0 && (after ? diff <= width : diff < width)) return { node: ch, offset: i, innerOffset: diff };
    }
  }
}

function leafAt(node, offset) {
  for (;;) {
    var child = node.firstChild;
    if (!child) return { node: node, offset: offset };
    if (child.nodeType != 1) return { node: child, offset: offset };
    if (child.hasAttribute("pm-inner-offset")) {
      var nodeOffset = 0;
      for (;;) {
        var nextSib = child.nextSibling,
            nextOffset = undefined;
        if (!nextSib || (nextOffset = +nextSib.getAttribute("pm-inner-offset")) >= offset) break;
        child = nextSib;
        nodeOffset = nextOffset;
      }
      offset -= nodeOffset;
    }
    node = child;
  }
}

// Get a DOM element at a given position in the document.
function DOMFromPos(parent, pos) {
  var dom = childContainer(pathToDOM(parent, pos.path));
  var found = findByOffset(dom, pos.offset, true),
      inner = undefined;
  if (!found) return { node: dom, offset: 0 };
  if (found.node.getAttribute("pm-leaf") == "true" || !(inner = leafAt(found.node, found.innerOffset))) return { node: found.node.parentNode, offset: found.offset + (found.innerOffset ? 1 : 0) };else return inner;
}

function windowRect() {
  return { left: 0, right: window.innerWidth,
    top: 0, bottom: window.innerHeight };
}

var scrollMargin = 5;

function scrollIntoView(pm, pos) {
  if (!pos) pos = pm.sel.range.head || pm.sel.range.from;
  var coords = coordsAtPos(pm, pos);
  for (var parent = pm.content;; parent = parent.parentNode) {
    var atBody = parent == document.body;
    var rect = atBody ? windowRect() : parent.getBoundingClientRect();
    var moveX = 0,
        moveY = 0;
    if (coords.top < rect.top) moveY = -(rect.top - coords.top + scrollMargin);else if (coords.bottom > rect.bottom) moveY = coords.bottom - rect.bottom + scrollMargin;
    if (coords.left < rect.left) moveX = -(rect.left - coords.left + scrollMargin);else if (coords.right > rect.right) moveX = coords.right - rect.right + scrollMargin;
    if (moveX || moveY) {
      if (atBody) {
        window.scrollBy(moveX, moveY);
      } else {
        if (moveY) parent.scrollTop += moveY;
        if (moveX) parent.scrollLeft += moveX;
      }
    }
    if (atBody) break;
  }
}

function findOffsetInNode(node, coords) {
  var closest = undefined,
      dyClosest = 1e8,
      coordsClosest = undefined,
      offset = 0;
  for (var child = node.firstChild; child; child = child.nextSibling) {
    var rects = undefined;
    if (child.nodeType == 1) rects = child.getClientRects();else if (child.nodeType == 3) rects = textRects(child);else continue;

    for (var i = 0; i < rects.length; i++) {
      var rect = rects[i];
      if (rect.left <= coords.left && rect.right >= coords.left) {
        var dy = rect.top > coords.top ? rect.top - coords.top : rect.bottom < coords.top ? coords.top - rect.bottom : 0;
        if (dy < dyClosest) {
          // FIXME does not group by row
          closest = child;
          dyClosest = dy;
          coordsClosest = dy ? { left: coords.left, top: rect.top } : coords;
          if (child.nodeType == 1 && !child.firstChild) offset = i + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0);
          continue;
        }
      }
      if (!closest && (coords.top >= rect.bottom || coords.top >= rect.top && coords.left >= rect.right)) offset = i + 1;
    }
  }
  if (!closest) return { node: node, offset: offset };
  if (closest.nodeType == 3) return findOffsetInText(closest, coordsClosest);
  if (closest.firstChild) return findOffsetInNode(closest, coordsClosest);
  return { node: node, offset: offset };
}

function findOffsetInText(node, coords) {
  var len = node.nodeValue.length;
  var range = document.createRange();
  for (var i = 0; i < len; i++) {
    range.setEnd(node, i + 1);
    range.setStart(node, i);
    var rect = range.getBoundingClientRect();
    if (rect.top == rect.bottom) continue;
    if (rect.left <= coords.left && rect.right >= coords.left && rect.top <= coords.top && rect.bottom >= coords.top) return { node: node, offset: i + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0) };
  }
  return { node: node, offset: 0 };
}

// Given an x,y position on the editor, get the position in the document.
function posAtCoords(pm, coords) {
  var elt = document.elementFromPoint(coords.left, coords.top + 1);
  if (!(0, _dom.contains)(pm.content, elt)) return null;

  if (!elt.firstChild) elt = elt.parentNode;

  var _findOffsetInNode = findOffsetInNode(elt, coords);

  var node = _findOffsetInNode.node;
  var offset = _findOffsetInNode.offset;

  return posFromDOM(pm, node, offset);
}

function textRect(node, from, to) {
  var range = document.createRange();
  range.setEnd(node, to);
  range.setStart(node, from);
  return range.getBoundingClientRect();
}

function textRects(node) {
  var range = document.createRange();
  range.setEnd(node, node.nodeValue.length);
  range.setStart(node, 0);
  return range.getClientRects();
}

// Given a position in the document model, get a bounding box of the character at
// that position, relative to the window.
function coordsAtPos(pm, pos) {
  var _DOMFromPos = DOMFromPos(pm.content, pos);

  var node = _DOMFromPos.node;
  var offset = _DOMFromPos.offset;

  var side = undefined,
      rect = undefined;
  if (node.nodeType == 3) {
    if (offset < node.nodeValue.length) {
      rect = textRect(node, offset, offset + 1);
      side = "left";
    }
    if ((!rect || rect.left == rect.right) && offset) {
      rect = textRect(node, offset - 1, offset);
      side = "right";
    }
  } else if (node.firstChild) {
    if (offset < node.childNodes.length) {
      var child = node.childNodes[offset];
      rect = child.nodeType == 3 ? textRect(child, 0, child.nodeValue.length) : child.getBoundingClientRect();
      side = "left";
    }
    if ((!rect || rect.left == rect.right) && offset) {
      var child = node.childNodes[offset - 1];
      rect = child.nodeType == 3 ? textRect(child, 0, child.nodeValue.length) : child.getBoundingClientRect();
      side = "right";
    }
  } else {
    rect = node.getBoundingClientRect();
    side = "left";
  }
  var x = rect[side];
  return { top: rect.top, bottom: rect.bottom, left: x, right: x };
}

function setDOMSelectionToPos(pm, pos) {
  var _DOMFromPos2 = DOMFromPos(pm.content, pos);

  var node = _DOMFromPos2.node;
  var offset = _DOMFromPos2.offset;

  var range = document.createRange();
  range.setEnd(node, offset);
  range.setStart(node, offset);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// ;; #path=NodeType #kind=class #noAnchor
// You can add several properties to [node types](#NodeType) to
// influence the way the editor interacts with them.

// :: (node: Node, path: [number], dom: DOMNode, coords: {left: number, top: number}) → ?Pos
// #path=NodeType.prototype.countCoordsAsChild
// Specifies that, if this node is clicked, a child node might
// actually be meant. This is used to, for example, make clicking a
// list marker (which, in the DOM, is part of the list node) select
// the list item it belongs to. Should return null if the given
// coordinates don't refer to a child node, or the [position](#Pos)
// before the child otherwise.

function selectableNodeAbove(pm, dom, coords, liberal) {
  for (; dom && dom != pm.content; dom = dom.parentNode) {
    if (dom.hasAttribute("pm-offset")) {
      var path = pathFromDOM(pm, dom),
          node = pm.doc.path(path);
      if (node.type.countCoordsAsChild) {
        var result = node.type.countCoordsAsChild(node, path, dom, coords);
        if (result) return result;
      }
      // Leaf nodes are implicitly clickable
      if ((liberal || node.type.contains == null) && node.type.selectable) return _model.Pos.from(path);
      if (!liberal) return null;
    }
  }
}

// :: (pm: ProseMirror, event: MouseEvent, path: [number], node: Node) → bool
// #path=NodeType.prototype.handleClick
// If a node is directly clicked (that is, the click didn't land in a
// DOM node belonging to a child node), and its type has a
// `handleClick` method, that method is given a chance to handle the
// click. The method is called, and should return `false` if it did
// _not_ handle the click.
//
// The `event` passed is the event for `"mousedown"`, but calling
// `preventDefault` on it has no effect, since this method is only
// called after a corresponding `"mouseup"` has occurred and
// ProseMirror has determined that this is not a drag or multi-click
// event.

// :: (pm: ProseMirror, event: MouseEvent, path: [number], node: Node) → bool
// #path=NodeType.prototype.handleContextMenu
//
// When the [context
// menu](https://developer.mozilla.org/en-US/docs/Web/Events/contextmenu)
// is activated in the editable context, nodes that the clicked
// position falls inside of get a chance to react to it. Node types
// may define a `handleContextMenu` method, which will be called when
// present, first on inner nodes and then up the document tree, until
// one of the methods returns something other than `false`.
//
// The handlers can inspect `event.target` to figure out whether they
// were directly clicked, and may call `event.preventDefault()` to
// prevent the native context menu.

function handleNodeClick(pm, type, event, direct) {
  for (var dom = event.target; dom && dom != pm.content; dom = dom.parentNode) {
    if (dom.hasAttribute("pm-offset")) {
      var path = pathFromDOM(pm, dom),
          node = pm.doc.path(path);
      var handled = node.type[type] && node.type[type](pm, event, path, node) !== false;
      if (direct || handled) return handled;
    }
  }
}
},{"../dom":1,"../model":8,"../util/error":13}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NodeSelection = exports.TextSelection = exports.Selection = exports.SelectionState = exports.SelectionError = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.rangeFromDOMLoose = rangeFromDOMLoose;
exports.hasFocus = hasFocus;
exports.findSelectionFrom = findSelectionFrom;
exports.findSelectionNear = findSelectionNear;
exports.findSelectionAtStart = findSelectionAtStart;
exports.findSelectionAtEnd = findSelectionAtEnd;
exports.verticalMotionLeavesTextblock = verticalMotionLeavesTextblock;

var _model = require("../model");

var _error = require("../util/error");

var _dom = require("../dom");

var _dompos = require("./dompos");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; Error type used to signal selection-related problems.

var SelectionError = exports.SelectionError = function (_ProseMirrorError) {
  _inherits(SelectionError, _ProseMirrorError);

  function SelectionError() {
    _classCallCheck(this, SelectionError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(SelectionError).apply(this, arguments));
  }

  return SelectionError;
}(_error.ProseMirrorError);

var SelectionState = exports.SelectionState = function () {
  function SelectionState(pm, range) {
    var _this2 = this;

    _classCallCheck(this, SelectionState);

    this.pm = pm;
    this.range = range;

    this.lastNonNodePos = null;

    this.polling = null;
    this.lastAnchorNode = this.lastHeadNode = this.lastAnchorOffset = this.lastHeadOffset = null;
    this.lastNode = null;

    pm.content.addEventListener("focus", function () {
      return _this2.receivedFocus();
    });
    this.poller = this.poller.bind(this);
  }

  _createClass(SelectionState, [{
    key: "setAndSignal",
    value: function setAndSignal(range, clearLast) {
      this.set(range, clearLast);
      // :: () #path=ProseMirror#events#selectionChange
      // Indicates that the editor's selection has changed.
      this.pm.signal("selectionChange");
    }
  }, {
    key: "set",
    value: function set(range, clearLast) {
      this.range = range;
      if (!range.node) this.lastNonNodePos = null;
      if (clearLast !== false) this.lastAnchorNode = null;
    }
  }, {
    key: "poller",
    value: function poller() {
      if (hasFocus(this.pm)) {
        if (!this.pm.operation) this.readFromDOM();
        this.polling = setTimeout(this.poller, 100);
      } else {
        this.polling = null;
      }
    }
  }, {
    key: "startPolling",
    value: function startPolling() {
      clearTimeout(this.polling);
      this.polling = setTimeout(this.poller, 50);
    }
  }, {
    key: "fastPoll",
    value: function fastPoll() {
      this.startPolling();
    }
  }, {
    key: "stopPolling",
    value: function stopPolling() {
      clearTimeout(this.polling);
      this.polling = null;
    }
  }, {
    key: "domChanged",
    value: function domChanged() {
      var sel = window.getSelection();
      return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset || sel.focusNode != this.lastHeadNode || sel.focusOffset != this.lastHeadOffset;
    }
  }, {
    key: "storeDOMState",
    value: function storeDOMState() {
      var sel = window.getSelection();
      this.lastAnchorNode = sel.anchorNode;this.lastAnchorOffset = sel.anchorOffset;
      this.lastHeadNode = sel.focusNode;this.lastHeadOffset = sel.focusOffset;
    }
  }, {
    key: "readFromDOM",
    value: function readFromDOM() {
      if (this.pm.input.composing || !hasFocus(this.pm) || !this.domChanged()) return false;

      var sel = window.getSelection(),
          doc = this.pm.doc;
      var anchor = (0, _dompos.posFromDOM)(this.pm, sel.anchorNode, sel.anchorOffset);
      var head = sel.isCollapsed ? anchor : (0, _dompos.posFromDOM)(this.pm, sel.focusNode, sel.focusOffset);

      var newRange = findSelectionNear(doc, head, this.range.head && this.range.head.cmp(head) < 0 ? -1 : 1);
      if (newRange instanceof TextSelection && doc.path(anchor.path).isTextblock) newRange = new TextSelection(anchor, newRange.head);
      this.setAndSignal(newRange);

      if (newRange instanceof NodeSelection || newRange.head.cmp(head) || newRange.anchor.cmp(anchor)) {
        this.toDOM();
      } else {
        this.clearNode();
        this.storeDOMState();
      }
      return true;
    }
  }, {
    key: "toDOM",
    value: function toDOM(takeFocus) {
      if (!hasFocus(this.pm)) {
        if (!takeFocus) return;
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=921444
        else if (_dom.browser.gecko) this.pm.content.focus();
      }
      if (this.range instanceof NodeSelection) this.nodeToDOM();else this.rangeToDOM();
    }
  }, {
    key: "nodeToDOM",
    value: function nodeToDOM() {
      var dom = (0, _dompos.pathToDOM)(this.pm.content, this.range.from.toPath());
      if (dom != this.lastNode) {
        this.clearNode();
        dom.classList.add("ProseMirror-selectednode");
        this.pm.content.classList.add("ProseMirror-nodeselection");
        this.lastNode = dom;
      }
      var range = document.createRange(),
          sel = window.getSelection();
      range.selectNode(dom);
      sel.removeAllRanges();
      sel.addRange(range);
      this.storeDOMState();
    }
  }, {
    key: "rangeToDOM",
    value: function rangeToDOM() {
      this.clearNode();

      var anchor = (0, _dompos.DOMFromPos)(this.pm.content, this.range.anchor);
      var head = (0, _dompos.DOMFromPos)(this.pm.content, this.range.head);

      var sel = window.getSelection(),
          range = document.createRange();
      if (sel.extend) {
        range.setEnd(anchor.node, anchor.offset);
        range.collapse(false);
      } else {
        if (this.range.anchor.cmp(this.range.head) > 0) {
          var tmp = anchor;anchor = head;head = tmp;
        }
        range.setEnd(head.node, head.offset);
        range.setStart(anchor.node, anchor.offset);
      }
      sel.removeAllRanges();
      sel.addRange(range);
      if (sel.extend) sel.extend(head.node, head.offset);
      this.storeDOMState();
    }
  }, {
    key: "clearNode",
    value: function clearNode() {
      if (this.lastNode) {
        this.lastNode.classList.remove("ProseMirror-selectednode");
        this.pm.content.classList.remove("ProseMirror-nodeselection");
        this.lastNode = null;
        return true;
      }
    }
  }, {
    key: "receivedFocus",
    value: function receivedFocus() {
      if (this.polling == null) this.startPolling();
    }
  }]);

  return SelectionState;
}();

// ;; An editor selection. Can be one of two selection types:
// `TextSelection` and `NodeSelection`. Both have the properties
// listed here, but also contain more information (such as the
// selected [node](#NodeSelection.node) or the
// [head](#TextSelection.head) and [anchor](#TextSelection.anchor)).


var Selection = exports.Selection = function Selection() {
  _classCallCheck(this, Selection);
};

// :: Pos #path=Selection.prototype.from
// The start of the selection.

// :: Pos #path=Selection.prototype.to
// The end of the selection.

// :: bool #path=Selection.empty
// True if the selection is an empty text selection (head an anchor
// are the same).

// :: (other: Selection) → bool #path=Selection.eq
// Test whether the selection is the same as another selection.

// :: (doc: Node, mapping: Mappable) → Selection #path=Selection.map
// Map this selection through a [mappable](#Mappable) thing. `doc`
// should be the new document, to which we are mapping.


// ;; A text selection represents a classical editor
// selection, with a head (the moving side) and anchor (immobile
// side), both of which point into textblock nodes. It can be empty (a
// regular cursor position).

var TextSelection = exports.TextSelection = function (_Selection) {
  _inherits(TextSelection, _Selection);

  // :: (Pos, ?Pos)
  // Construct a text selection. When `head` is not given, it defaults
  // to `anchor`.

  function TextSelection(anchor, head) {
    _classCallCheck(this, TextSelection);

    // :: Pos
    // The selection's immobile side (does not move when pressing
    // shift-arrow).

    var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(TextSelection).call(this));

    _this3.anchor = anchor;
    // :: Pos
    // The selection's mobile side (the side that moves when pressing
    // shift-arrow).
    _this3.head = head || anchor;
    return _this3;
  }

  _createClass(TextSelection, [{
    key: "eq",
    value: function eq(other) {
      return other instanceof TextSelection && !other.head.cmp(this.head) && !other.anchor.cmp(this.anchor);
    }
  }, {
    key: "map",
    value: function map(doc, mapping) {
      var head = mapping.map(this.head).pos;
      if (!doc.path(head.path).isTextblock) return findSelectionNear(doc, head);
      var anchor = mapping.map(this.anchor).pos;
      return new TextSelection(doc.path(anchor.path).isTextblock ? anchor : head, head);
    }
  }, {
    key: "inverted",
    get: function get() {
      return this.anchor.cmp(this.head) > 0;
    }
  }, {
    key: "from",
    get: function get() {
      return this.inverted ? this.head : this.anchor;
    }
  }, {
    key: "to",
    get: function get() {
      return this.inverted ? this.anchor : this.head;
    }
  }, {
    key: "empty",
    get: function get() {
      return this.anchor.cmp(this.head) == 0;
    }
  }]);

  return TextSelection;
}(Selection);

// ;; A node selection is a selection that points at a
// single node. All nodes marked [selectable](#NodeType.selectable)
// can be the target of a node selection. In such an object, `from`
// and `to` point directly before and after the selected node.


var NodeSelection = exports.NodeSelection = function (_Selection2) {
  _inherits(NodeSelection, _Selection2);

  // :: (Pos, Pos, Node)
  // Create a node selection. Does not verify the validity of its
  // arguments. Use `ProseMirror.setNodeSelection` for an easier,
  // error-checking way to create a node selection.

  function NodeSelection(from, to, node) {
    _classCallCheck(this, NodeSelection);

    var _this4 = _possibleConstructorReturn(this, Object.getPrototypeOf(NodeSelection).call(this));

    _this4.from = from;
    _this4.to = to;
    // :: Node The selected node.
    _this4.node = node;
    return _this4;
  }

  _createClass(NodeSelection, [{
    key: "eq",
    value: function eq(other) {
      return other instanceof NodeSelection && !this.from.cmp(other.from);
    }
  }, {
    key: "map",
    value: function map(doc, mapping) {
      var from = mapping.map(this.from, 1).pos;
      var to = mapping.map(this.to, -1).pos;
      if (_model.Pos.samePath(from.path, to.path) && from.offset == to.offset - 1) {
        var node = doc.nodeAfter(from);
        if (node.type.selectable) return new NodeSelection(from, to, node);
      }
      return findSelectionNear(doc, from);
    }
  }, {
    key: "empty",
    get: function get() {
      return false;
    }
  }]);

  return NodeSelection;
}(Selection);

function rangeFromDOMLoose(pm) {
  if (!hasFocus(pm)) return null;
  var sel = window.getSelection();
  return new TextSelection((0, _dompos.posFromDOM)(pm, sel.anchorNode, sel.anchorOffset, true), (0, _dompos.posFromDOM)(pm, sel.focusNode, sel.focusOffset, true));
}

function hasFocus(pm) {
  var sel = window.getSelection();
  return sel.rangeCount && (0, _dom.contains)(pm.content, sel.anchorNode);
}

function findSelectionIn(doc, path, offset, dir, text) {
  var node = doc.path(path);
  if (node.isTextblock) return new TextSelection(new _model.Pos(path, offset));

  for (var i = offset + (dir > 0 ? 0 : -1); dir > 0 ? i < node.size : i >= 0; i += dir) {
    var child = node.child(i);
    if (!text && child.type.contains == null && child.type.selectable) return new NodeSelection(new _model.Pos(path, i), new _model.Pos(path, i + 1), child);
    path.push(i);
    var inside = findSelectionIn(doc, path, dir < 0 ? child.size : 0, dir, text);
    if (inside) return inside;
    path.pop();
  }
}

// FIXME we'll need some awareness of bidi motion when determining block start and end

function findSelectionFrom(doc, pos, dir, text) {
  for (var path = pos.path.slice(), offset = pos.offset;;) {
    var found = findSelectionIn(doc, path, offset, dir, text);
    if (found) return found;
    if (!path.length) break;
    offset = path.pop() + (dir > 0 ? 1 : 0);
  }
}

function findSelectionNear(doc, pos) {
  var bias = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];
  var text = arguments[3];

  var result = findSelectionFrom(doc, pos, bias, text) || findSelectionFrom(doc, pos, -bias, text);
  if (!result) SelectionError("Searching for selection in invalid document " + doc);
  return result;
}

function findSelectionAtStart(node) {
  var path = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
  var text = arguments[2];

  return findSelectionIn(node, path.slice(), 0, 1, text);
}

function findSelectionAtEnd(node) {
  var path = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
  var text = arguments[2];

  return findSelectionIn(node, path.slice(), node.size, -1, text);
}

function verticalMotionLeavesTextblock(pm, pos, dir) {
  var dom = (0, _dompos.pathToDOM)(pm.content, pos.path);
  var coords = (0, _dompos.coordsAtPos)(pm, pos);
  for (var child = dom.firstChild; child; child = child.nextSibling) {
    if (child.nodeType != 1) continue;
    var boxes = child.getClientRects();
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (dir < 0 ? box.bottom < coords.top : box.top > coords.bottom) return false;
    }
  }
  return true;
}
},{"../dom":1,"../model":8,"../util/error":13,"./dompos":2}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultSchema = exports.CodeMark = exports.LinkMark = exports.StrongMark = exports.EmMark = exports.HardBreak = exports.Image = exports.Paragraph = exports.CodeBlock = exports.Heading = exports.HorizontalRule = exports.ListItem = exports.BulletList = exports.OrderedList = exports.BlockQuote = exports.Doc = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _schema = require("./schema");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; The default top-level document node type.

var Doc = exports.Doc = function (_Block) {
  _inherits(Doc, _Block);

  function Doc() {
    _classCallCheck(this, Doc);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Doc).apply(this, arguments));
  }

  _createClass(Doc, null, [{
    key: "kinds",
    get: function get() {
      return "doc";
    }
  }]);

  return Doc;
}(_schema.Block);

// ;; The default blockquote node type.


var BlockQuote = exports.BlockQuote = function (_Block2) {
  _inherits(BlockQuote, _Block2);

  function BlockQuote() {
    _classCallCheck(this, BlockQuote);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(BlockQuote).apply(this, arguments));
  }

  return BlockQuote;
}(_schema.Block);

// ;; The default ordered list node type. Has a single attribute,
// `order`, which determines the number at which the list starts
// counting, and defaults to 1.


var OrderedList = exports.OrderedList = function (_Block3) {
  _inherits(OrderedList, _Block3);

  function OrderedList() {
    _classCallCheck(this, OrderedList);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(OrderedList).apply(this, arguments));
  }

  _createClass(OrderedList, [{
    key: "contains",
    get: function get() {
      return "list_item";
    }
  }, {
    key: "attrs",
    get: function get() {
      return { order: new _schema.Attribute({ default: "1" }) };
    }
  }]);

  return OrderedList;
}(_schema.Block);

// ;; The default bullet list node type.


var BulletList = exports.BulletList = function (_Block4) {
  _inherits(BulletList, _Block4);

  function BulletList() {
    _classCallCheck(this, BulletList);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(BulletList).apply(this, arguments));
  }

  _createClass(BulletList, [{
    key: "contains",
    get: function get() {
      return "list_item";
    }
  }]);

  return BulletList;
}(_schema.Block);

// ;; The default list item node type.


var ListItem = exports.ListItem = function (_Block5) {
  _inherits(ListItem, _Block5);

  function ListItem() {
    _classCallCheck(this, ListItem);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ListItem).apply(this, arguments));
  }

  _createClass(ListItem, null, [{
    key: "kinds",
    get: function get() {
      return "list_item";
    }
  }]);

  return ListItem;
}(_schema.Block);

// ;; The default horizontal rule node type.


var HorizontalRule = exports.HorizontalRule = function (_Block6) {
  _inherits(HorizontalRule, _Block6);

  function HorizontalRule() {
    _classCallCheck(this, HorizontalRule);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(HorizontalRule).apply(this, arguments));
  }

  _createClass(HorizontalRule, [{
    key: "contains",
    get: function get() {
      return null;
    }
  }]);

  return HorizontalRule;
}(_schema.Block);

// ;; The default heading node type. Has a single attribute
// `level`, which indicates the heading level, and defaults to 1.


var Heading = exports.Heading = function (_Textblock) {
  _inherits(Heading, _Textblock);

  function Heading() {
    _classCallCheck(this, Heading);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Heading).apply(this, arguments));
  }

  _createClass(Heading, [{
    key: "attrs",
    get: function get() {
      return { level: new _schema.Attribute({ default: "1" }) };
    }
    // :: number
    // Controls the maximum heading level. Has the value 6 in the
    // `Heading` class, but you can override it in a subclass.

  }, {
    key: "maxLevel",
    get: function get() {
      return 6;
    }
  }]);

  return Heading;
}(_schema.Textblock);

// ;; The default code block / listing node type. Only
// allows unmarked text nodes inside of it.


var CodeBlock = exports.CodeBlock = function (_Textblock2) {
  _inherits(CodeBlock, _Textblock2);

  function CodeBlock() {
    _classCallCheck(this, CodeBlock);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(CodeBlock).apply(this, arguments));
  }

  _createClass(CodeBlock, [{
    key: "contains",
    get: function get() {
      return "text";
    }
  }, {
    key: "containsMarks",
    get: function get() {
      return false;
    }
  }, {
    key: "isCode",
    get: function get() {
      return true;
    }
  }]);

  return CodeBlock;
}(_schema.Textblock);

// ;; The default paragraph node type.


var Paragraph = exports.Paragraph = function (_Textblock3) {
  _inherits(Paragraph, _Textblock3);

  function Paragraph() {
    _classCallCheck(this, Paragraph);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Paragraph).apply(this, arguments));
  }

  _createClass(Paragraph, [{
    key: "defaultTextblock",
    get: function get() {
      return true;
    }
  }]);

  return Paragraph;
}(_schema.Textblock);

// ;; The default inline image node type. Has these
// attributes:
//
// - **`src`** (required): The URL of the image.
// - **`alt`**: The alt text.
// - **`title`**: The title of the image.


var Image = exports.Image = function (_Inline) {
  _inherits(Image, _Inline);

  function Image() {
    _classCallCheck(this, Image);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Image).apply(this, arguments));
  }

  _createClass(Image, [{
    key: "attrs",
    get: function get() {
      return {
        src: new _schema.Attribute(),
        alt: new _schema.Attribute({ default: "" }),
        title: new _schema.Attribute({ default: "" })
      };
    }
  }, {
    key: "draggable",
    get: function get() {
      return true;
    }
  }]);

  return Image;
}(_schema.Inline);

// ;; The default hard break node type.


var HardBreak = exports.HardBreak = function (_Inline2) {
  _inherits(HardBreak, _Inline2);

  function HardBreak() {
    _classCallCheck(this, HardBreak);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(HardBreak).apply(this, arguments));
  }

  _createClass(HardBreak, [{
    key: "selectable",
    get: function get() {
      return false;
    }
  }, {
    key: "isBR",
    get: function get() {
      return true;
    }
  }]);

  return HardBreak;
}(_schema.Inline);

// ;; The default emphasis mark type.


var EmMark = exports.EmMark = function (_MarkType) {
  _inherits(EmMark, _MarkType);

  function EmMark() {
    _classCallCheck(this, EmMark);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(EmMark).apply(this, arguments));
  }

  _createClass(EmMark, null, [{
    key: "rank",
    get: function get() {
      return 51;
    }
  }]);

  return EmMark;
}(_schema.MarkType);

// ;; The default strong mark type.


var StrongMark = exports.StrongMark = function (_MarkType2) {
  _inherits(StrongMark, _MarkType2);

  function StrongMark() {
    _classCallCheck(this, StrongMark);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(StrongMark).apply(this, arguments));
  }

  _createClass(StrongMark, null, [{
    key: "rank",
    get: function get() {
      return 52;
    }
  }]);

  return StrongMark;
}(_schema.MarkType);

// ;; The default link mark type. Has these attributes:
//
// - **`href`** (required): The link target.
// - **`title`**: The link's title.


var LinkMark = exports.LinkMark = function (_MarkType3) {
  _inherits(LinkMark, _MarkType3);

  function LinkMark() {
    _classCallCheck(this, LinkMark);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(LinkMark).apply(this, arguments));
  }

  _createClass(LinkMark, [{
    key: "attrs",
    get: function get() {
      return {
        href: new _schema.Attribute(),
        title: new _schema.Attribute({ default: "" })
      };
    }
  }], [{
    key: "rank",
    get: function get() {
      return 25;
    }
  }]);

  return LinkMark;
}(_schema.MarkType);

// ;; The default code font mark type.


var CodeMark = exports.CodeMark = function (_MarkType4) {
  _inherits(CodeMark, _MarkType4);

  function CodeMark() {
    _classCallCheck(this, CodeMark);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(CodeMark).apply(this, arguments));
  }

  _createClass(CodeMark, [{
    key: "isCode",
    get: function get() {
      return true;
    }
  }], [{
    key: "rank",
    get: function get() {
      return 101;
    }
  }]);

  return CodeMark;
}(_schema.MarkType);

// :: SchemaSpec
// The specification for the default schema.


var defaultSpec = new _schema.SchemaSpec({
  doc: Doc,
  blockquote: BlockQuote,
  ordered_list: OrderedList,
  bullet_list: BulletList,
  list_item: ListItem,
  horizontal_rule: HorizontalRule,

  paragraph: Paragraph,
  heading: Heading,
  code_block: CodeBlock,

  text: _schema.Text,
  image: Image,
  hard_break: HardBreak
}, {
  em: EmMark,
  strong: StrongMark,
  link: LinkMark,
  code: CodeMark
});

// :: Schema
// ProseMirror's default document schema.
var defaultSchema = exports.defaultSchema = new _schema.Schema(defaultSpec);
},{"./schema":12}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findDiffStart = findDiffStart;
exports.findDiffEnd = findDiffEnd;

var _pos = require("./pos");

// :: (Node, Node) → ?Pos
// Find the first position at which nodes `a` and `b` differ, or
// `null` if they are the same.
function findDiffStart(a, b) {
  var path = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

  var iA = a.iter(),
      iB = b.iter(),
      offset = 0;
  for (;;) {
    if (iA.atEnd() || iB.atEnd()) {
      if (a.size == b.size) return null;
      break;
    }

    var childA = iA.next(),
        childB = iB.next();
    if (childA == childB) {
      offset += childA.width;continue;
    }

    if (!childA.sameMarkup(childB)) break;

    if (childA.isText && childA.text != childB.text) {
      for (var j = 0; childA.text[j] == childB.text[j]; j++) {
        offset++;
      }break;
    }

    if (childA.size || childB.size) {
      path.push(offset);
      var inner = findDiffStart(childA.content, childB.content, path);
      if (inner) return inner;
      path.pop();
    }
    offset += childA.width;
  }
  return new _pos.Pos(path, offset);
}

// :: (Node, Node) → ?{a: Pos, b: Pos}
// Find the first position, searching from the end, at which nodes `a`
// and `b` differ, or `null` if they are the same. Since this position
// will not be the same in both nodes, an object with two separate
// positions is returned.
function findDiffEnd(a, b) {
  var pathA = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
  var pathB = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];

  var iA = a.reverseIter(),
      iB = b.reverseIter();
  var offA = a.size,
      offB = b.size;

  for (;;) {
    if (iA.atEnd() || iB.atEnd()) {
      if (a.size == b.size) return null;
      break;
    }
    var childA = iA.next(),
        childB = iB.next();
    if (childA == childB) {
      offA -= childA.width;offB -= childB.width;
      continue;
    }

    if (!childA.sameMarkup(childB)) break;

    if (childA.isText && childA.text != childB.text) {
      var same = 0,
          minSize = Math.min(childA.text.length, childB.text.length);
      while (same < minSize && childA.text[childA.text.length - same - 1] == childB.text[childB.text.length - same - 1]) {
        same++;offA--;offB--;
      }
      break;
    }
    offA -= childA.width;offB -= childB.width;
    if (childA.size || childB.size) {
      pathA.push(offA);pathB.push(offB);
      var inner = findDiffEnd(childA.content, childB.content, pathA, pathB);
      if (inner) return inner;
      pathA.pop();pathB.pop();
    }
  }
  return { a: new _pos.Pos(pathA, offA), b: new _pos.Pos(pathB, offB) };
}
},{"./pos":11}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ModelError = undefined;

var _error = require("../util/error");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; Class used to signal model-related errors.

var ModelError = exports.ModelError = function (_ProseMirrorError) {
  _inherits(ModelError, _ProseMirrorError);

  function ModelError() {
    _classCallCheck(this, ModelError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ModelError).apply(this, arguments));
  }

  return ModelError;
}(_error.ProseMirrorError);
},{"../util/error":13}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.emptyFragment = exports.Fragment = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _error = require("./error");

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; A fragment is an abstract type used to represent a node's
// collection of child nodes. It tries to hide considerations about
// the actual way in which the child nodes are stored, so that
// different representations (nodes that only contain simple nodes
// versus nodes that also contain text) can be approached using the
// same API.
//
// Fragments are persistent data structures. That means you should
// _not_ mutate them or their content, but create new instances
// whenever needed. The API tries to make this easy.

var Fragment = exports.Fragment = function () {
  function Fragment() {
    _classCallCheck(this, Fragment);
  }

  _createClass(Fragment, [{
    key: "append",

    // :: (Fragment, number, number) → Fragment
    // Create a fragment that combines this one with another fragment.
    // Takes care of merging adjacent text nodes and can also merge
    // “open” nodes at the boundary. `joinLeft` and `joinRight` give the
    // depth to which the left and right fragments are open. If open
    // nodes with the same markup are found on both sides, they are
    // joined. If not, the open nodes are [closed](#Node.close).
    value: function append(other) {
      var joinLeft = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
      var joinRight = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      if (!this.size) return joinRight ? other.replace(0, other.firstChild.close(joinRight - 1, "start")) : other;
      if (!other.size) return joinLeft ? this.replace(this.size - 1, this.lastChild.close(joinLeft - 1, "end")) : this;
      return this.appendInner(other, joinLeft, joinRight);
    }

    // :: string
    // Concatenate all the text nodes found in this fragment and its
    // children.

  }, {
    key: "toString",


    // :: () → string
    // Return a debugging string that describes this fragment.
    value: function toString() {
      var str = "";
      this.forEach(function (n) {
        return str += (str ? ", " : "") + n.toString();
      });
      return str;
    }

    // :: (number, number, ?(Node) → Node) → [Node]
    // Produce an array with the child nodes between the given
    // boundaries, optionally mapping a function over them.

  }, {
    key: "toArray",
    value: function toArray() {
      var from = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.size : arguments[1];
      var f = arguments[2];

      var result = [];
      for (var iter = this.iter(from, to), n; n = iter.next().value;) {
        result.push(f ? f(n) : n);
      }return result;
    }

    // :: ((Node) → Node) → Fragment
    // Produce a new Fragment by mapping all this fragment's children
    // through a function.

  }, {
    key: "map",
    value: function map(f) {
      return Fragment.fromArray(this.toArray(undefined, undefined, f));
    }

    // :: ((Node) → bool) → ?Node
    // Returns the first child node for which the given function returns
    // `true`, or undefined otherwise.

  }, {
    key: "some",
    value: function some(f) {
      for (var iter = this.iter(), n; n = iter.next().value;) {
        if (f(n)) return n;
      }
    }
  }, {
    key: "close",
    value: function close(depth, side) {
      var child = side == "start" ? this.firstChild : this.lastChild;
      var closed = child.close(depth - 1, side);
      if (closed == child) return this;
      return this.replace(side == "start" ? 0 : this.size - 1, closed);
    }
  }, {
    key: "nodesBetween",
    value: function nodesBetween(from, to, f, path, parent) {
      var moreFrom = from && from.depth > path.length,
          moreTo = to && to.depth > path.length;
      var start = moreFrom ? from.path[path.length] : from ? from.offset : 0;
      var end = moreTo ? to.path[path.length] + 1 : to ? to.offset : this.size;
      for (var iter = this.iter(start, end), node; node = iter.next().value;) {
        var startOffset = iter.offset - node.width;
        path.push(startOffset);
        node.nodesBetween(moreFrom && startOffset == start ? from : null, moreTo && iter.offset == end ? to : null, f, path, parent);
        path.pop();
      }
    }

    // :: (?Pos, ?Pos) → Fragment
    // Slice out the sub-fragment between the two given positions.
    // `null` can be passed for either to indicate the slice should go
    // all the way to the start or end of the fragment.

  }, {
    key: "sliceBetween",
    value: function sliceBetween(from, to) {
      var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      var moreFrom = from && from.depth > depth,
          moreTo = to && to.depth > depth;
      var start = moreFrom ? from.path[depth] : from ? from.offset : 0;
      var end = moreTo ? to.path[depth] + 1 : to ? to.offset : this.size;
      var nodes = [];
      for (var iter = this.iter(start, end), node; node = iter.next().value;) {
        var passFrom = moreFrom && iter.offset - node.width == start ? from : null;
        var passTo = moreTo && iter.offset == end ? to : null;
        if (passFrom || passTo) node = node.sliceBetween(passFrom, passTo, depth + 1);
        nodes.push(node);
      }
      return new this.constructor(nodes);
    }

    // :: (Schema, Object) → Fragment
    // Deserialize a fragment from its JSON representation.

  }, {
    key: "textContent",
    get: function get() {
      var text = "";
      this.forEach(function (n) {
        return text += n.textContent;
      });
      return text;
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, value) {
      return value ? this.fromArray(value.map(schema.nodeFromJSON)) : emptyFragment;
    }

    // :: ([Node]) → Fragment
    // Build a fragment from an array of nodes.

  }, {
    key: "fromArray",
    value: function fromArray(array) {
      if (!array.length) return emptyFragment;
      var hasText = false,
          joined = undefined,
          size = 0;
      for (var i = 0; i < array.length; i++) {
        var node = array[i];
        size += node.width;
        if (node.isText) {
          hasText = true;
          if (i && array[i - 1].sameMarkup(node)) {
            if (!joined) joined = array.slice(0, i);
            joined[joined.length - 1] = node.copy(joined[joined.length - 1].text + node.text);
            continue;
          }
        }
        if (joined) joined.push(node);
      }
      return hasText ? new TextFragment(joined || array, size) : new FlatFragment(array);
    }

    // :: (?union<Fragment, Node, [Node]>) → Fragment
    // Create a fragment from something that can be interpreted as a set
    // of nodes. For `null`, it returns the empty fragment. For a
    // fragment, the fragment itself. For a node or array of nodes, a
    // fragment containing those nodes.

  }, {
    key: "from",
    value: function from(nodes) {
      if (!nodes) return emptyFragment;
      if (nodes instanceof Fragment) return nodes;
      return this.fromArray(Array.isArray(nodes) ? nodes : [nodes]);
    }
  }]);

  return Fragment;
}();

var iterEnd = { done: true };

var FlatIterator = function () {
  function FlatIterator(array, pos, end) {
    _classCallCheck(this, FlatIterator);

    this.array = array;
    this.pos = pos;
    this.end = end;
  }

  _createClass(FlatIterator, [{
    key: "copy",
    value: function copy() {
      return new this.constructor(this.array, this.pos, this.end);
    }
  }, {
    key: "atEnd",
    value: function atEnd() {
      return this.pos == this.end;
    }
  }, {
    key: "next",
    value: function next() {
      return this.pos == this.end ? iterEnd : this.array[this.pos++];
    }
  }, {
    key: "offset",
    get: function get() {
      return this.pos;
    }
  }]);

  return FlatIterator;
}();

var ReverseFlatIterator = function (_FlatIterator) {
  _inherits(ReverseFlatIterator, _FlatIterator);

  function ReverseFlatIterator() {
    _classCallCheck(this, ReverseFlatIterator);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ReverseFlatIterator).apply(this, arguments));
  }

  _createClass(ReverseFlatIterator, [{
    key: "next",
    value: function next() {
      return this.pos == this.end ? iterEnd : this.array[--this.pos];
    }
  }]);

  return ReverseFlatIterator;
}(FlatIterator);

// ;; #forward=Fragment


var FlatFragment = function (_Fragment) {
  _inherits(FlatFragment, _Fragment);

  function FlatFragment(content) {
    _classCallCheck(this, FlatFragment);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(FlatFragment).call(this));

    _this2.content = content;
    return _this2;
  }

  // :: (?number, ?number) → Iterator<Node>
  // Create a forward iterator over the content of the fragment. An
  // explicit start and end offset can be given to have the iterator
  // go over only part of the content. If an iteration bound falls
  // within a text node, only the part that is within the bounds is
  // yielded.


  _createClass(FlatFragment, [{
    key: "iter",
    value: function iter() {
      var start = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
      var end = arguments.length <= 1 || arguments[1] === undefined ? this.size : arguments[1];

      return new FlatIterator(this.content, start, end);
    }

    // :: (?number, ?number) → Iterator<Node>
    // Create a reverse iterator over the content of the fragment. An
    // explicit start and end offset can be given to have the iterator
    // go over only part of the content. **Note**: `start` should be
    // greater than `end`, when passed.

  }, {
    key: "reverseIter",
    value: function reverseIter() {
      var start = arguments.length <= 0 || arguments[0] === undefined ? this.size : arguments[0];
      var end = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      return new ReverseFlatIterator(this.content, start, end);
    }

    // :: number
    // The maximum offset in this fragment.

  }, {
    key: "child",


    // :: (number) → Node
    // Get the child at the given offset. Might return a text node that
    // stretches before and/or after the offset.
    value: function child(off) {
      if (off < 0 || off >= this.content.length) _error.ModelError.raise("Offset " + off + " out of range");
      return this.content[off];
    }

    // :: ((node: Node, start: number, end: number))
    // Call the given function for each node in the fragment, passing it
    // the node, its start offset, and its end offset.

  }, {
    key: "forEach",
    value: function forEach(f) {
      for (var i = 0; i < this.content.length; i++) {
        f(this.content[i], i, i + 1);
      }
    }

    // :: (number) → {start: number, node: Node}
    // Find the node before the given offset. Returns an object
    // containing the node as well as its start index. Offset should be
    // greater than zero.

  }, {
    key: "chunkBefore",
    value: function chunkBefore(off) {
      return { node: this.child(off - 1), start: off - 1 };
    }

    // :: (number) → {start: number, node: Node}
    // Find the node after the given offset. Returns an object
    // containing the node as well as its start index. Offset should be
    // less than the fragment's size.

  }, {
    key: "chunkAfter",
    value: function chunkAfter(off) {
      return { node: this.child(off), start: off };
    }

    // :: (number, ?number) → Fragment
    // Return a fragment with only the nodes between the given offsets.
    // When `to` is not given, the slice will go to the end of the
    // fragment.

  }, {
    key: "slice",
    value: function slice(from) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.size : arguments[1];

      if (from == to) return emptyFragment;
      return new FlatFragment(this.content.slice(from, to));
    }

    // :: (number, Node) → Fragment
    // Return a fragment in which the node at the given offset is
    // replaced by the given node. The node, as well as the one it
    // replaces, should not be text nodes.

  }, {
    key: "replace",
    value: function replace(offset, node) {
      if (node.isText) _error.ModelError.raise("Argument to replace should be a non-text node");
      var copy = this.content.slice();
      copy[offset] = node;
      return new FlatFragment(copy);
    }
  }, {
    key: "appendInner",
    value: function appendInner(other, joinLeft, joinRight) {
      var last = this.content.length - 1,
          content = this.content.slice(0, last);
      var before = this.content[last],
          after = other.firstChild;
      if (joinLeft > 0 && joinRight > 0 && before.sameMarkup(after)) content.push(before.append(after.content, joinLeft - 1, joinRight - 1));else content.push(before.close(joinLeft - 1, "end"), after.close(joinRight - 1, "start"));
      return Fragment.fromArray(content.concat(other.toArray(after.width)));
    }

    // :: () → Object
    // Create a JSON-serializeable representation of this fragment.

  }, {
    key: "toJSON",
    value: function toJSON() {
      return this.content.map(function (n) {
        return n.toJSON();
      });
    }
  }, {
    key: "size",
    get: function get() {
      return this.content.length;
    }

    // :: ?Node
    // The first child of the fragment, or `null` if it is empty.

  }, {
    key: "firstChild",
    get: function get() {
      return this.content.length ? this.content[0] : null;
    }

    // :: ?Node
    // The last child of the fragment, or `null` if it is empty.

  }, {
    key: "lastChild",
    get: function get() {
      return this.content.length ? this.content[this.content.length - 1] : null;
    }
  }]);

  return FlatFragment;
}(Fragment);

// :: Fragment
// An empty fragment. Intended to be reused whenever a node doesn't
// contain anything (rather than allocating a new empty fragment for
// each leaf node).


var emptyFragment = exports.emptyFragment = new FlatFragment([]);

var TextIterator = function () {
  function TextIterator(fragment, startOffset, endOffset) {
    var pos = arguments.length <= 3 || arguments[3] === undefined ? -1 : arguments[3];

    _classCallCheck(this, TextIterator);

    this.frag = fragment;
    this.offset = startOffset;
    this.pos = pos;
    this.endOffset = endOffset;
  }

  _createClass(TextIterator, [{
    key: "copy",
    value: function copy() {
      return new this.constructor(this.frag, this.offset, this.endOffset, this.pos);
    }
  }, {
    key: "atEnd",
    value: function atEnd() {
      return this.offset == this.endOffset;
    }
  }, {
    key: "next",
    value: function next() {
      if (this.pos == -1) {
        var start = this.init();
        if (start) return start;
      }
      return this.offset == this.endOffset ? iterEnd : this.advance();
    }
  }, {
    key: "advance",
    value: function advance() {
      var node = this.frag.content[this.pos++],
          end = this.offset + node.width;
      if (end > this.endOffset) {
        node = node.copy(node.text.slice(0, this.endOffset - this.offset));
        this.offset = this.endOffset;
        return node;
      }
      this.offset = end;
      return node;
    }
  }, {
    key: "init",
    value: function init() {
      this.pos = 0;
      var offset = 0;
      while (offset < this.offset) {
        var node = this.frag.content[this.pos++],
            end = offset + node.width;
        if (end == this.offset) break;
        if (end > this.offset) {
          var sliceEnd = node.width;
          if (end > this.endOffset) {
            sliceEnd = this.endOffset - offset;
            end = this.endOffset;
          }
          node = node.copy(node.text.slice(this.offset - offset, sliceEnd));
          this.offset = end;
          return node;
        }
        offset = end;
      }
    }
  }]);

  return TextIterator;
}();

var ReverseTextIterator = function (_TextIterator) {
  _inherits(ReverseTextIterator, _TextIterator);

  function ReverseTextIterator() {
    _classCallCheck(this, ReverseTextIterator);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ReverseTextIterator).apply(this, arguments));
  }

  _createClass(ReverseTextIterator, [{
    key: "advance",
    value: function advance() {
      var node = this.frag.content[--this.pos],
          end = this.offset - node.width;
      if (end < this.endOffset) {
        node = node.copy(node.text.slice(this.endOffset - end));
        this.offset = this.endOffset;
        return node;
      }
      this.offset = end;
      return node;
    }
  }, {
    key: "init",
    value: function init() {
      this.pos = this.frag.content.length;
      var offset = this.frag.size;
      while (offset > this.offset) {
        var node = this.frag.content[--this.pos],
            end = offset - node.width;
        if (end == this.offset) break;
        if (end < this.offset) {
          if (end < this.endOffset) {
            node = node.copy(node.text.slice(this.endOffset - end, this.offset - end));
            end = this.endOffset;
          } else {
            node = node.copy(node.text.slice(0, this.offset - end));
          }
          this.offset = end;
          return node;
        }
        offset = end;
      }
    }
  }]);

  return ReverseTextIterator;
}(TextIterator);

var TextFragment = function (_Fragment2) {
  _inherits(TextFragment, _Fragment2);

  function TextFragment(content, size) {
    _classCallCheck(this, TextFragment);

    var _this4 = _possibleConstructorReturn(this, Object.getPrototypeOf(TextFragment).call(this));

    _this4.content = content;
    _this4.size = size || 0;
    if (size == null) for (var i = 0; i < content.length; i++) {
      _this4.size += content[i].width;
    }return _this4;
  }

  _createClass(TextFragment, [{
    key: "iter",
    value: function iter() {
      var from = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.size : arguments[1];

      return new TextIterator(this, from, to);
    }
  }, {
    key: "reverseIter",
    value: function reverseIter() {
      var from = arguments.length <= 0 || arguments[0] === undefined ? this.size : arguments[0];
      var to = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      return new ReverseTextIterator(this, from, to);
    }
  }, {
    key: "child",
    value: function child(off) {
      if (off < 0 || off >= this.size) _error.ModelError.raise("Offset " + off + " out of range");
      for (var i = 0, curOff = 0; i < this.content.length; i++) {
        var child = this.content[i];
        curOff += child.width;
        if (curOff > off) return child;
      }
    }
  }, {
    key: "forEach",
    value: function forEach(f) {
      for (var i = 0, off = 0; i < this.content.length; i++) {
        var child = this.content[i];
        f(child, off, off += child.width);
      }
    }
  }, {
    key: "chunkBefore",
    value: function chunkBefore(off) {
      if (!off) _error.ModelError.raise("No chunk before start of node");
      for (var i = 0, curOff = 0; i < this.content.length; i++) {
        var child = this.content[i],
            end = curOff + child.width;
        if (end >= off) return { node: child, start: curOff };
        curOff = end;
      }
    }
  }, {
    key: "chunkAfter",
    value: function chunkAfter(off) {
      if (off == this.size) _error.ModelError.raise("No chunk after end of node");
      for (var i = 0, curOff = 0; i < this.content.length; i++) {
        var child = this.content[i],
            end = curOff + child.width;
        if (end > off) return { node: child, start: curOff };
        curOff = end;
      }
    }
  }, {
    key: "slice",
    value: function slice() {
      var from = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.size : arguments[1];

      if (from == to) return emptyFragment;
      return new TextFragment(this.toArray(from, to), to - from);
    }
  }, {
    key: "replace",
    value: function replace(off, node) {
      if (node.isText) _error.ModelError.raise("Argument to replace should be a non-text node");
      var curNode = undefined,
          index = undefined;
      for (var curOff = 0; curOff < off; index++) {
        curNode = this.content[index];
        curOff += curNode.width;
      }
      if (curNode.isText) _error.ModelError.raise("Can not replace text content with replace method");
      var copy = this.content.slice();
      copy[index] = node;
      return new TextFragment(copy, this.size);
    }
  }, {
    key: "appendInner",
    value: function appendInner(other, joinLeft, joinRight) {
      var last = this.content.length - 1,
          content = this.content.slice(0, last);
      var before = this.content[last],
          after = other.firstChild;
      var same = before.sameMarkup(after);
      if (same && before.isText) content.push(before.copy(before.text + after.text));else if (same && joinLeft > 0 && joinRight > 0) content.push(before.append(after.content, joinLeft - 1, joinRight - 1));else content.push(before.close(joinLeft - 1, "end"), after.close(joinRight - 1, "start"));
      return Fragment.fromArray(content.concat(other.toArray(after.width)));
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      return this.content.map(function (n) {
        return n.toJSON();
      });
    }
  }, {
    key: "firstChild",
    get: function get() {
      return this.size ? this.content[0] : null;
    }
  }, {
    key: "lastChild",
    get: function get() {
      return this.size ? this.content[this.content.length - 1] : null;
    }
  }]);

  return TextFragment;
}(Fragment);

if (typeof Symbol != "undefined") {
  // :: () → Iterator<Node>
  // A fragment is iterable, in the ES6 sense.
  Fragment.prototype[Symbol.iterator] = function () {
    return this.iter();
  };
  FlatIterator.prototype[Symbol.iterator] = TextIterator.prototype[Symbol.iterator] = function () {
    return this;
  };
}
},{"./error":6}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
        value: true
});

var _node = require("./node");

Object.defineProperty(exports, "Node", {
        enumerable: true,
        get: function get() {
                return _node.Node;
        }
});

var _fragment = require("./fragment");

Object.defineProperty(exports, "Fragment", {
        enumerable: true,
        get: function get() {
                return _fragment.Fragment;
        }
});
Object.defineProperty(exports, "emptyFragment", {
        enumerable: true,
        get: function get() {
                return _fragment.emptyFragment;
        }
});

var _mark = require("./mark");

Object.defineProperty(exports, "Mark", {
        enumerable: true,
        get: function get() {
                return _mark.Mark;
        }
});

var _schema = require("./schema");

Object.defineProperty(exports, "SchemaSpec", {
        enumerable: true,
        get: function get() {
                return _schema.SchemaSpec;
        }
});
Object.defineProperty(exports, "Schema", {
        enumerable: true,
        get: function get() {
                return _schema.Schema;
        }
});
Object.defineProperty(exports, "SchemaError", {
        enumerable: true,
        get: function get() {
                return _schema.SchemaError;
        }
});
Object.defineProperty(exports, "NodeType", {
        enumerable: true,
        get: function get() {
                return _schema.NodeType;
        }
});
Object.defineProperty(exports, "Block", {
        enumerable: true,
        get: function get() {
                return _schema.Block;
        }
});
Object.defineProperty(exports, "Textblock", {
        enumerable: true,
        get: function get() {
                return _schema.Textblock;
        }
});
Object.defineProperty(exports, "Inline", {
        enumerable: true,
        get: function get() {
                return _schema.Inline;
        }
});
Object.defineProperty(exports, "Text", {
        enumerable: true,
        get: function get() {
                return _schema.Text;
        }
});
Object.defineProperty(exports, "MarkType", {
        enumerable: true,
        get: function get() {
                return _schema.MarkType;
        }
});
Object.defineProperty(exports, "Attribute", {
        enumerable: true,
        get: function get() {
                return _schema.Attribute;
        }
});

var _defaultschema = require("./defaultschema");

Object.defineProperty(exports, "defaultSchema", {
        enumerable: true,
        get: function get() {
                return _defaultschema.defaultSchema;
        }
});
Object.defineProperty(exports, "Doc", {
        enumerable: true,
        get: function get() {
                return _defaultschema.Doc;
        }
});
Object.defineProperty(exports, "BlockQuote", {
        enumerable: true,
        get: function get() {
                return _defaultschema.BlockQuote;
        }
});
Object.defineProperty(exports, "OrderedList", {
        enumerable: true,
        get: function get() {
                return _defaultschema.OrderedList;
        }
});
Object.defineProperty(exports, "BulletList", {
        enumerable: true,
        get: function get() {
                return _defaultschema.BulletList;
        }
});
Object.defineProperty(exports, "ListItem", {
        enumerable: true,
        get: function get() {
                return _defaultschema.ListItem;
        }
});
Object.defineProperty(exports, "HorizontalRule", {
        enumerable: true,
        get: function get() {
                return _defaultschema.HorizontalRule;
        }
});
Object.defineProperty(exports, "Paragraph", {
        enumerable: true,
        get: function get() {
                return _defaultschema.Paragraph;
        }
});
Object.defineProperty(exports, "Heading", {
        enumerable: true,
        get: function get() {
                return _defaultschema.Heading;
        }
});
Object.defineProperty(exports, "CodeBlock", {
        enumerable: true,
        get: function get() {
                return _defaultschema.CodeBlock;
        }
});
Object.defineProperty(exports, "Image", {
        enumerable: true,
        get: function get() {
                return _defaultschema.Image;
        }
});
Object.defineProperty(exports, "HardBreak", {
        enumerable: true,
        get: function get() {
                return _defaultschema.HardBreak;
        }
});
Object.defineProperty(exports, "CodeMark", {
        enumerable: true,
        get: function get() {
                return _defaultschema.CodeMark;
        }
});
Object.defineProperty(exports, "EmMark", {
        enumerable: true,
        get: function get() {
                return _defaultschema.EmMark;
        }
});
Object.defineProperty(exports, "StrongMark", {
        enumerable: true,
        get: function get() {
                return _defaultschema.StrongMark;
        }
});
Object.defineProperty(exports, "LinkMark", {
        enumerable: true,
        get: function get() {
                return _defaultschema.LinkMark;
        }
});

var _pos = require("./pos");

Object.defineProperty(exports, "Pos", {
        enumerable: true,
        get: function get() {
                return _pos.Pos;
        }
});

var _diff = require("./diff");

Object.defineProperty(exports, "findDiffStart", {
        enumerable: true,
        get: function get() {
                return _diff.findDiffStart;
        }
});
Object.defineProperty(exports, "findDiffEnd", {
        enumerable: true,
        get: function get() {
                return _diff.findDiffEnd;
        }
});

var _error = require("./error");

Object.defineProperty(exports, "ModelError", {
        enumerable: true,
        get: function get() {
                return _error.ModelError;
        }
});
},{"./defaultschema":4,"./diff":5,"./error":6,"./fragment":7,"./mark":9,"./node":10,"./pos":11,"./schema":12}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; A mark is a piece of information that can be attached to a node,
// such as it being emphasized, in code font, or a link. It has a type
// and optionally a set of attributes that provide further information
// (such as the target of the link). Marks are created through a
// `Schema`, which controls which types exist and which
// attributes they have.

var Mark = exports.Mark = function () {
  function Mark(type, attrs) {
    _classCallCheck(this, Mark);

    // :: MarkType
    // The type of this mark.
    this.type = type;
    // :: Object
    // The attributes associated with this mark.
    this.attrs = attrs;
  }

  // :: () → Object
  // Convert this mark to a JSON-serializeable representation.


  _createClass(Mark, [{
    key: "toJSON",
    value: function toJSON() {
      var obj = { _: this.type.name };
      for (var attr in this.attrs) {
        obj[attr] = this.attrs[attr];
      }return obj;
    }

    // :: ([Mark]) → [Mark]
    // Given a set of marks, create a new set which contains this one as
    // well, in the right position. If this mark or another of its type
    // is already in the set, the set itself is returned.

  }, {
    key: "addToSet",
    value: function addToSet(set) {
      for (var i = 0; i < set.length; i++) {
        var other = set[i];
        if (other.type == this.type) {
          if (this.eq(other)) return set;else return set.slice(0, i).concat(this).concat(set.slice(i + 1));
        }
        if (other.type.rank > this.type.rank) return set.slice(0, i).concat(this).concat(set.slice(i));
      }
      return set.concat(this);
    }

    // :: ([Mark]) → [Mark]
    // Remove this mark from the given set, returning a new set. If this
    // mark is not in the set, the set itself is returned.

  }, {
    key: "removeFromSet",
    value: function removeFromSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (this.eq(set[i])) return set.slice(0, i).concat(set.slice(i + 1));
      }return set;
    }

    // :: ([Mark]) → bool
    // Test whether this mark is in the given set of marks.

  }, {
    key: "isInSet",
    value: function isInSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (this.eq(set[i])) return true;
      }return false;
    }

    // :: (Mark) → bool
    // Test whether this mark has the same type and attributes as
    // another mark.

  }, {
    key: "eq",
    value: function eq(other) {
      if (this == other) return true;
      if (this.type != other.type) return false;
      for (var attr in this.attrs) {
        if (other.attrs[attr] != this.attrs[attr]) return false;
      }return true;
    }

    // :: ([Mark], [Mark]) → bool
    // Test whether two sets of marks are identical.

  }], [{
    key: "sameSet",
    value: function sameSet(a, b) {
      if (a == b) return true;
      if (a.length != b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!a[i].eq(b[i])) return false;
      }return true;
    }

    // :: (?union<Mark, [Mark]>) → [Mark]
    // Create a properly sorted mark set from null, a single mark, or an
    // unsorted array of marks.

  }, {
    key: "setFrom",
    value: function setFrom(marks) {
      if (!marks || marks.length == 0) return empty;
      if (marks instanceof Mark) return [marks];
      var copy = marks.slice();
      copy.sort(function (a, b) {
        return a.type.rank - b.type.rank;
      });
      return copy;
    }
  }]);

  return Mark;
}();

var empty = [];
},{}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TextNode = exports.Node = undefined;

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fragment = require("./fragment");

var _mark = require("./mark");

var _pos = require("./pos");

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var emptyArray = [],
    emptyAttrs = Object.create(null);

// ;; This class represents a node in the tree that makes up a
// ProseMirror document. So a document is an instance of `Node`, with
// children that are also instances of `Node`.
//
// Nodes are persistent data structures. Instead of changing them, you
// create new ones with the content you want. Old ones keep pointing
// at the old document shape. This is made cheaper by sharing
// structure between the old and new data as much as possible, which a
// tree shape like this (without back pointers) makes easy.
//
// **Never** directly mutate the properties of a `Node` object. See
// [this guide](guide/doc.html) for more information.

var Node = function () {
  function Node(type, attrs, content, marks) {
    _classCallCheck(this, Node);

    // :: NodeType
    // The type of node that this is.
    this.type = type;

    // :: Object
    // An object mapping attribute names to string values. The kind of
    // attributes allowed and required are determined by the node
    // type.
    this.attrs = attrs;

    // :: Fragment
    // The node's content.
    this.content = content || _fragment.emptyFragment;

    // :: [Mark]
    // The marks (things like whether it is emphasized or part of a
    // link) associated with this node.
    this.marks = marks || emptyArray;
  }

  // :: number
  // The size of the node's content, which is the maximum offset in
  // the node. For nodes that don't contain text, this is also the
  // number of child nodes that the node has.


  _createClass(Node, [{
    key: "child",


    // :: (number) → Node
    // Retrieve the child at the given offset. Note that this is **not**
    // the appropriate way to loop over a node. `child`'s complexity may
    // be non-constant for some nodes, and it will return the same node
    // multiple times when calling it for different offsets within a
    // text node.
    value: function child(off) {
      return this.content.child(off);
    }

    // :: (?number, ?number) → Iterator<Node>
    // Create an iterator over this node's children, optionally starting
    // and ending at a given offset.

  }, {
    key: "iter",
    value: function iter(start, end) {
      return this.content.iter(start, end);
    }

    // :: (?number, ?number) → Iterator<Node>
    // Create a reverse iterator (iterating from the node's end towards
    // its start) over this node's children, optionally starting and
    // ending at a given offset. **Note**: if given, `start` should be
    // greater than (or equal) to `end`.

  }, {
    key: "reverseIter",
    value: function reverseIter(start, end) {
      return this.content.reverseIter(start, end);
    }

    // :: (number) → {start: number, node: Node}
    // Find the node that sits before a given offset. Can be used to
    // find out which text node covers a given offset. The `start`
    // property of the return value is the starting offset of the
    // returned node. It is an error to call this with offset 0.

  }, {
    key: "chunkBefore",
    value: function chunkBefore(off) {
      return this.content.chunkBefore(off);
    }

    // :: (number) → {start: number, node: Node}
    // Find the node that sits after a given offset. The `start`
    // property of the return value is the starting offset of the
    // returned node. It is an error to call this with offset
    // corresponding to the end of the node.

  }, {
    key: "chunkAfter",
    value: function chunkAfter(off) {
      return this.content.chunkAfter(off);
    }

    // :: ((node: Node, start: number, end: number))
    // Call the given function for each child node. The function will be
    // given the node, as well as its start and end offsets, as
    // arguments.

  }, {
    key: "forEach",
    value: function forEach(f) {
      this.content.forEach(f);
    }

    // :: string
    // Concatenate all the text nodes found in this fragment and its
    // children.

  }, {
    key: "sameMarkup",


    // :: (Node) → bool
    // Compare the markup (type, attributes, and marks) of this node to
    // those of another. Returns `true` if both have the same markup.
    value: function sameMarkup(other) {
      return this.hasMarkup(other.type, other.attrs, other.marks);
    }

    // :: (NodeType, ?Object, ?[Mark]) → bool
    // Check whether this node's markup correspond to the given type,
    // attributes, and marks.

  }, {
    key: "hasMarkup",
    value: function hasMarkup(type, attrs, marks) {
      return this.type == type && Node.sameAttrs(this.attrs, attrs || emptyAttrs) && _mark.Mark.sameSet(this.marks, marks || emptyArray);
    }
  }, {
    key: "copy",


    // :: (?Fragment) → Node
    // Create a new node with the same markup as this node, containing
    // the given content (or empty, if no content is given).
    value: function copy() {
      var content = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

      return new this.constructor(this.type, this.attrs, content, this.marks);
    }

    // :: ([Mark]) → Node
    // Create a copy of this node, with the given set of marks instead
    // of the node's own marks.

  }, {
    key: "mark",
    value: function mark(marks) {
      return new this.constructor(this.type, this.attrs, this.content, marks);
    }

    // :: (number, ?number) → Node
    // Create a copy of this node with only the content between the
    // given offsets. If `to` is not given, it defaults to the end of
    // the node.

  }, {
    key: "slice",
    value: function slice(from, to) {
      return this.copy(this.content.slice(from, to));
    }

    // :: (number, number, Fragment) → Node
    // Create a copy of this node with the content between the given
    // offsets replaced by the given fragment.

  }, {
    key: "splice",
    value: function splice(from, to, replace) {
      return this.copy(this.content.slice(0, from).append(replace).append(this.content.slice(to)));
    }

    // :: (Fragment, ?number, ?number) → Node
    // [Append](#Fragment.append) the given fragment to this node's
    // content, and create a new node with the result.

  }, {
    key: "append",
    value: function append(fragment) {
      var joinLeft = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
      var joinRight = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      return this.copy(this.content.append(fragment, joinLeft, joinRight));
    }

    // :: (number, Node) → Node
    // Return a copy of this node with the child at the given offset
    // replaced by the given node. **Note**: The offset should not fall
    // within a text node.

  }, {
    key: "replace",
    value: function replace(pos, node) {
      return this.copy(this.content.replace(pos, node));
    }

    // :: ([number], Node) → Node
    // Return a copy of this node with the descendant at `path` replaced
    // by the given replacement node. This will copy as many sub-nodes as
    // there are elements in `path`.

  }, {
    key: "replaceDeep",
    value: function replaceDeep(path, node) {
      var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      if (depth == path.length) return node;
      var pos = path[depth];
      return this.replace(pos, this.child(pos).replaceDeep(path, node, depth + 1));
    }

    // :: (number, string) → Node
    // “Close” this node by making sure that, if it is empty, and is not
    // allowed to be so, it has its default content inserted. When depth
    // is greater than zero, sub-nodes at the given side (which can be
    // `"start"` or `"end"`) are closed too. Returns itself if no work
    // is necessary, or a closed copy if something did need to happen.

  }, {
    key: "close",
    value: function close(depth, side) {
      if (depth == 0 && this.size == 0 && !this.type.canBeEmpty) return this.copy(this.type.defaultContent());
      var closedContent = undefined;
      if (depth > 0 && (closedContent = this.content.close(depth - 1, side)) != this.content) return this.copy(closedContent);
      return this;
    }

    // :: ([number]) → Node
    // Get the descendant node at the given path, which is interpreted
    // as a series of offsets into successively deeper nodes. For example,
    // if a node contains a paragraph and a list with 3 items, the path
    // to the first item in the list would be [1, 0].

  }, {
    key: "path",
    value: function path(_path) {
      for (var i = 0, node = this; i < _path.length; node = node.child(_path[i]), i++) {}
      return node;
    }

    // :: (Pos) → ?Node
    // Get the node after the given position, if any.

  }, {
    key: "nodeAfter",
    value: function nodeAfter(pos) {
      var parent = this.path(pos.path);
      return pos.offset < parent.size ? parent.child(pos.offset) : null;
    }

    // :: ([number]) → [Node]
    // Get an array of all nodes along a path.

  }, {
    key: "pathNodes",
    value: function pathNodes(path) {
      var nodes = [];
      for (var i = 0, node = this;; i++) {
        nodes.push(node);
        if (i == path.length) break;
        node = node.child(path[i]);
      }
      return nodes;
    }

    // :: (Pos, Pos) → {from: Pos, to: Pos}
    // Finds the narrowest sibling range (two positions that both point
    // into the same node) that encloses the given positions.

  }, {
    key: "siblingRange",
    value: function siblingRange(from, to) {
      for (var i = 0, node = this;; i++) {
        if (node.isTextblock) {
          var path = from.path.slice(0, i - 1),
              offset = from.path[i - 1];
          return { from: new _pos.Pos(path, offset), to: new _pos.Pos(path, offset + 1) };
        }
        var fromEnd = i == from.path.length,
            toEnd = i == to.path.length;
        var left = fromEnd ? from.offset : from.path[i];
        var right = toEnd ? to.offset : to.path[i];
        if (fromEnd || toEnd || left != right) {
          var path = from.path.slice(0, i);
          return { from: new _pos.Pos(path, left), to: new _pos.Pos(path, right + (toEnd ? 0 : 1)) };
        }
        node = node.child(left);
      }
    }

    // :: (?Pos, ?Pos, (node: Node, path: [number], parent: Node))
    // Iterate over all nodes between the given two positions, calling
    // the callback with the node, the path towards it, and its parent
    // node, as arguments. `from` and `to` may be `null` to denote
    // starting at the start of the node or ending at its end. Note that
    // the path passed to the callback is mutated as iteration
    // continues, so if you want to preserve it, make a copy.

  }, {
    key: "nodesBetween",
    value: function nodesBetween(from, to, f) {
      var path = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];
      var parent = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

      if (f(this, path, parent) === false) return;
      this.content.nodesBetween(from, to, f, path, this);
    }

    // :: (?Pos, ?Pos, (node: Node, path: [number], start: number, end: number, parent: Node))
    // Calls the given function for each inline node between the two
    // given positions. Pass null for `from` or `to` to start or end at
    // the start or end of the node.

  }, {
    key: "inlineNodesBetween",
    value: function inlineNodesBetween(from, to, f) {
      this.nodesBetween(from, to, function (node, path, parent) {
        if (node.isInline) {
          var last = path.length - 1;
          f(node, path.slice(0, last), path[last], path[last] + node.width, parent);
        }
      });
    }

    // :: (?Pos, ?Pos) → Node
    // Returns a copy of this node containing only the content between
    // `from` and `to`. You can pass `null` for either of them to start
    // or end at the start or end of the node.

  }, {
    key: "sliceBetween",
    value: function sliceBetween(from, to) {
      var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      return this.copy(this.content.sliceBetween(from, to, depth));
    }

    // :: (Pos) → [Mark]
    // Get the marks of the node before the given position or, if that
    // position is at the start of a non-empty node, those of the node
    // after it.

  }, {
    key: "marksAt",
    value: function marksAt(pos) {
      var parent = this.path(pos.path);
      if (!parent.isTextblock || !parent.size) return emptyArray;
      return parent.chunkBefore(pos.offset || 1).node.marks;
    }

    // :: (?Pos, ?Pos, MarkType) → bool
    // Test whether a mark of the given type occurs in this document
    // between the two given positions.

  }, {
    key: "rangeHasMark",
    value: function rangeHasMark(from, to, type) {
      var found = false;
      this.nodesBetween(from, to, function (node) {
        if (type.isInSet(node.marks)) found = true;
      });
      return found;
    }

    // :: bool
    // True when this is a block (non-inline node)

  }, {
    key: "toString",


    // :: () → string
    // Return a string representation of this node for debugging
    // purposes.
    value: function toString() {
      var name = this.type.name;
      if (this.content.size) name += "(" + this.content.toString() + ")";
      return wrapMarks(this.marks, name);
    }

    // :: () → Object
    // Return a JSON-serializeable representation of this node.

  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = { type: this.type.name };
      for (var _ in this.attrs) {
        obj.attrs = this.attrs;
        break;
      }
      if (this.size) obj.content = this.content.toJSON();
      if (this.marks.length) obj.marks = this.marks.map(function (n) {
        return n.toJSON();
      });
      return obj;
    }

    // This is a hack to be able to treat a node object as an iterator result

  }, {
    key: "size",
    get: function get() {
      return this.content.size;
    }

    // :: number
    // The width of this node. Always 1 for non-text nodes, and the
    // length of the text for text nodes.

  }, {
    key: "width",
    get: function get() {
      return 1;
    }
  }, {
    key: "textContent",
    get: function get() {
      return this.content.textContent;
    }

    // :: ?Node
    // Returns this node's first child, or `null` if there are no
    // children.

  }, {
    key: "firstChild",
    get: function get() {
      return this.content.firstChild;
    }

    // :: ?Node
    // Returns this node's last child, or `null` if there are no
    // children.

  }, {
    key: "lastChild",
    get: function get() {
      return this.content.lastChild;
    }
  }, {
    key: "isBlock",
    get: function get() {
      return this.type.isBlock;
    }

    // :: bool
    // True when this is a textblock node, a block node with inline
    // content.

  }, {
    key: "isTextblock",
    get: function get() {
      return this.type.isTextblock;
    }

    // :: bool
    // True when this is an inline node (a text node or a node that can
    // appear among text).

  }, {
    key: "isInline",
    get: function get() {
      return this.type.isInline;
    }

    // :: bool
    // True when this is a text node.

  }, {
    key: "isText",
    get: function get() {
      return this.type.isText;
    }
  }, {
    key: "value",
    get: function get() {
      return this;
    }

    // :: (Schema, Object) → Node
    // Deserialize a node from its JSON representation.

  }], [{
    key: "sameAttrs",
    value: function sameAttrs(a, b) {
      if (a == b) return true;
      for (var prop in a) {
        if (a[prop] !== b[prop]) return false;
      }return true;
    }
  }, {
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      var type = schema.nodeType(json.type);
      var content = json.text != null ? json.text : _fragment.Fragment.fromJSON(schema, json.content);
      return type.create(json.attrs, content, json.marks && json.marks.map(schema.markFromJSON));
    }
  }]);

  return Node;
}();

exports.Node = Node;


if (typeof Symbol != "undefined") {
  // :: () → Iterator<Node>
  // A fragment is iterable, in the ES6 sense.
  Node.prototype[Symbol.iterator] = function () {
    return this.iter();
  };
}

// ;; #forward=Node

var TextNode = exports.TextNode = function (_Node) {
  _inherits(TextNode, _Node);

  function TextNode(type, attrs, content, marks) {
    _classCallCheck(this, TextNode);

    // :: ?string
    // For text nodes, this contains the node's text content.

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(TextNode).call(this, type, attrs, null, marks));

    _this.text = content;
    return _this;
  }

  _createClass(TextNode, [{
    key: "toString",
    value: function toString() {
      return wrapMarks(this.marks, JSON.stringify(this.text));
    }
  }, {
    key: "mark",
    value: function mark(marks) {
      return new TextNode(this.type, this.attrs, this.text, marks);
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var base = _get(Object.getPrototypeOf(TextNode.prototype), "toJSON", this).call(this);
      base.text = this.text;
      return base;
    }
  }, {
    key: "textContent",
    get: function get() {
      return this.text;
    }
  }, {
    key: "width",
    get: function get() {
      return this.text.length;
    }
  }]);

  return TextNode;
}(Node);

function wrapMarks(marks, str) {
  for (var i = marks.length - 1; i >= 0; i--) {
    str = marks[i].type.name + "(" + str + ")";
  }return str;
}
},{"./fragment":7,"./mark":9,"./pos":11}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Pos = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _error = require("./error");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; Instances of the `Pos` class represent positions in a document.
// A position is an array of integers that describe a path to the target
// node (see `Node.path`) and an integer offset into that target node.

var Pos = exports.Pos = function () {
  // :: (path: [number], number)

  function Pos(path, offset) {
    _classCallCheck(this, Pos);

    // :: [number] The path to the target node.
    this.path = path;
    // :: number The offset into the target node.
    this.offset = offset;
  }

  // ;; Return a string representation of the path of the form
  // `"0/2:10"`, where the numbers before the colon are the path, and
  // the number after it is the offset.


  _createClass(Pos, [{
    key: "toString",
    value: function toString() {
      return this.path.join("/") + ":" + this.offset;
    }

    // :: number
    // The length of the position's path.

  }, {
    key: "max",


    // :: (Pos) → Pos
    // Return the greater of two positions.
    value: function max(other) {
      return this.cmp(other) > 0 ? this : other;
    }

    // :: (Pos) → Pos
    // Return the lesser of two positions.

  }, {
    key: "min",
    value: function min(other) {
      return this.cmp(other) < 0 ? this : other;
    }

    // :: ([number], [number]) → bool
    // Compares two paths and returns true when they are the same.

  }, {
    key: "cmp",


    // :: (Pos) → number
    // Compares this position to another position, and returns a number.
    // Of this result number, only the sign is significant. It is
    // negative if this position is less than the other one, zero if
    // they are the same, and positive if this position is greater.
    value: function cmp(other) {
      if (other == this) return 0;
      return Pos.cmp(this.path, this.offset, other.path, other.offset);
    }
  }, {
    key: "shorten",


    // :: (?number, ?number) → Pos
    // Create a position pointing into a parent of this position's
    // target. When `to` is given, it determines the new length of the
    // path. By default, the path becomes one shorter. The `offset`
    // parameter can be used to determine where in this parent the
    // position points. By default, it points before the old target. You
    // can pass a negative or positive integer to move it backward or
    // forward (**note**: this method performs no bounds checking).
    value: function shorten() {
      var to = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
      var offset = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      if (to >= this.depth) {
        if (to == this.depth && !offset) return new Pos(this.path, this.offset + offset);else _error.ModelError.raise("Invalid shorten depth " + to + " for " + this);
      }
      return Pos.shorten(this.path, to, offset);
    }

    // :: (number) → Pos
    // Create a position with an offset moved relative to this
    // position's offset. For example moving `0/1:10` by `-2` yields
    // `0/1:8`.

  }, {
    key: "move",
    value: function move(by) {
      return new Pos(this.path, this.offset + by);
    }

    // :: (?number) → [number]
    // Convert this position to an array of numbers (including its
    // offset). Optionally pass an argument to adjust the value of the
    // offset.

  }, {
    key: "toPath",
    value: function toPath() {
      var move = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

      return this.path.concat(this.offset + move);
    }
  }, {
    key: "extend",
    value: function extend(pos) {
      var path = this.path.slice(),
          add = this.offset;
      for (var i = 0; i < pos.path.length; i++) {
        path.push(pos.path[i] + add);
        add = 0;
      }
      return new Pos(path, pos.offset + add);
    }

    // :: (Node, ?bool) → bool
    // Checks whether this position is valid in the given document. When
    // `requireTextblock` is true, only positions inside textblocks are
    // considered valid.

  }, {
    key: "isValid",
    value: function isValid(doc, requireTextblock) {
      for (var i = 0, node = doc;; i++) {
        if (i == this.path.length) {
          if (requireTextblock && !node.isTextblock) return false;
          return this.offset <= node.size;
        } else {
          var n = this.path[i];
          if (n >= node.size) return false;
          node = node.child(n);
        }
      }
    }

    // :: () → Object
    // Convert the position to a JSON-safe representation.

  }, {
    key: "toJSON",
    value: function toJSON() {
      return this;
    }

    // :: ([number], ?number) → Pos
    // Build a position from an array of numbers (as in
    // [`toPath`](#Pos.toPath)), taking the last element of the array as
    // offset and optionally moving it by `move`.

  }, {
    key: "depth",
    get: function get() {
      return this.path.length;
    }
  }], [{
    key: "cmp",
    value: function cmp(pathA, offsetA, pathB, offsetB) {
      var lenA = pathA.length,
          lenB = pathB.length;
      for (var i = 0, end = Math.min(lenA, lenB); i < end; i++) {
        var diff = pathA[i] - pathB[i];
        if (diff != 0) return diff;
      }
      if (lenA > lenB) return offsetB <= pathA[i] ? 1 : -1;else if (lenB > lenA) return offsetA <= pathB[i] ? -1 : 1;else return offsetA - offsetB;
    }
  }, {
    key: "samePath",
    value: function samePath(pathA, pathB) {
      if (pathA.length != pathB.length) return false;
      for (var i = 0; i < pathA.length; i++) {
        if (pathA[i] !== pathB[i]) return false;
      }return true;
    }
  }, {
    key: "shorten",
    value: function shorten(path) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
      var offset = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      if (to == null) to = path.length - 1;
      return new Pos(path.slice(0, to), path[to] + offset);
    }
  }, {
    key: "from",
    value: function from(array) {
      var move = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      if (!array.length) _error.ModelError.raise("Can't create a pos from an empty array");
      return new Pos(array.slice(0, array.length - 1), array[array.length - 1] + move);
    }

    // :: (Object) → Pos
    // Create a position from a JSON representation.

  }, {
    key: "fromJSON",
    value: function fromJSON(json) {
      return new Pos(json.path, json.offset);
    }
  }]);

  return Pos;
}();
},{"./error":6}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Schema = exports.SchemaSpec = exports.MarkType = exports.Attribute = exports.Text = exports.Inline = exports.Textblock = exports.Block = exports.NodeType = exports.SchemaError = undefined;

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _node = require("./node");

var _fragment = require("./fragment");

var _mark = require("./mark");

var _obj = require("../util/obj");

var _error = require("../util/error");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; The exception type used to signal schema-related
// errors.

var SchemaError = exports.SchemaError = function (_ProseMirrorError) {
  _inherits(SchemaError, _ProseMirrorError);

  function SchemaError() {
    _classCallCheck(this, SchemaError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(SchemaError).apply(this, arguments));
  }

  return SchemaError;
}(_error.ProseMirrorError);

// ;; The [node](#NodeType) and [mark](#MarkType) types
// that make up a schema have several things in common—they support
// attributes, and you can [register](#SchemaItem.register) values
// with them. This class implements this functionality, and acts as a
// superclass to those `NodeType` and `MarkType`.


var SchemaItem = function () {
  function SchemaItem() {
    _classCallCheck(this, SchemaItem);
  }

  _createClass(SchemaItem, [{
    key: "getDefaultAttrs",


    // For node types where all attrs have a default value (or which don't
    // have any attributes), build up a single reusable default attribute
    // object, and use it for all nodes that don't specify specific
    // attributes.
    value: function getDefaultAttrs() {
      var defaults = Object.create(null);
      for (var attrName in this.attrs) {
        var attr = this.attrs[attrName];
        if (attr.default == null) return null;
        defaults[attrName] = attr.default;
      }
      return defaults;
    }
  }, {
    key: "computeAttrs",
    value: function computeAttrs(attrs, arg) {
      var built = Object.create(null);
      for (var name in this.attrs) {
        var value = attrs && attrs[name];
        if (value == null) {
          var attr = this.attrs[name];
          if (attr.default != null) value = attr.default;else if (attr.compute) value = attr.compute(this, arg);else SchemaError.raise("No value supplied for attribute " + name);
        }
        built[name] = value;
      }
      return built;
    }
  }, {
    key: "freezeAttrs",
    value: function freezeAttrs() {
      var frozen = Object.create(null);
      for (var name in this.attrs) {
        frozen[name] = this.attrs[name];
      }Object.defineProperty(this, "attrs", { value: frozen });
    }
  }, {
    key: "attrs",

    // :: Object<Attribute>
    // The set of attributes to associate with each node or mark of this
    // type.
    get: function get() {
      return {};
    }

    // :: (Object<?Attribute>)
    // Add or remove attributes from this type. Expects an object
    // mapping names to either attributes (to add) or null (to remove
    // the attribute by that name).

  }], [{
    key: "updateAttrs",
    value: function updateAttrs(attrs) {
      Object.defineProperty(this.prototype, "attrs", { value: overlayObj(this.prototype.attrs, attrs) });
    }
  }, {
    key: "getRegistry",
    value: function getRegistry() {
      if (this == SchemaItem) return null;
      if (!this.prototype.hasOwnProperty("registry")) this.prototype.registry = Object.create(Object.getPrototypeOf(this).getRegistry());
      return this.prototype.registry;
    }
  }, {
    key: "getNamespace",
    value: function getNamespace(name) {
      if (this == SchemaItem) return null;
      var reg = this.getRegistry();
      if (!Object.prototype.hasOwnProperty.call(reg, name)) reg[name] = Object.create(Object.getPrototypeOf(this).getNamespace(name));
      return reg[name];
    }

    // :: (string, string, *)
    // Register a value in this type's registry. Various components use
    // `Schema.registry` to query values from the marks and nodes that
    // make up the schema. The `namespace`, for example
    // [`"command"`](#commands), determines which component will see
    // this value. `name` is a name specific to this value. Its meaning
    // differs per namespace.
    //
    // Subtypes inherit the registered values from their supertypes.
    // They can override individual values by calling this method to
    // overwrite them with a new value, or with `null` to disable them.

  }, {
    key: "register",
    value: function register(namespace, name, value) {
      this.getNamespace(namespace)[name] = function () {
        return value;
      };
    }

    // :: (string, string, (SchemaItem) → *)
    // Register a value in this types's registry, like
    // [`register`](#SchemaItem.register), but providing a function that
    // will be called with the actual node or mark type, whose return
    // value will be treated as the effective value (or will be ignored,
    // if `null`).

  }, {
    key: "registerComputed",
    value: function registerComputed(namespace, name, f) {
      this.getNamespace(namespace)[name] = f;
    }

    // :: (string)
    // By default, schema items inherit the
    // [registered](#SchemaItem.register) items from their superclasses.
    // Call this to disable that behavior for the given namespace.

  }, {
    key: "cleanNamespace",
    value: function cleanNamespace(namespace) {
      this.getNamespace(namespace).__proto__ = null;
    }
  }]);

  return SchemaItem;
}();

// ;; Node types are objects allocated once per `Schema`
// and used to tag `Node` instances with a type. They are
// instances of sub-types of this class, and contain information about
// the node type (its name, its allowed attributes, methods for
// serializing it to various formats, information to guide
// deserialization, and so on).


var NodeType = exports.NodeType = function (_SchemaItem) {
  _inherits(NodeType, _SchemaItem);

  function NodeType(name, kind, schema) {
    _classCallCheck(this, NodeType);

    // :: string
    // The name the node type has in this schema.

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(NodeType).call(this));

    _this2.name = name;
    _this2.kind = kind;
    // Freeze the attributes, to avoid calling a potentially expensive
    // getter all the time.
    _this2.freezeAttrs();
    _this2.defaultAttrs = _this2.getDefaultAttrs();
    // :: Schema
    // A link back to the `Schema` the node type belongs to.
    _this2.schema = schema;
    return _this2;
  }

  // :: bool
  // True if this is a block type.


  _createClass(NodeType, [{
    key: "canContainFragment",


    // :: (Fragment) → bool
    // Test whether the content of the given fragment could be contained
    // in this node type.
    value: function canContainFragment(fragment) {
      var _this3 = this;

      var ok = true;
      fragment.forEach(function (n) {
        if (!_this3.canContain(n)) ok = false;
      });
      return ok;
    }

    // :: (Node) → bool
    // Test whether the given node could be contained in this node type.

  }, {
    key: "canContain",
    value: function canContain(node) {
      if (!this.canContainType(node.type)) return false;
      for (var i = 0; i < node.marks.length; i++) {
        if (!this.canContainMark(node.marks[i])) return false;
      }return true;
    }

    // :: (MarkType) → bool
    // Test whether this node type can contain children with the given
    // mark type.

  }, {
    key: "canContainMark",
    value: function canContainMark(mark) {
      var contains = this.containsMarks;
      if (contains === true) return true;
      if (contains) for (var i = 0; i < contains.length; i++) {
        if (contains[i] == mark.name) return true;
      }return false;
    }

    // :: (NodeType) → bool
    // Test whether this node type can contain nodes of the given node
    // type.

  }, {
    key: "canContainType",
    value: function canContainType(type) {
      return this.schema.subKind(type.kind, this.contains);
    }

    // :: (NodeType) → bool
    // Test whether the nodes that can be contained in the given node
    // type are a sub-type of the nodes that can be contained in this
    // type.

  }, {
    key: "canContainContent",
    value: function canContainContent(type) {
      return this.schema.subKind(type.contains, this.contains);
    }

    // :: (NodeType) → ?[NodeType]
    // Find a set of intermediate node types, possibly empty, that have
    // to be inserted between this type and `other` to put a node of
    // type `other` into this type.

  }, {
    key: "findConnection",
    value: function findConnection(other) {
      if (this.canContainType(other)) return [];

      var seen = Object.create(null);
      var active = [{ from: this, via: [] }];
      while (active.length) {
        var current = active.shift();
        for (var name in this.schema.nodes) {
          var type = this.schema.nodes[name];
          if (type.defaultAttrs && !(type.contains in seen) && current.from.canContainType(type)) {
            var via = current.via.concat(type);
            if (type.canContainType(other)) return via;
            active.push({ from: type, via: via });
            seen[type.contains] = true;
          }
        }
      }
    }
  }, {
    key: "computeAttrs",
    value: function computeAttrs(attrs, content) {
      if (!attrs && this.defaultAttrs) return this.defaultAttrs;else return _get(Object.getPrototypeOf(NodeType.prototype), "computeAttrs", this).call(this, attrs, content);
    }

    // :: (?Object, ?union<Fragment, Node, [Node]>, ?[Mark]) → Node
    // Create a `Node` of this type. The given attributes are
    // checked and defaulted (you can pass `null` to use the type's
    // defaults entirely, if no required attributes exist). `content`
    // may be a `Fragment`, a node, an array of nodes, or
    // `null`. Similarly `marks` may be `null` to default to the empty
    // set of marks.

  }, {
    key: "create",
    value: function create(attrs, content, marks) {
      return new _node.Node(this, this.computeAttrs(attrs, content), _fragment.Fragment.from(content), _mark.Mark.setFrom(marks));
    }
  }, {
    key: "createAutoFill",
    value: function createAutoFill(attrs, content, marks) {
      if ((!content || content.length == 0) && !this.canBeEmpty) content = this.defaultContent();
      return this.create(attrs, content, marks);
    }

    // :: bool
    // Controls whether this node is allowed to be empty.

  }, {
    key: "isBlock",
    get: function get() {
      return false;
    }

    // :: bool
    // True if this is a textblock type, a block that contains inline
    // content.

  }, {
    key: "isTextblock",
    get: function get() {
      return false;
    }

    // :: bool
    // True if this is an inline type.

  }, {
    key: "isInline",
    get: function get() {
      return false;
    }

    // :: bool
    // True if this is the text node type.

  }, {
    key: "isText",
    get: function get() {
      return false;
    }

    // :: bool
    // Controls whether nodes of this type can be selected (as a user
    // node selection).

  }, {
    key: "selectable",
    get: function get() {
      return true;
    }

    // :: bool
    // Determines whether nodes of this type can be dragged. Enabling it
    // causes ProseMirror to set a `draggable` attribute on its DOM
    // representation, and to put its HTML serialization into the drag
    // event's [data
    // transfer](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer)
    // when dragged.

  }, {
    key: "draggable",
    get: function get() {
      return false;
    }

    // :: bool
    // Controls whether this node type is locked.

  }, {
    key: "locked",
    get: function get() {
      return false;
    }

    // :: ?string
    // The kind of nodes this node may contain. `null` means it's a
    // leaf node.

  }, {
    key: "contains",
    get: function get() {
      return null;
    }

    // :: string
    // Controls the _kind_ of the node, which is used to determine valid
    // parent/child [relations](#NodeType.contains). Should be a single
    // name or space-separated string of kind names, where later names
    // are considered to be sub-kinds of former ones (for example
    // `"textblock paragraph"`). When you want to extend the superclass'
    // set of kinds, you can do something like
    //
    //     static get kinds() { return super.kind + " mykind" }

  }, {
    key: "canBeEmpty",
    get: function get() {
      return true;
    }
  }, {
    key: "containsMarks",


    // :: union<bool, [string]>
    // The mark types that child nodes of this node may have. `false`
    // means no marks, `true` means any mark, and an array of strings
    // can be used to explicitly list the allowed mark types.
    get: function get() {
      return false;
    }
  }], [{
    key: "compile",
    value: function compile(types, schema) {
      var result = Object.create(null);
      for (var name in types) {
        var type = types[name];
        var kinds = type.kinds.split(" ");
        for (var i = 0; i < kinds.length; i++) {
          schema.registerKind(kinds[i], i ? kinds[i - 1] : null);
        }result[name] = new type(name, kinds[kinds.length - 1], schema);
      }
      for (var name in result) {
        var contains = result[name].contains;
        if (contains && !(contains in schema.kinds)) SchemaError.raise("Node type " + name + " is specified to contain non-existing kind " + contains);
      }
      if (!result.doc) SchemaError.raise("Every schema needs a 'doc' type");
      if (!result.text) SchemaError.raise("Every schema needs a 'text' type");

      return result;
    }
  }, {
    key: "kinds",
    get: function get() {
      return "node";
    }
  }]);

  return NodeType;
}(SchemaItem);

// ;; Base type for block nodetypes.


var Block = exports.Block = function (_NodeType) {
  _inherits(Block, _NodeType);

  function Block() {
    _classCallCheck(this, Block);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Block).apply(this, arguments));
  }

  _createClass(Block, [{
    key: "defaultContent",
    value: function defaultContent() {
      var inner = this.schema.defaultTextblockType().create();
      var conn = this.findConnection(inner.type);
      if (!conn) SchemaError.raise("Can't create default content for " + this.name);
      for (var i = conn.length - 1; i >= 0; i--) {
        inner = conn[i].create(null, inner);
      }return _fragment.Fragment.from(inner);
    }
  }, {
    key: "contains",
    get: function get() {
      return "block";
    }
  }, {
    key: "isBlock",
    get: function get() {
      return true;
    }
  }, {
    key: "canBeEmpty",
    get: function get() {
      return this.contains == null;
    }
  }], [{
    key: "kinds",
    get: function get() {
      return "block";
    }
  }]);

  return Block;
}(NodeType);

// ;; Base type for textblock node types.


var Textblock = exports.Textblock = function (_Block) {
  _inherits(Textblock, _Block);

  function Textblock() {
    _classCallCheck(this, Textblock);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Textblock).apply(this, arguments));
  }

  _createClass(Textblock, [{
    key: "contains",
    get: function get() {
      return "inline";
    }
  }, {
    key: "containsMarks",
    get: function get() {
      return true;
    }
  }, {
    key: "isTextblock",
    get: function get() {
      return true;
    }
  }, {
    key: "canBeEmpty",
    get: function get() {
      return true;
    }
  }]);

  return Textblock;
}(Block);

// ;; Base type for inline node types.


var Inline = exports.Inline = function (_NodeType2) {
  _inherits(Inline, _NodeType2);

  function Inline() {
    _classCallCheck(this, Inline);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Inline).apply(this, arguments));
  }

  _createClass(Inline, [{
    key: "isInline",
    get: function get() {
      return true;
    }
  }], [{
    key: "kinds",
    get: function get() {
      return "inline";
    }
  }]);

  return Inline;
}(NodeType);

// ;; The text node type.


var Text = exports.Text = function (_Inline) {
  _inherits(Text, _Inline);

  function Text() {
    _classCallCheck(this, Text);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Text).apply(this, arguments));
  }

  _createClass(Text, [{
    key: "create",
    value: function create(attrs, content, marks) {
      return new _node.TextNode(this, this.computeAttrs(attrs, content), content, marks);
    }
  }, {
    key: "selectable",
    get: function get() {
      return false;
    }
  }, {
    key: "isText",
    get: function get() {
      return true;
    }
  }], [{
    key: "kinds",
    get: function get() {
      return _get(Object.getPrototypeOf(Text), "kinds", this) + " text";
    }
  }]);

  return Text;
}(Inline);

// Attribute descriptors

// ;; Attributes are named strings associated with nodes and marks.
// Each node type or mark type has a fixed set of attributes, which
// instances of this class are used to control.


var Attribute =
// :: (Object)
// Create an attribute. `options` is an object containing the
// settings for the attributes. The following settings are
// supported:
//
// **`default`**`: ?string`
//   : The default value for this attribute, to choose when no
//     explicit value is provided.
//
// **`compute`**`: ?(Fragment) → string`
//   : A function that computes a default value for the attribute from
//     the node's content.
//
// **`label`**`: ?string`
//   : A user-readable text label associated with the attribute.
//
// Attributes that have no default or compute property must be
// provided whenever a node or mark of a type that has them is
// created.
exports.Attribute = function Attribute() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  _classCallCheck(this, Attribute);

  this.default = options.default;
  this.compute = options.compute;
  this.label = options.label;
};

// Marks

// ;; Like nodes, marks (which are associated with nodes to signify
// things like emphasis or being part of a link) are tagged with type
// objects, which are instantiated once per `Schema`.


var MarkType = exports.MarkType = function (_SchemaItem2) {
  _inherits(MarkType, _SchemaItem2);

  function MarkType(name, rank, schema) {
    _classCallCheck(this, MarkType);

    // :: string
    // The name of the mark type.

    var _this8 = _possibleConstructorReturn(this, Object.getPrototypeOf(MarkType).call(this));

    _this8.name = name;
    _this8.freezeAttrs();
    _this8.rank = rank;
    // :: Schema
    // The schema that this mark type instance is part of.
    _this8.schema = schema;
    var defaults = _this8.getDefaultAttrs();
    _this8.instance = defaults && new _mark.Mark(_this8, defaults);
    return _this8;
  }

  // :: number
  // Mark type ranks are used to determine the order in which mark
  // arrays are sorted. (If multiple mark types end up with the same
  // rank, they still get a fixed order in the schema, but there's no
  // guarantee what it will be.)


  _createClass(MarkType, [{
    key: "create",


    // :: (Object) → Mark
    // Create a mark of this type. `attrs` may be `null` or an object
    // containing only some of the mark's attributes. The others, if
    // they have defaults, will be added.
    value: function create(attrs) {
      if (!attrs && this.instance) return this.instance;
      return new _mark.Mark(this, this.computeAttrs(attrs));
    }
  }, {
    key: "removeFromSet",


    // :: ([Mark]) → [Mark]
    // When there is a mark of this type in the given set, a new set
    // without it is returned. Otherwise, the input set is returned.
    value: function removeFromSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (set[i].type == this) return set.slice(0, i).concat(set.slice(i + 1));
      }return set;
    }

    // :: ([Mark]) → ?Mark
    // Tests whether there is a mark of this type in the given set.

  }, {
    key: "isInSet",
    value: function isInSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (set[i].type == this) return set[i];
      }
    }
  }], [{
    key: "getOrder",
    value: function getOrder(marks) {
      var sorted = [];
      for (var name in marks) {
        sorted.push({ name: name, rank: marks[name].rank });
      }sorted.sort(function (a, b) {
        return a.rank - b.rank;
      });
      var ranks = Object.create(null);
      for (var i = 0; i < sorted.length; i++) {
        ranks[sorted[i].name] = i;
      }return ranks;
    }
  }, {
    key: "compile",
    value: function compile(marks, schema) {
      var order = this.getOrder(marks);
      var result = Object.create(null);
      for (var name in marks) {
        result[name] = new marks[name](name, order[name], schema);
      }return result;
    }
  }, {
    key: "rank",
    get: function get() {
      return 50;
    }
  }]);

  return MarkType;
}(SchemaItem);

// Schema specifications are data structures that specify a schema --
// a set of node types, their names, attributes, and nesting behavior.

// ;; A schema specification is a blueprint for an actual
// `Schema`. It maps names to node and mark types, along
// with extra information, such as additional attributes and changes
// to node kinds and relations.
//
// A specification consists of an object that associates node names
// with node type constructors and another similar object associating
// mark names with mark type constructors.


var SchemaSpec = exports.SchemaSpec = function () {
  // :: (?Object<NodeType>, ?Object<MarkType>)
  // Create a schema specification from scratch. The arguments map
  // node names to node type constructors and mark names to mark type
  // constructors.

  function SchemaSpec(nodes, marks) {
    _classCallCheck(this, SchemaSpec);

    this.nodes = nodes || {};
    this.marks = marks || {};
  }

  // :: (?Object<?NodeType>, ?Object<?MarkType>) → SchemaSpec
  // Base a new schema spec on this one by specifying nodes and marks
  // to add or remove.
  //
  // When `nodes` is passed, it should be an object mapping type names
  // to either `null`, to delete the type of that name, or to a
  // `NodeType` subclass, to add or replace the node type of that
  // name.
  //
  // Similarly, `marks` can be an object to add, change, or remove
  // [mark types](#MarkType) in the schema.


  _createClass(SchemaSpec, [{
    key: "update",
    value: function update(nodes, marks) {
      return new SchemaSpec(nodes ? overlayObj(this.nodes, nodes) : this.nodes, marks ? overlayObj(this.marks, marks) : this.marks);
    }
  }]);

  return SchemaSpec;
}();

function overlayObj(base, update) {
  var copy = (0, _obj.copyObj)(base);
  for (var name in update) {
    var value = update[name];
    if (value == null) delete copy[name];else copy[name] = value;
  }
  return copy;
}

// ;; Each document is based on a single schema, which provides the
// node and mark types that it is made up of (which, in turn,
// determine the structure it is allowed to have).

var Schema = function () {
  // :: (SchemaSpec)
  // Construct a schema from a specification.

  function Schema(spec) {
    _classCallCheck(this, Schema);

    // :: SchemaSpec
    // The specification on which the schema is based.
    this.spec = spec;
    this.kinds = Object.create(null);

    // :: Object<NodeType>
    // An object mapping the schema's node names to node type objects.
    this.nodes = NodeType.compile(spec.nodes, this);
    // :: Object<MarkType>
    // A map from mark names to mark type objects.
    this.marks = MarkType.compile(spec.marks, this);
    for (var prop in this.nodes) {
      if (prop in this.marks) SchemaError.raise(prop + " can not be both a node and a mark");
    } // :: Object
    // An object for storing whatever values modules may want to
    // compute and cache per schema. (If you want to store something
    // in it, try to use property names unlikely to clash.)
    this.cached = Object.create(null);

    this.node = this.node.bind(this);
    this.text = this.text.bind(this);
    this.nodeFromJSON = this.nodeFromJSON.bind(this);
    this.markFromJSON = this.markFromJSON.bind(this);
  }

  // :: (union<string, NodeType>, ?Object, ?union<Fragment, Node, [Node]>, ?[Mark]) → Node
  // Create a node in this schema. The `type` may be a string or a
  // `NodeType` instance. Attributes will be extended
  // with defaults, `content` may be a `Fragment`,
  // `null`, a `Node`, or an array of nodes.
  //
  // When creating a text node, `content` should be a string and is
  // interpreted as the node's text.
  //
  // This method is bound to the Schema, meaning you don't have to
  // call it as a method, but can pass it to higher-order functions
  // and such.


  _createClass(Schema, [{
    key: "node",
    value: function node(type, attrs, content, marks) {
      if (typeof type == "string") type = this.nodeType(type);else if (!(type instanceof NodeType)) SchemaError.raise("Invalid node type: " + type);else if (type.schema != this) SchemaError.raise("Node type from different schema used (" + type.name + ")");

      return type.create(attrs, content, marks);
    }

    // :: (string, ?[Mark]) → Node
    // Create a text node in the schema. This method is bound to the Schema.

  }, {
    key: "text",
    value: function text(_text, marks) {
      return this.nodes.text.create(null, _text, _mark.Mark.setFrom(marks));
    }

    // :: () → ?NodeType
    // Return the default textblock type for this schema, or `null` if
    // it does not contain a node type with a `defaultTextblock`
    // property.

  }, {
    key: "defaultTextblockType",
    value: function defaultTextblockType() {
      var cached = this.cached.defaultTextblockType;
      if (cached !== undefined) return cached;
      for (var name in this.nodes) {
        if (this.nodes[name].defaultTextblock) return this.cached.defaultTextblockType = this.nodes[name];
      }
      return this.cached.defaultTextblockType = null;
    }

    // :: (string, ?Object) → Mark
    // Create a mark with the named type

  }, {
    key: "mark",
    value: function mark(name, attrs) {
      var spec = this.marks[name] || SchemaError.raise("No mark named " + name);
      return spec.create(attrs);
    }

    // :: (Object) → Node
    // Deserialize a node from its JSON representation. This method is
    // bound.

  }, {
    key: "nodeFromJSON",
    value: function nodeFromJSON(json) {
      return _node.Node.fromJSON(this, json);
    }

    // :: (Object) → Mark
    // Deserialize a mark from its JSON representation. This method is
    // bound.

  }, {
    key: "markFromJSON",
    value: function markFromJSON(json) {
      var type = this.marks[json._];
      var attrs = null;
      for (var prop in json) {
        if (prop != "_") {
          if (!attrs) attrs = Object.create(null);
          attrs[prop] = json[prop];
        }
      }return attrs ? type.create(attrs) : type.instance;
    }

    // :: (string) → NodeType
    // Get the `NodeType` associated with the given name in
    // this schema, or raise an error if it does not exist.

  }, {
    key: "nodeType",
    value: function nodeType(name) {
      return this.nodes[name] || SchemaError.raise("Unknown node type: " + name);
    }
  }, {
    key: "registerKind",
    value: function registerKind(kind, sup) {
      if (kind in this.kinds) {
        if (this.kinds[kind] == sup) return;
        SchemaError.raise("Inconsistent superkinds for kind " + kind + ": " + sup + " and " + this.kinds[kind]);
      }
      if (this.subKind(kind, sup)) SchemaError.raise("Conflicting kind hierarchy through " + kind + " and " + sup);
      this.kinds[kind] = sup;
    }

    // :: (string, string) → bool
    // Test whether a node kind is a sub-kind of another kind.

  }, {
    key: "subKind",
    value: function subKind(sub, sup) {
      for (;;) {
        if (sub == sup) return true;
        sub = this.kinds[sub];
        if (!sub) return false;
      }
    }

    // :: (string, (name: string, value: *, source: union<NodeType, MarkType>, name: string))
    // Retrieve all registered items under the given name from this
    // schema. The given function will be called with the name, each item, the
    // element—node type or mark type—that it was associated with, and
    // that element's name in the schema.

  }, {
    key: "registry",
    value: function registry(namespace, f) {
      for (var i = 0; i < 2; i++) {
        var obj = i ? this.marks : this.nodes;
        for (var tname in obj) {
          var type = obj[tname],
              registry = type.registry,
              ns = registry && registry[namespace];
          if (ns) for (var prop in ns) {
            var value = ns[prop](type);
            if (value != null) f(prop, value, type, tname);
          }
        }
      }
    }
  }]);

  return Schema;
}();

exports.Schema = Schema;
},{"../util/error":13,"../util/obj":14,"./fragment":7,"./mark":9,"./node":10}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; Superclass for ProseMirror-related errors. Does some magic to
// make it safely subclassable even on ES5 runtimes.

var ProseMirrorError = exports.ProseMirrorError = function (_Error) {
  _inherits(ProseMirrorError, _Error);

  // :: (string)
  // Create an instance of this error type, capturing the current
  // stack.

  function ProseMirrorError(message) {
    _classCallCheck(this, ProseMirrorError);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ProseMirrorError).call(this, message));

    if (_this.message != message) {
      _this.message = message;
      if (Error.captureStackTrace) Error.captureStackTrace(_this, _this.name);else _this.stack = new Error(message).stack;
    }
    return _this;
  }

  _createClass(ProseMirrorError, [{
    key: "name",
    get: function get() {
      return this.constructor.name || functionName(this.constructor) || "ProseMirrorError";
    }

    // :: (string)
    // Raise an exception of this type, with the given message.
    // (Somewhat shorter than `throw new ...`, and can appear in
    // expression position.)

  }], [{
    key: "raise",
    value: function raise(message) {
      throw new this(message);
    }
  }]);

  return ProseMirrorError;
}(Error);

// ;; Error type used to signal miscellaneous invariant violations.


var AssertionError = exports.AssertionError = function (_ProseMirrorError) {
  _inherits(AssertionError, _ProseMirrorError);

  function AssertionError() {
    _classCallCheck(this, AssertionError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(AssertionError).apply(this, arguments));
  }

  return AssertionError;
}(ProseMirrorError);

// ;; Error type used to report name clashes or other violations in
// namespacing.


var NamespaceError = exports.NamespaceError = function (_ProseMirrorError2) {
  _inherits(NamespaceError, _ProseMirrorError2);

  function NamespaceError() {
    _classCallCheck(this, NamespaceError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(NamespaceError).apply(this, arguments));
  }

  return NamespaceError;
}(ProseMirrorError);

function functionName(f) {
  var match = /^function (\w+)/.exec(f.toString());
  return match && match[1];
}
},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyObj = copyObj;
function copyObj(obj, base) {
  var copy = base || Object.create(null);
  for (var prop in obj) {
    copy[prop] = obj[prop];
  }return copy;
}
},{}],15:[function(require,module,exports){
"use strict";

var _model = require("prosemirror/dist/model");

var _selection = require("prosemirror/dist/edit/selection");

/**
 * Helper functions for testing FidusWriter with Selenium.
 * @namespace testCaret
 */
var testCaret = {};

/**
 * Returns the current selection.
 * @function getCaret
 * @memberof testCaret
 * @returns {Caret}
 */
testCaret.getCaret = function getCaret() {
  return theEditor.editor.selection.from.toJSON();
};

/**
 * Sets an empty selection to caret.
 * @function setCaret
 * @memberof testCaret
 * @param {Selection} caret Selection.
 * @returns {Selection}
 */
testCaret.setCaret = function setCaret(caret) {
  return testCaret.setSelection(caret, caret);
};

/**
 * Sets the selection to be between two caret positions.
 * @function setSelection
 * @memberof testCaret
 * @param {caretOne} caretOne The first caret.
 * @param {caretTwo} caretTwo The second caret position.
 * @returns {Selection}
 */
testCaret.setSelection = function setSelection(caretOne, caretTwo) {
  var posOne = new _model.Pos(caretOne.path, caretOne.offset);
  var posTwo = new _model.Pos(caretTwo.path, caretTwo.offset);

  var selection = new _selection.TextSelection(posOne, posTwo);

  theEditor.editor.setSelection(selection);
  theEditor.editor.focus();

  return selection;
};

/**
 * Checks if the given selections are equal.
 * @function caretsMatch
 * @memberof testCaret
 * @param {Selection} left Caret to be compared.
 * @param {Selection} right Caret to be compared.
 * @returns {Boolean}
 */
testCaret.selectionsMatch = function selectionsMatch(left, right) {
  return left.eq(right);
};

window.testCaret = testCaret;

},{"prosemirror/dist/edit/selection":3,"prosemirror/dist/model":8}]},{},[15]);
