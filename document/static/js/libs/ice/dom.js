(function ($) {

	"use strict";

	var exports = this,
		dom = {},
		_browser = null,
		wsrgx = /^\s*$/,
		numrgx = /^\d+$/;

	dom.DOM_VK_DELETE = 8;
	dom.DOM_VK_LEFT = 37;
	dom.DOM_VK_UP = 38;
	dom.DOM_VK_RIGHT = 39;
	dom.DOM_VK_DOWN = 40;
	dom.DOM_VK_ENTER = 13;
	dom.ELEMENT_NODE = 1;
	dom.ATTRIBUTE_NODE = 2;
	dom.TEXT_NODE = 3;
	dom.CDATA_SECTION_NODE = 4;
	dom.ENTITY_REFERENCE_NODE = 5;
	dom.ENTITY_NODE = 6;
	dom.PROCESSING_INSTRUCTION_NODE = 7;
	dom.COMMENT_NODE = 8;
	dom.DOCUMENT_NODE = 9;
	dom.DOCUMENT_TYPE_NODE = 10;
	dom.DOCUMENT_FRAGMENT_NODE = 11;
	dom.NOTATION_NODE = 12;
	dom.CHARACTER_UNIT = 'character';
	dom.WORD_UNIT = 'word';
	dom.BREAK_ELEMENT = 'br';
	dom.PARAGRAPH_ELEMENT = 'p';
	dom.CONTENT_STUB_ELEMENTS = ['img', 'hr', 'iframe', 'param', 'link', 'meta', 'input', 'frame', 'col', 'base', 'area'];
	dom.BLOCK_ELEMENTS = ['body', 'p', 'div', 'pre', 'ul', 'ol', 'li', 'table', 'tbody', 'td', 'th', 'fieldset', 'form', 'blockquote', 'dl', 'dt', 'dd', 'dir', 'center', 'address', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
	dom.TEXT_CONTAINER_ELEMENTS = ['body','p', 'div', 'pre', 'span', 'b', 'strong', 'i', 'li', 'td', 'th', 'blockquote', 'dt', 'dd', 'center', 'address', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ins', 'del'];

	dom.STUB_ELEMENTS = dom.CONTENT_STUB_ELEMENTS.slice();
	dom.STUB_ELEMENTS.push(dom.BREAK_ELEMENT);

	var stubElementsString = dom.CONTENT_STUB_ELEMENTS.join(', ');

	function isEmptyString(str) {
		if (! str) {
			return true;
		}
		var len = str.length - 1, ch;
		while (len >= 0) {
			ch = str[len--];
			if (ch !== '\u200B' && ch !== '\uFEFF') {
				return false;
			}
		}
		return true;
	}

	dom.getKeyChar = function (e) {
		return String.fromCharCode(e.which);
	};
	dom.getClass = function (className, startElement, tagName) {
		if (!startElement) {
			startElement = document.body;
		}
		className = '.' + className.split(' ').join('.');
		if (tagName) {
			className = tagName + className;
		}
		return $.makeArray($(startElement).find(className));
	};
	dom.getId = function (id, startElement) {
		if (!startElement) {
			startElement = document;
		}
		element = startElement.getElementById(id);
		return element;
	};
	dom.getTag = function (tagName, startElement) {
		if (!startElement) {
			startElement = document;
		}
		return $.makeArray($(startElement).find(tagName));
	};
	dom.getElementWidth = function (element) {
		return element.offsetWidth;
	};
	dom.getElementHeight = function (element) {
		return element.offsetHeight;
	};
	dom.getElementDimensions = function (element) {
		return {
			'width': dom.getElementWidth(element),
			'height': dom.getElementHeight(element)
		};
	};
	dom.empty = function (element) {
		if (element) {
			return $(element).empty();
		}
	};
	dom.remove = function (element) {
		if (element) {
			return $(element).remove();
		}
	};
	dom.prepend = function (parent, elem) {
		$(parent).prepend(elem);
	};
	dom.append = function (parent, elem) {
		$(parent).append(elem);
	};
	dom.insertBefore = function (before, elem) {
		$(before).before(elem);
	};
	dom.insertAfter = function (after, elem) {
		if (after && elem) {
			var sibling = after.nextSibling,
				parent = after.parentNode;
			return sibling ? parent.insertBefore(elem, sibling) : parent.appendChild(elem);
		}
	};
	dom.getHtml = function (element) {
		return $(element).html();
	};
	dom.setHtml = function (element, content) {
		if (element) {
			$(element).html(content);
		}
	};
	// Remove whitespace/newlines between nested block elements
	// that are supported by ice.
	// For example the following element with innerHTML:
	//	 <div><p> para </p> <ul>	<li> hi </li>	</ul></div>
	// Will be converted to the following:
	//	 <div><p> para </p><ul><li> hi </li></ul></div>
	dom.removeWhitespace = function(element) {
		$(element).contents().filter(function() {
			// Ice supports UL and OL, so recurse in these blocks to
			// make sure that spaces don't exist between inner LI.
			if (this.nodeType != ice.dom.TEXT_NODE && this.nodeName == 'UL' || this.nodeName == 'OL') {
				dom.removeWhitespace(this);
				return false;
			} else if (this.nodeType != ice.dom.TEXT_NODE) {
				return false;
			} else {
				return !/\S/.test(this.nodeValue);
			}
		}).remove();
	};
	dom.contents = function (el) {
		return $.makeArray($(el).contents());
	};
	/**
	 * Returns the inner contents of `el` as a DocumentFragment.
	 */
	dom.extractContent = function (el) {
		var frag = document.createDocumentFragment(),
			child;
		while ((child = el.firstChild)) {
			frag.appendChild(child);
		}
		return frag;
  };

	/**
	 * Returns this `node` or the first parent tracking node that matches the given `selector`.
	 */
	dom.getNode = function (node, selector) {
		if (! node) return null;
// dfl switch to DOM node from dom.js node
		node = node.$ || node;
// dfl don't test text nodes
		return (node.nodeType != dom.TEXT_NODE && dom.is(node, selector)) ?
				node
				: dom.parents(node, selector)[0] || null;
	};

	dom.getParents = function (elements, filter, stopEl) {
		var res = $(elements).parents(filter);
		var ln = res.length;
		var ar = [];
		for (var i = 0; i < ln; i++) {
			if (res[i] === stopEl) {
				break;
			}
			ar.push(res[i]);
		}
		return ar;
	};
	dom.hasBlockChildren = function (parent) {
		var c = parent.childNodes.length;
		for (var i = 0; i < c; i++) {
			if (parent.childNodes[i].nodeType === dom.ELEMENT_NODE) {
				if (dom.isBlockElement(parent.childNodes[i]) === true) {
					return true;
				}
			}
		}
		return false;
	};
	dom.removeTag = function (element, selector) {
		$(element).find(selector).replaceWith(function () {
			return $(this).contents();
		});
		return element;
	};
	dom.stripEnclosingTags = function (content, allowedTags) {
		var c = $(content);
		c.find('*').not(allowedTags).replaceWith(function () {
			var ret = $();
			var $this;
			try{
				$this = $(this);
				ret = $this.contents();
			} catch(e){}

			// Handling jQuery bug (which may be fixed in the official release later)
			// http://bugs.jquery.com/ticket/13401
			if(ret.length === 0){
				$this.remove();
			}
			return ret;
		});
		return c[0];
	};
	dom.getSiblings = function (element, dir, elementNodesOnly, stopElem) {
		if (elementNodesOnly === true) {
			if (dir === 'prev') {
				return $(element).prevAll();
			} else {
				return $(element).nextAll();
			}
		} else {
			var elems = [];
			if (dir === 'prev') {
				while (element.previousSibling) {
					element = element.previousSibling;
					if (element === stopElem) {
						break;
					}
					elems.push(element);
				}
			} else {
				while (element.nextSibling) {
					element = element.nextSibling;
					if (element === stopElem) {
						break;
					}
					elems.push(element);
				}
			}
			return elems;
		}
	};
	dom.getNodeTextContent = function (node) {
		return $(node).text();
	};
	dom.getNodeStubContent = function (node) {
		return $(node).find(stubElementsString);
	};
	dom.hasNoTextOrStubContent = function (node) {
		var str = dom.getNodeTextContent(node);
		if (! isEmptyString(str)) {
			return false;
		}
		if (! node.firstChild) { // no children shortcut
			return true;
		}
		return $(node).find(stubElementsString).length === 0;
	};

	dom.isEmptyTextNode = function(node) {
		if (! node || (dom.TEXT_NODE !== node.nodeType)) {
			return false;
		}
		if (node.length === 0) {
			return true;
		}
		return isEmptyString(node.nodeValue);
	};

	dom.getNodeCharacterLength = function (node) {
		return dom.getNodeTextContent(node).length + $(node).find(dom.STUB_ELEMENTS.join(', ')).length;
	};
	dom.setNodeTextContent = function (node, txt) {
		return $(node).text(txt);
	};
	dom.getTagName = function (node) {
		return node && node.tagName && node.tagName.toLowerCase() || null;
	};
	dom.getIframeDocument = function (iframe) {
		var doc = null;
		if (iframe.contentDocument) {
			doc = iframe.contentDocument;
		} else if (iframe.contentWindow) {
			doc = iframe.contentWindow.document;
		} else if (iframe.document) {
			doc = iframe.document;
		}
		return doc;
	};
	dom.isBlockElement = function (element) {
		return dom.BLOCK_ELEMENTS.indexOf(element.nodeName.toLowerCase()) != -1;
	};
	dom.isStubElement = function (element) {
		return dom.STUB_ELEMENTS.indexOf(element.nodeName.toLowerCase()) != -1;
	};
	dom.removeBRFromChild = function (node) {
		if (node && node.hasChildNodes()) {
			for(var z=0; z < node.childNodes.length ; z++) {
				var child = node.childNodes[z];
				if (child && (ice.dom.BREAK_ELEMENT == ice.dom.getTagName(child))) {
					child.parentNode.removeChild(child);
				}
			}
		}
	};
	dom.isChildOf = function (el, parent) {
		try {
			while (el && el.parentNode) {
				if (el.parentNode === parent) {
					return true;
				}
				el = el.parentNode;
			}
		} catch (e) {}
		return false;
	};
	dom.isChildOfTagName = function (el, name) {
		try {
			while (el && el.parentNode) {
				if (el.parentNode && el.parentNode.tagName && el.parentNode.tagName.toLowerCase() === name) {
					return el.parentNode;
				}
				el = el.parentNode;
			}
		} catch (e) {}
		return false;
	};


	dom.isChildOfTagNames = function (el, names) {
		try {
			while (el && el.parentNode) {
				if (el.parentNode && el.parentNode.tagName) {
					tagName = el.parentNode.tagName.toLowerCase();
					for (var i = 0; i < names.length; i++) {
						if (tagName === names[i]) {
							return el.parentNode;
						}
					}
				}
				el = el.parentNode;
			}
		} catch (e) {}
		return null;
	};

	dom.isChildOfClassName = function (el, name) {
		try {
			while (el && el.parentNode) {
				if ($(el.parentNode).hasClass(name)) return el.parentNode;
				el = el.parentNode;
			}
		} catch (e) {}
		return null;
	};
	dom.cloneNode = function (elems, cloneEvents) {
		if (cloneEvents === undefined) {
			cloneEvents = true;
		}
		return $(elems).clone(cloneEvents);
	};

	dom.bind = function (element, event, callback) {
		return $(element).bind(event, callback);
	};

	dom.unbind = function (element, event, callback) {
		return $(element).unbind(event, callback);
	};

	dom.attr = function (elements, key, val) {
		if (val) return $(elements).attr(key, val);
		else return $(elements).attr(key);
	};
	dom.replaceWith = function (node, replacement) {
		return $(node).replaceWith(replacement);
	};
	dom.removeAttr = function (elements, name) {
		$(elements).removeAttr(name);
	};
	dom.getElementsBetween = function (fromElem, toElem) {
		var elements = [];
		if (fromElem === toElem) {
			return elements;
		}
		if (dom.isChildOf(toElem, fromElem) === true) {
			var fElemLen = fromElem.childNodes.length;
			for (var i = 0; i < fElemLen; i++) {
				if (fromElem.childNodes[i] === toElem) {
					break;
				} else if (dom.isChildOf(toElem, fromElem.childNodes[i]) === true) {
					return dom.arrayMerge(elements, dom.getElementsBetween(fromElem.childNodes[i], toElem));
				} else {
					elements.push(fromElem.childNodes[i]);
				}
			}
			return elements;
		}
		var startEl = fromElem.nextSibling;
		while (startEl) {
			if (dom.isChildOf(toElem, startEl) === true) {
				elements = dom.arrayMerge(elements, dom.getElementsBetween(startEl, toElem));
				return elements;
			} else if (startEl === toElem) {
				return elements;
			} else {
				elements.push(startEl);
				startEl = startEl.nextSibling;
			}
		}
		var fromParents = dom.getParents(fromElem);
		var toParents = dom.getParents(toElem);
		var parentElems = dom.arrayDiff(fromParents, toParents, true);
		var pElemLen = parentElems.length;
		for (var j = 0; j < (pElemLen - 1); j++) {
			elements = dom.arrayMerge(elements, dom.getSiblings(parentElems[j], 'next'));
		}
		var lastParent = parentElems[(parentElems.length - 1)];
		elements = dom.arrayMerge(elements, dom.getElementsBetween(lastParent, toElem));
		return elements;
	};
	dom.getCommonAncestor = function (a, b) {
		var node = a;
		while (node) {
			if (dom.isChildOf(b, node) === true) {
				return node;
			}
			node = node.parentNode;
		}
		return null;
	};

	dom.getNextNode = function (node, container) {
		if (node) {
			while (node.parentNode) {
				if (node === container) {
					return null;
				}

				if (node.nextSibling) {
					// if next sibling is an empty text node, look further
					if (node.nextSibling.nodeType === dom.TEXT_NODE && node.nextSibling.length === 0) {
						node = node.nextSibling;
						continue;
					}

					return dom.getFirstChild(node.nextSibling);
				}
				node = node.parentNode;
			}
		}
		return null;
	};

	dom.getNextContentNode = function (node, container) {
		if (node) {
			while (node.parentNode) {
				if (node === container) {
					return null;
				}

				if (node.nextSibling && dom.canContainTextElement(dom.getBlockParent(node))) {
					// if next sibling is an empty text node, look further
					if (node.nextSibling.nodeType === dom.TEXT_NODE && node.nextSibling.length === 0) {
						node = node.nextSibling;
						continue;
					}

					return node.nextSibling;
				} else if (node.nextElementSibling) {
					return node.nextElementSibling;
				}

				node = node.parentNode;
			}
		}
		return null;
	};


	dom.getPrevNode = function (node, container) {
		if (node) {
			while (node.parentNode) {
				if (node === container) {
					return null;
				}

				if (node.previousSibling) {
					// if previous sibling is an empty text node, look further
					if (node.previousSibling.nodeType === dom.TEXT_NODE && node.previousSibling.length === 0) {
						node = node.previousSibling;
						continue;
					}

					return dom.getLastChild(node.previousSibling);
				}
				node = node.parentNode;
			}
		}
		return null;
	};
	dom.getPrevContentNode = function (node, container) {
		if (node) {
			while (node.parentNode) {
				if (node === container) {
					return null;
				}
				if (node.previousSibling && dom.canContainTextElement(dom.getBlockParent(node))) {

					// if previous sibling is an empty text node, look further
					if (node.previousSibling.nodeType === dom.TEXT_NODE && node.previousSibling.length === 0) {
						node = node.previousSibling;

						continue;
					}
					return node.previousSibling;
				} else if (node.previousElementSibling) {
					return node.previousElementSibling;
				}

				node = node.parentNode;
			}
		}
		return null;
	};

	/* Begin dfl */

	function _findNextTextContainer(node, container){
		while (node) {
			if (dom.TEXT_NODE == node.nodeType) {
				return node;
			}
			for (var child = node.firstChild; child; child = child.nextSibling) {
				var ret = _findNextTextContainer(child, container);
				if (ret) {
					return ret;
				}
			}
			if (dom.isTextContainer(node)) {
				return node;
			}
			node = node.nextSibling;
		}
		return null;
	}

	function _findPrevTextContainer(node, container){
		while (node) {
			if (dom.TEXT_NODE == node.nodeType) {
				return node;
			}
			for (var child = node.lastChild; child; child = child.previousSibling) {
				var ret = _findPrevTextContainer(child, container);
				if (ret) {
					return ret;
				}
			}
			if (dom.isTextContainer(node)) {
				return node;
			}
			node = node.previousSibling;
		}
		return null;
	}

	dom.findPrevTextContainer = function(node, container) {
		if (! node || node == container) {
			return {
				node: container,
				offset: 0
			};
		}

		if (node.parentNode && dom.isTextContainer(node.parentNode)) {
			return {
				node: node.parentNode,
				offset: dom.getNodeIndex(node)
			};
		}
		while (node.previousSibling) {
			var ret = _findPrevTextContainer(node.previousSibling);
			if (ret) {
				return {
					node: ret,
					offset: dom.getNodeLength(ret)
				};
			}
			node = node.previousSibling;
		}

		return dom.findPrevTextContainer(node.parentNode && node.parentNode.previousSibling, container);
	};

	dom.findNextTextContainer = function(node, container) {
		if (! node || node == container) {
			return {
				node: container,
				offset: dom.getNodeLength(container)
			};
		}
		if (node.parentNode && dom.isTextContainer(node.parentNode)) {
			return {
				node: node.parentNode,
				offset: dom.getNodeIndex(node) + 1
			};
		}
		while (node.nextSibling) {
			var ret = _findNextTextContainer(node.nextSibling);
			if (ret) {
				return {
					node: ret,
					offset: 0
				};
			}
			node = node.previousSibling;
		}

		return dom.findNextTextContainer(node.parentNode && node.parentNode.nextSibling, container);
	};

	dom.getNodeLength = function(node) {
		return node ?
				(dom.TEXT_NODE == node.nodeType ?
						node.length : ((node.childNodes && node.childNodes.length) || 0)) :
				0;
	};

	dom.isTextContainer = function(node) {
		return (node && (dom.TEXT_NODE == node.nodeType) || dom.TEXT_CONTAINER_ELEMENTS.indexOf((node.nodeName || "").toLowerCase()) >= 0);
	};

	dom.getNodeIndex = function(node) {
		var i = 0;
		while( (node = node.previousSibling) ) {
			++i;
		}
		return i;
	};

	/* end dfl */

	dom.canContainTextElement = function (element) {
		if (element && element.nodeName) {
			return dom.TEXT_CONTAINER_ELEMENTS.lastIndexOf(element.nodeName.toLowerCase()) != -1;
		} else {
			return false;
		}
	};

	dom.getFirstChild = function (node) {
		if (node.firstChild) {
			if (node.firstChild.nodeType === dom.ELEMENT_NODE) {
				return dom.getFirstChild(node.firstChild);
			} else {
				return node.firstChild;
			}
		}
		return node;
	};
	dom.getLastChild = function (node) {
		if (node.lastChild) {
			if (node.lastChild.nodeType === dom.ELEMENT_NODE) {
				return dom.getLastChild(node.lastChild);
			} else {
				return node.lastChild;
			}
		}
		return node;
	};
	dom.removeEmptyNodes = function (parent, callback) {
		var elems = $(parent).find(':empty');
		var i = elems.length;
		while (i > 0) {
			i--;
			if (dom.isStubElement(elems[i]) === false) {
				if (!callback || callback.call(this, elems[i]) !== false) {
					dom.remove(elems[i]);
				}
			}
		}
	};
	dom.create = function (html) {
		return $(html)[0];
	};
	dom.find = function (parent, exp) {
		return $(parent).find(exp);
	};
	dom.children = function (parent, exp) {
		return $(parent).children(exp);
	};
	dom.parent = function (child, exp) {
		return $(child).parent(exp)[0];
	};
	dom.parents = function (child, exp) {
		return $(child).parents(exp);
	};
	dom.is = function (node, exp) {
		return $(node).is(exp);
	};
	dom.extend = function (deep, target, object1, object2) {
		return $.extend.apply(this, arguments);
	};
	dom.walk = function (elem, callback, lvl) {
		if (!elem) {
			return;
		}
		if (!lvl) {
			lvl = 0;
		}
		var retVal = callback.call(this, elem, lvl);
		if (retVal === false) {
			return;
		}
		if (elem.childNodes && elem.childNodes.length > 0) {
			dom.walk(elem.firstChild, callback, (lvl + 1));
		} else if (elem.nextSibling) {
			dom.walk(elem.nextSibling, callback, lvl);
		} else if (elem.parentNode && elem.parentNode.nextSibling) {
			dom.walk(elem.parentNode.nextSibling, callback, (lvl - 1));
		}
	};
	dom.revWalk = function (elem, callback) {
		if (!elem) {
			return;
		}
		var retVal = callback.call(this, elem);
		if (retVal === false) {
			return;
		}
		if (elem.childNodes && elem.childNodes.length > 0) {
			dom.walk(elem.lastChild, callback);
		} else if (elem.previousSibling) {
			dom.walk(elem.previousSibling, callback);
		} else if (elem.parentNode && elem.parentNode.previousSibling) {
			dom.walk(elem.parentNode.previousSibling, callback);
		}
	};
	dom.setStyle = function (element, property, value) {
		if (element) {
			$(element).css(property, value);
		}
	};
	dom.getStyle = function (element, property) {
		return $(element).css(property);
	};
	dom.hasClass = function (element, className) {
		return $(element).hasClass(className);
	};
	dom.addClass = function (element, classNames) {
		$(element).addClass(classNames);
	};
	dom.removeClass = function (element, classNames) {
		$(element).removeClass(classNames);
	};
	dom.preventDefault = function (e) {
		e.preventDefault();
		dom.stopPropagation(e);
	};
	dom.stopPropagation = function (e) {
		e.stopPropagation();
	};

	dom.each = function (val, callback) {
		$.each(val, function (i, el) {
			callback.call(this, i, el);
		});
	};

	dom.foreach = function (value, cb) {
		var res, len;
		if (value instanceof Array || value instanceof NodeList || typeof value.length != 'undefined' && typeof value.item != 'undefined') {
			len = value.length;
			for (var i = 0; i < len; i++) {
				res = cb.call(this, i, value[i]);
				if (res === false) {
					break;
				}
			}
		} else {
			for (var id in value) {
				if (value.hasOwnProperty(id) === true) {
					res = cb.call(this, id);
					if (res === false) {
						break;
					}
				}
			}
		}
	};
	dom.isBlank = function (value) {
		return (!value || wsrgx.test(value));
	};
	dom.isFn = function (f) {
		return (typeof f === 'function') ;
	};
	dom.isObj = function (v) {
		return (v !== null && typeof v === 'object');
	};
	dom.isset = function (v) {
		return (typeof v !== 'undefined' && v !== null);
	};
	dom.isArray = function (v) {
		return $.isArray(v);
	};

	dom.isNumeric = function (str) {
		return str.match(numrgx) !== null;
	};

	dom.getUniqueId = function () {
		var timestamp = (new Date()).getTime();
		var random = Math.ceil(Math.random() * 1000000);
		var id = timestamp + '' + random;
		return id.substr(5, 18).replace(/,/, '');
	};
	dom.inArray = function (needle, haystack) {
		var hln = haystack.length;
		for (var i = 0; i < hln; i++) {
			if (needle === haystack[i]) {
				return true;
			}
		}
		return false;
	};
	dom.arrayDiff = function (array1, array2, firstOnly) {
		var al = array1.length,
			i, res = [];
		for (i = 0; i < al; i++) {
			if (dom.inArray(array1[i], array2) === false) {
				res.push(array1[i]);
			}
		}
		if (firstOnly !== true) {
			al = array2.length;
			for (i = 0; i < al; i++) {
				if (dom.inArray(array2[i], array1) === false) {
					res.push(array2[i]);
				}
			}
		}
		return res;
	};
	dom.arrayMerge = function (array1, array2) {
		var c = array2.length, i;
		for (i = 0; i < c; i++) {
			array1.push(array2[i]);
		}
		return array1;
	};
	/**
	 * Removes allowedTags from the given content html string. If allowedTags is a string, then it
	 * is expected to be a selector; otherwise, it is expected to be array of string tag names.
	 */
	dom.stripTags = function (content, allowedTags) {
		if (typeof allowedTags === "string") {
			var c = $('<div>' + content + '</div>');
			c.find('*').not(allowedTags).remove();
			return c.html();
		} else {
			var match;
			var re = new RegExp(/<\/?(\w+)((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/gim);
			var resCont = content;
			while ((match = re.exec(content)) != null) {
				if (dom.isset(allowedTags) === false || dom.inArray(match[1], allowedTags) !== true) {
					resCont = resCont.replace(match[0], '');
				}
			}
			return resCont;
		}
	};

	dom.browser = function () {
		if (_browser) {
			return $.extend({}, _browser);
		}

		_browser = (function() {
			function uaMatch( ua ) {
				ua = ua.toLowerCase();

				var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
					/(webkit)[ \/]([\w.]+)/.exec( ua ) ||
					/(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
					/(msie) ([\w.]+)/.exec( ua ) ||
					ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
					[];

				return {
					browser: match[ 1 ] || "",
					version: match[ 2 ] || "0"
				};
			}

			var ua = navigator.userAgent.toLowerCase(),
				matched = uaMatch(ua),
				browser = {
					type: "unknown",
					version : 0,
					msie: false
				};

			if ( matched.browser ) {
				browser[ matched.browser ] = true;
				browser.version = matched.version || 0;
				browser.type = matched.browser;
			}

			// Chrome is Webkit, but Webkit is also Safari.
			if ( browser.chrome ) {
				browser.webkit = true;
			} else if ( browser.webkit ) {
				browser.safari = true;
			}
			if (browser.webkit) {
				browser.type = "webkit";
			}
			browser.firefox = (/firefox/.test(ua) == true);
			if (! browser.msie) {
				browser.msie = Boolean( /trident/.test(ua));
			}

			return browser;
		})();

		return $.extend({}, _browser);
	};

	dom.getBrowserType = function () {
		if (this._browserType === null) {
			var tests = ['msie', 'firefox', 'chrome', 'safari'];
			var tln = tests.length;
			for (var i = 0; i < tln; i++) {
				var r = new RegExp(tests[i], 'i');
				if (r.test(navigator.userAgent) === true) {
					this._browserType = tests[i];
					return this._browserType;
				}
			}

			this._browserType = 'other';
		}
		return this._browserType;
	};
	dom.getWebkitType = function(){
	if(dom.browser().type !== "webkit") {
		console.log("Not a webkit!");
		return false;
	}
		var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
	if(isSafari) return "safari";
	return "chrome";
	};
	dom.isBrowser = function (browser) {
		return (dom.browser().type === browser);
	};

	dom.getBlockParent = function (node, container) {
		if (dom.isBlockElement(node) === true) {
			return node;
		}
		if (node) {
			while (node.parentNode) {
				node = node.parentNode;

				if (dom.isBlockElement(node) === true) {
					return node;
				}
				if (node === container) {
					return null;
				}
			}
		}
		return null;
	};
	dom.findNodeParent = function (node, selector, container) {
		if (node) {
			while (node.parentNode) {
				if (node === container) {
					return null;
				}

				if (dom.is(node, selector) === true) {
					return node;
				}
				node = node.parentNode;
			}
		}
		return null;
	};
	dom.onBlockBoundary = function (leftContainer, rightContainer, blockEls) {
		if (!leftContainer || !rightContainer) {
			return false
		}
		var bleft = dom.isChildOfTagNames(leftContainer, blockEls) || dom.is(leftContainer, blockEls.join(', ')) && leftContainer || null,
			bright = dom.isChildOfTagNames(rightContainer, blockEls) || dom.is(rightContainer, blockEls.join(', ')) && rightContainer || null;
		return (bleft !== bright);
	};

	dom.isOnBlockBoundary = function (leftContainer, rightContainer, container) {
		if (!leftContainer || !rightContainer) {
			return false;
		}
		var bleft = dom.getBlockParent(leftContainer, container) || dom.isBlockElement(leftContainer, container) && leftContainer || null,
			bright = dom.getBlockParent(rightContainer, container) || dom.isBlockElement(rightContainer, container) && rightContainer || null;
		return (bleft !== bright);
	};

	dom.mergeContainers = function (node, mergeToNode) {
		if (!node || !mergeToNode) {
			return false;
		}

		if (node.nodeType === dom.TEXT_NODE || dom.isStubElement(node)) {
			// Move only this node.
			mergeToNode.appendChild(node);
		} else if (node.nodeType === dom.ELEMENT_NODE) {
			// Move all the child nodes to the new parent.
			while (node.firstChild) {
				mergeToNode.appendChild(node.firstChild);
			}

			dom.remove(node);
		}
		return true;
	};

	dom.mergeBlockWithSibling = function (range, block, next) {
		var siblingBlock = next ? $(block).next().get(0) : $(block).prev().get(0); // block['nextSibling'] : block['previousSibling'];
		if (next) dom.mergeContainers(siblingBlock, block);
		else dom.mergeContainers(block, siblingBlock);
		range.collapse(true);
		return true;
	};

	dom.date = function (format, timestamp, tsIso8601) {
		if (timestamp === null && tsIso8601) {
			timestamp = dom.tsIso8601ToTimestamp(tsIso8601);
			if (!timestamp) {
				return;
			}
		}
		var date = new Date(timestamp);
		var formats = format.split('');
		var fc = formats.length;
		var dateStr = '';
		for (var i = 0; i < fc; i++) {
			var r = '';
			var f = formats[i];
			switch (f) {
				case 'D':
				case 'l':
					var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
					r = names[date.getDay()];
					if (f === 'D') {
						r = r.substring(0, 3);
					}
					break;
				case 'F':
				case 'm':
					r = date.getMonth() + 1;
					if (r < 10) r = '0' + r;
					break;
				case 'M':
					months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
					r = months[date.getMonth()];
					if (f === 'M') {
						r = r.substring(0, 3);
					}
					break;
				case 'd':
					r = date.getDate();
					break;
				case 'S':
					r = dom.getOrdinalSuffix(date.getDate());
					break;
				case 'Y':
					r = date.getFullYear();
					break;
				case 'y':
					r = date.getFullYear();
					r = r.toString().substring(2);
					break;
				case 'H':
					r = date.getHours();
					break;
				case 'h':
					r = date.getHours();
					if (r === 0) {
						r = 12;
					} else if (r > 12) {
						r -= 12;
					}
					break;
				case 'i':
					r = dom.addNumberPadding(date.getMinutes());
					break;
				case 'a':
					r = 'am';
					if (date.getHours() >= 12) {
						r = 'pm';
					}
					break;
				default:
					r = f;
					break;
			}
			dateStr += r;
		}
		return dateStr;
	};
	dom.getOrdinalSuffix = function (number) {
		var suffix = '';
		var tmp = (number % 100);
		if (tmp >= 4 && tmp <= 20) {
			suffix = 'th';
		} else {
			switch (number % 10) {
				case 1:
					suffix = 'st';
					break;
				case 2:
					suffix = 'nd';
					break;
				case 3:
					suffix = 'rd';
					break;
				default:
					suffix = 'th';
					break;
			}
		}
		return suffix;
	};
	dom.addNumberPadding = function (number) {
		if (number < 10) {
			number = '0' + number;
		}
		return number;
	};
	dom.tsIso8601ToTimestamp = function (tsIso8601) {
		var regexp = /(\d\d\d\d)(?:-?(\d\d)(?:-?(\d\d)(?:[T ](\d\d)(?::?(\d\d)(?::?(\d\d)(?:\.(\d+))?)?)?(?:Z|(?:([-+])(\d\d)(?::?(\d\d))?)?)?)?)?)?/;
		var d = tsIso8601.match(new RegExp(regexp));
		if (d) {
			var date = new Date();
			date.setDate(d[3]);
			date.setFullYear(d[1]);
			date.setMonth(d[2] - 1);
			date.setHours(d[4]);
			date.setMinutes(d[5]);
			date.setSeconds(d[6]);
			var offset = (d[9] * 60);
			if (d[8] === '+') {
				offset *= -1;
			}
			offset -= date.getTimezoneOffset();
			return (date.getTime() + (offset * 60 * 1000));
		}
		return null;
	};

	dom.normalizeNode = function(node, ignoreNative) {
		if (! node) {
			return;
		}
		if (! dom.browser().msie && (ignoreNative !== true && "function" == typeof node.normalize)) {
			return node.normalize();
		}
		return _myNormalizeNode(node);
	};

	function _myNormalizeNode(node) {
		if (! node) {
			return;
		}
		var ELEMENT_NODE = 1;
		var TEXT_NODE = 3;
		var child = node.firstChild;
		while (child) {
			if (child.nodeType == ELEMENT_NODE) {
				_myNormalizeNode(child);
			}
			else if (child.nodeType == TEXT_NODE) {
				var next;
				while ((next = child.nextSibling) && next.nodeType == TEXT_NODE) {
					var value = next.nodeValue;
					if (value != null && value.length) {
						child.nodeValue = child.nodeValue + value;
					}
					node.removeChild(next);
				}
			}
			child = child.nextSibling;
		}
	};


	exports.dom = dom;

}).call(this.ice, window.jQuery);
