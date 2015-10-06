(function () {

	"use strict";

	var exports = this,
		Selection;

	Selection = function (env) {
		this._selection = null;
		this.env = env;

		this._initializeRangeLibrary();
		this._getSelection();
	};

	Selection.prototype = {

	/**
	 * Returns the selection object for the current browser.
	 */
	_getSelection: function () {
		if (this._selection) {
			this._selection.refresh();
		}
		else if (this.env.frame) {
			this._selection = rangy.getSelection(this.env.frame);
		}
		else {
			this._selection = rangy.getSelection();
		}
		return this._selection;
	},

	/**
	 * Creates a range object.
	 */
	createRange: function () {
		return rangy.createRange(this.env.document);
	},

	/**
	 * Returns the range object at the specified position. The current range object
	 * is at position 0. Note - currently only setting single range in `addRange` so
	 * position 0 will be the only allocation filled.
	 */
	getRangeAt: function (pos) {
		try {
			this._selection.refresh();
			return this._selection.getRangeAt(pos);
		}
		catch (e) {
			this._selection = null;
			try {
				return this._getSelection().getRangeAt(0);
			}
			catch(ignore) {
				// ignore
			}
		}

		return null;
	},

	/**
	 * Adds the specified range to the current selection. Note - only supporting setting
	 * a single range, so the previous range gets evicted.
	 */
	addRange: function (range) {
		this._selection || (this._selection = this._getSelection());
		this._selection.setSingleRange(range);
		this._selection.ranges = [range];
	},

	/**
	 * Initialize and extend the `rangy` library with some custom functionality.
	 */
	_initializeRangeLibrary: function () {
		var self = this;

		rangy.init();
		rangy.config.checkSelectionRanges = false;

		var move = function (range, unitType, units, isStart) {
			if (units === 0) {
			  return;
			}
			var collapsed = range.collapsed;

			switch (unitType) {
				case ice.dom.CHARACTER_UNIT:
					if (units > 0) {
						range.moveCharRight(isStart, units);
					} else {
						range.moveCharLeft(isStart, units * -1);
					}
					break;

				case ice.dom.WORD_UNIT:
				default:
				// Removed. TODO: possibly refactor or re-implement.
					break;
			}
			// restore collapsed flag
			if (collapsed) {
				range.collapse(isStart);
			}
		};

		/**
		 * Moves the start of the range using the specified `unitType`, by the specified
		 * number of `units`. Defaults to `CHARACTER_UNIT` and units of 1.
		 */
		rangy.rangePrototype.moveStart = function (unitType, units) {
			move(this, unitType, units, true);
		};

		/**
		 * Moves the end of the range using the specified `unitType`, by the specified
		 * number of `units`.
		 */
		rangy.rangePrototype.moveEnd = function (unitType, units) {
			move(this, unitType, units, false);
		};

		/**
		 * Depending on the given `start` boolean, sets the start or end containers
		 * to the given `container` with `offset` units.
		 */
		rangy.rangePrototype.setRange = function (start, container, offset) {
			if (start) {
				this.setStart(container, offset);
			}
			else {
				this.setEnd(container, offset);
			}
		};

		/**
		 * Depending on the given `moveStart` boolean, moves the start or end containers
		 * to the left by the given number of character `units`. Use the following
		 * example as a demonstration for where the range will fall as it moves in and
		 * out of tag boundaries (where "|" is the marked range):
		 *
		 * test <em>it</em> o|ut
		 * test <em>it</em> |out
		 * test <em>it</em>| out
		 * test <em>i|t</em> out
		 * test <em>|it</em> out
		 * test| <em>it</em> out
		 * tes|t <em>it</em> out
		 *
		 * A range could be mapped in one of two ways:
		 *
		 * (1) If a startContainer is a Node of type Text, Comment, or CDATASection, then startOffset
		 * is the number of characters from the start of startNode. For example, the following
		 * are the range properties for `<p>te|st</p>` (where "|" is the collapsed range):
		 *
		 * startContainer: <TEXT>test<TEXT>
		 * startOffset: 2
		 * endContainer: <TEXT>test<TEXT>
		 * endOffset: 2
		 *
		 * (2) For other Node types, startOffset is the number of child nodes between the start of
		 * the startNode. Take the following html fragment:
		 *
		 * `<p>some <span>test</span> text</p>`
		 *
		 * If we were working with the following range properties:
		 *
		 * startContainer: <p>
		 * startOffset: 2
		 * endContainer: <p>
		 * endOffset: 2
		 *
		 * Since <p> is an Element node, the offsets are based on the offset in child nodes of <p> and
		 * the range is selecting the second child - the <span> tag.
		 *
		 * <p><TEXT>some </TEXT><SPAN>test</SPAN><TEXT> text</TEXT></p>
		 */
		rangy.rangePrototype.moveCharLeft = function (moveStart, units) {
			var container, offset;

			if (moveStart) {
				container = this.startContainer;
				offset = this.startOffset;
			}
			else {
				container = this.endContainer;
				offset = this.endOffset;
			}

			// Handle the case where the range conforms to (2) (noted in the comment above).
			if (container.nodeType === ice.dom.ELEMENT_NODE) {
				if (container.hasChildNodes() && offset > 0) {
					var lastChild = container.childNodes[offset - 1],
						nextContainer = this.getLastSelectableChild(lastChild);
					if (nextContainer) {
						container = nextContainer;
					}
					else {
						container = this.getPreviousTextNode(lastChild);
					}
					if (! container) {
						return;
					}
					offset = container.data.length - units;
				}
				else {// no child nodes
					offset = units * -1;
				}
			}
			else {
				offset -= units;
			}

			if (offset < 0) {
				// We need to move to a previous selectable container.
				while (offset < 0) {
					container = this.getPreviousTextNode(container);

					// We are at the beginning/out of the editable - break.
					if (!container) {
						return;
					}

					if (container.nodeType === ice.dom.ELEMENT_NODE) {
						continue;
					}

					offset += container.data.length;
				}
			}

			this.setRange(moveStart, container, offset);
		};

		/**
		 * Depending on the given `moveStart` boolean, moves the start or end containers
		 * to the right by the given number of character `units`. Use the following
		 * example as a demonstration for where the range will fall as it moves in and
		 * out of tag boundaries (where "|" is the marked range):
		 *
		 * tes|t <em>it</em> out
		 * test| <em>it</em> out
		 * test |<em>it</em> out
		 * test <em>i|t</em> out
		 * test <em>it|</em> out
		 * test <em>it</em> |out
		 *
		 * A range could be mapped in one of two ways:
		 *
		 * (1) If a startContainer is a Node of type Text, Comment, or CDATASection, then startOffset
		 * is the number of characters from the start of startNode. For example, the following
		 * are the range properties for `<p>te|st</p>` (where "|" is the collapsed range):
		 *
		 * startContainer: <TEXT>test<TEXT>
		 * startOffset: 2
		 * endContainer: <TEXT>test<TEXT>
		 * endOffset: 2
		 *
		 * (2) For other Node types, startOffset is the number of child nodes between the start of
		 * the startNode. Take the following html fragment:
		 *
		 * `<p>some <span>test</span> text</p>`
		 *
		 * If we were working with the following range properties:
		 *
		 * startContainer: <p>
		 * startOffset: 2
		 * endContainer: <p>
		 * endOffset: 2
		 *
		 * Since <p> is an Element node, the offsets are based on the offset in child nodes of <p> and
		 * the range is selecting the second child - the <span> tag.
		 *
		 * <p><TEXT>some </TEXT><SPAN>test</SPAN><TEXT> text</TEXT></p>
		 * Fixed by dfl to handle cases when there's no next container
		 */
		rangy.rangePrototype.moveCharRight = function (moveStart, units) {
			var container, offset;

			if (moveStart) {
				container = this.startContainer;
				offset = this.startOffset;
			}
			else {
				container = this.endContainer;
				offset = this.endOffset;
			}

			if (container.nodeType === ice.dom.ELEMENT_NODE) {
				var next = this.getNextTextNode(container.childNodes[Math.min(offset, container.childNodes.length -1)]);
				if (next) {
					container = next;
				}
				else {
					container = this.getNextTextNode(container);
				}

				offset = units;
			}
			else { // text node
				offset += units;
			}
			if (! container) {
				return;
			}

			var diff = (offset - container.data.length);
			if (diff > 0) {
				// We need to move to the next selectable container.
				while (diff > 0) {
					container = this.getNextContainer(container);
					if (! container) {
						return;
					}

					if (container.nodeType === ice.dom.ELEMENT_NODE) {
						continue;
					}

					if (container.data.length >= diff) {
						// We found a container with enough content to select.
						break;
					}
					else if (container.data.length > 0) {
						// Container does not have enough content,
						// find the next one.
						diff -= container.data.length;
					}
				}

				offset = diff;
			}
			this.setRange(moveStart, container, offset);
		};

		/**
		 * Returns the deepest next container that the range can be extended to.
		 * For example, if the next container is an element that contains text nodes,
		 * the the container's firstChild is returned.
		 */
		rangy.rangePrototype.getNextContainer = function (container, skippedBlockEl) {
			if (!container) {
				return null;
			}
			skippedBlockEl = skippedBlockEl || [];

			while (container.nextSibling) {
				container = container.nextSibling;
				if (container.nodeType !== ice.dom.TEXT_NODE) {
					var child = this.getFirstSelectableChild(container);
					if (child !== null) {
						return child;
					}
				}
				else if (this.isSelectable(container) === true) {
					return container;
				}
			}

			// Look at parents next sibling.
			while (container && !container.nextSibling) {
				container = container.parentNode;
			}

			if (!container) {
				return null;
			}

			container = container.nextSibling;
			if (this.isSelectable(container) === true) {
				return container;
			}
			else if (ice.dom.isBlockElement(container) === true) {
				skippedBlockEl.push(container);
			}

			var selChild = this.getFirstSelectableChild(container);
			if (selChild !== null) {
				return selChild;
			}

			return this.getNextContainer(container, skippedBlockEl);
		};

		/**
		 * Returns the deepest previous container that the range can be extended to.
		 * For example, if the previous container is an element that contains text nodes,
		 * then the container's lastChild is returned.
		 */
		rangy.rangePrototype.getPreviousContainer = function (container, skippedBlockEl) {
			if (!container) {
				return null;
			}
			skippedBlockEl = skippedBlockEl || [];

			while (container.previousSibling) {
				container = container.previousSibling;
				if (container.nodeType !== ice.dom.TEXT_NODE) {
					if (ice.dom.isStubElement(container) === true) {
						return container;
					}
					else {
						var child = this.getLastSelectableChild(container);
						if (child !== null) {
							return child;
						}
					}
				}
				else if (this.isSelectable(container) === true) {
					return container;
				}
			}

			// Look at parents next sibling.
			while (container && !container.previousSibling) {
				container = container.parentNode;
			}

			if (!container) {
				return null;
			}

			container = container.previousSibling;
			if (this.isSelectable(container) === true) {
				return container;
			}
			else if (ice.dom.isBlockElement(container) === true) {
				skippedBlockEl.push(container);
			}

			var selChild = this.getLastSelectableChild(container);
			if (selChild !== null) {
				return selChild;
			}
			return this.getPreviousContainer(container, skippedBlockEl);
		};

		rangy.rangePrototype.getNextTextNode = function (container) {
			if (container.nodeType === ice.dom.ELEMENT_NODE) {
				if (container.firstChild) {
					var ret = this.getFirstSelectableChild(container);
					if (ret) {
						return ret;
					}
				}
			}

			container = this.getNextContainer(container);
			if (! container) {
				return null;
			}
			if (container.nodeType === ice.dom.TEXT_NODE) {
				return container;
			}

			return this.getNextTextNode(container);
		};

		rangy.rangePrototype.getPreviousTextNode = function (container, skippedBlockEl) {
			container = this.getPreviousContainer(container, skippedBlockEl);
			if (! container) {
				return null;
			}
			if (container.nodeType === ice.dom.TEXT_NODE) {
				return container;
			}

			return this.getPreviousTextNode(container, skippedBlockEl);
		};

		rangy.rangePrototype.getFirstSelectableChild = function (element) {
			if (!element) {
				return null;
			}
			if (element.nodeType === ice.dom.TEXT_NODE) {
				return element;
			}
			var child = element.firstChild;
			while (child) {
				if (this.isSelectable(child) === true) {
					return child;
				}
				else if (child.firstChild) {
				// This node does have child nodes.
					var res = this.getFirstSelectableChild(child);
					if (res !== null) {
						return res;
					} else {
						child = child.nextSibling;
					}
				}
				else {
					child = child.nextSibling;
				}
			}
			return null;
		};

		rangy.rangePrototype.getLastSelectableChild = function (element) {
			if (! element) {
				return null;
			}
			if (element.nodeType == ice.dom.TEXT_NODE) {
				return element;
			}
			var child = element.lastChild;
			while (child) {
				if (this.isSelectable(child) === true) {
					return child;
				}
				else if (child.lastChild) {
					// This node does have child nodes.
					var res = this.getLastSelectableChild(child);
					if (res !== null) {
						return res;
					}
					else {
						child = child.previousSibling;
					}
				}
				else {
					child = child.previousSibling;
				}
			}
			return null;
		};

		rangy.rangePrototype.isSelectable = function (container) {
			return Boolean(container && container.nodeType === ice.dom.TEXT_NODE && container.data.length !== 0);
		};

		rangy.rangePrototype.getHTMLContents = function (clonedSelection) {
			if (!clonedSelection) {
				clonedSelection = this.cloneContents();
			}
			var div = self.env.document.createElement('div');
			div.appendChild(clonedSelection.cloneNode(true));
			return div.innerHTML;
			};

			rangy.rangePrototype.getHTMLContentsObj = function () {
			return this.cloneContents();
			};
		}
	};

	exports.Selection = Selection;

}).call(this.ice);
