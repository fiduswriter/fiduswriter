(function ($) {
	/**
	 * TODO
	 * 1. Each time an ice node is removed, refresh change set
	 */

	"use strict";

	var exports = this,
		defaults, InlineChangeEditor;

	/* constants */
	var BREAK_ELEMENT = "br",
		PARAGRAPH_ELEMENT = "p";

	defaults = {
	// ice node attribute names:
		attributes: {
			changeId: "data-cid",
			userId: "data-userid",
			userName: "data-username",
			sessionId: "data-session-id",
			time: "data-time",
			lastTime: "data-last-change-time",
			changeData: "data-changedata" // arbitrary data to associate with the node, e.g. version
		},
		// Prepended to `changeType.alias` for classname uniqueness, if needed
		attrValuePrefix: '',

		// Block element tagname, which wrap text and other inline nodes in `this.element`
		blockEl: 'p',

		// All permitted block element tagnames
		blockEls: ['div','p', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'],

		// Unique style prefix, prepended to a digit, incremented for each encountered user, and stored
		// in ice node class attributes - cts1, cts2, cts3, ...
		stylePrefix: 'cts',
		currentUser: {
			id: null,
			name: null
		},

		// Default change types are insert and delete. Plugins or outside apps should extend this
		// if they want to manage new change types. The changeType name is used as a primary
		// reference for ice nodes; the `alias`, is dropped in the class attribute and is the
		// primary method of identifying ice nodes; and `tag` is used for construction only.
		// Invoking `this.getCleanContent()` will remove all delete type nodes and remove the tags
		// for the other types, leaving the html content in place.
		changeTypes: {
			insertType: {
				tag: 'span',
				alias: 'ins',
				action: 'Inserted'
			},
			deleteType: {
				tag: 'span',
				alias: 'del',
				action: 'Deleted'
			}
		},

		// Sets this.element with the contentEditable element
		contentEditable: undefined,//dfl, start with a neutral value

		// Switch for toggling track changes on/off - when `false` events will be ignored.
		_isTracking: true,

		tooltips: false,

		tooltipsDelay: 1,

		_isVisible : true, // state of change tracking visibility

		_changeData : null, // a string you can associate with the current change set, e.g. version

		_handleSelectAll: false, // if true, handle ctrl/cmd-A in the change tracker

		_sessionId: null
	};

	/**
	 * @class ice.InlineChangeEditor
	 * The change tracking engine
	 * interacts with a <code>contenteditable</code> DOM element
	 */
	InlineChangeEditor = function (options) {

		// Data structure for modelling changes in the element according to the following model:
		//	[changeid] => {`type`, `time`, `userid`, `username`}
		options || (options = {});
		if (!options.element) {
			throw new Error("options.element must be defined for ice construction.");
		}

		this._changes = {};
		// Tracks all of the styles for users according to the following model:
		//	[userId] => styleId; where style is "this.stylePrefix" + "this.uniqueStyleIndex"
		this._userStyles = {};
		this._styles = {}; // dfl, moved from prototype
		this._savedNodesMap = {};
		this.$this = $(this);
		this._browser = ice.dom.browser();
		this._tooltipMouseOver = this._tooltipMouseOver.bind(this);
		this._tooltipMouseOut = this._tooltipMouseOut.bind(this);
		this._boundEventHandler = this.handleEvent.bind(this);

		ice.dom.extend(true, this, defaults, options);
		if (options.tooltips && (! $.isFunction(options.hostMethods.showTooltip) || ! $.isFunction(options.hostMethods.hideTooltip))) {
			throw new Error("hostMethods.showTooltip and hostMethods.hideTooltip must be defined if tooltips is true");
		}
		var us = options.userStyles || {}; // dfl, moved from prototype, allow preconfig
		for (var id in us) {
			if (us.hasOwnProperty(id)) {
				var st = us[id];
				if (! isNaN(st)) {
					this._userStyles[id] = this.stylePrefix + '-' + st;
					this._uniqueStyleIndex = Math.max(st, this._uniqueStyleIndex);
					this._styles[st] = true;
				}
			}
		}
		logError = options.hostMethods.logError || function(){ return undefined; };
	};

	InlineChangeEditor.prototype = {

		// Incremented for each new user and appended to they style prefix, and dropped in the
		// ice node class attribute.
		_uniqueStyleIndex: 0,

		_browserType: null,

		// One change may create multiple ice nodes, so this keeps track of the current batch id.
		_batchChangeId: null,

		// Incremented for each new change, dropped in the changeIdAttribute.
		_uniqueIDIndex: 1,

		// Temporary bookmark tags for deletes, when delete placeholding is active.
		_delBookmark: 'tempdel',
		isPlaceHoldingDeletes: false,

		/**
		 * Turns on change tracking - sets up events, if needed, and initializes the environment,
		 * range, and editor.
		 */
		startTracking: function (options) {
			// dfl:set contenteditable only if it has been explicitly set
			if (typeof(this.contentEditable) == "boolean") {
				this.element.setAttribute('contentEditable', this.contentEditable);
			}


			this.initializeEnvironment();
			this.initializeEditor();
			this.initializeRange();
			this._updateTooltipsState(); //dfl

			return this;
		},

		/**
		 * Removes contenteditability and stops event handling.
		 * Changed by dfl to have the option of not setting contentEditable
		 */
		stopTracking: function (onlyICE) {

			this._isTracking = false;
			try { // dfl added try/catch for ie
				// If we are handling events setup the delegate to handle various events on `this.element`.
				var e = this.element;
				if (e) {
					e.removeEventListener("keyup", this._boundEventHandler, true);
					e.removeEventListener("keydown", this._boundEventHandler, true);
					e.removeEventListener("keypress", this._boundEventHandler, true);
				}

				// dfl:reset contenteditable unless requested not to do so
				if (! onlyICE && (typeof(this.contentEditable) != "undefined")) {
					this.element.setAttribute('contentEditable', !this.contentEditable);
				}
			}
			catch (e){
				logError(e, "While trying to stop tracking");
			}

			this._updateTooltipsState();
			return this;
		},

		listenToEvents: function() {
			this.unlistenToEvents();
			if (this.element) {
				this.element.addEventListener("keydown", this._boundEventHandler, true);
			}
		},

		unlistenToEvents: function() {
			// If we are handling events setup the delegate to handle various events on `this.element`.
			if (this.element) {
				this.element.removeEventListener("keydown", this._boundEventHandler, true);
			}
		},

		/**
		 * Initializes the `env` object with pointers to key objects of the page.
		 */
		initializeEnvironment: function () {
			this.env || (this.env = {});
			this.env.element = this.element;
			this.env.document = this.element.ownerDocument;
			this.env.window = this.env.document.defaultView || this.env.document.parentWindow || window;
			this.env.frame = this.env.window.frameElement;
			this.env.selection = this.selection = new ice.Selection(this.env);
		},

		/**
		 * Initializes the internal range object and sets focus to the editing element.
		 */
		initializeRange: function () {
		},

		/**
		 * Initializes the content in the editor - cleans non-block nodes found between blocks and
		 * initializes the editor with any tracking tags found in the editing element.
		 */
		initializeEditor: function () {
			this._loadFromDom(); // refactored by dfl
			this._updateTooltipsState(); // dfl
		},

		/**
		 * Check whether or not this tracker is tracking changes.
		 * @return {Boolean} Is this tracker tracking?
		 */
		isTracking: function() {
			return this._isTracking;
		},

		/**
		 * Turn on change tracking and event handling.
		 */
		enableChangeTracking: function () {
			this._isTracking = true;
		},

		/**
		 * Turn off change tracking and event handling.
		 */
		disableChangeTracking: function () {
			this._isTracking = false;
		},

		/**
		 * Sets or toggles the tracking and event handling state.
		 * @param {Boolean} bTrack if undefined, the tracking state is toggled, otherwise set to the parameter
		 */
		toggleChangeTracking: function (bTrack) {
			bTrack = (undefined === bTrack) ? ! this._isTracking : !!bTrack;
			this._isTracking = bTrack;
		},
		/**
		 * Set the user to be tracked. A user object has the following properties:
		 * {`id`, `name`}
		 */
		setCurrentUser: function (user) {
			this.currentUser = user;
			this._updateUserData(user); // dfl, update data dependant on the user details
		},

		/**
		 * Set the session id. If the session id is not null, the tracker aggregates change span
		 * from the same user only if they have the same session id
		 */
		setSessionId: function (sid) {
			this._sessionId = sid;
		},

		/**
		 * Sets or toggles the tooltips state.
		 * @param {Boolean} bTooltips if undefined, the tracking state is toggled, otherwise set to the parameter
		 */
		toggleTooltips: function(bTooltips) {
			bTooltips = (undefined === bTooltips) ? ! this.tooltips : Boolean(bTooltips);
			this.tooltips = bTooltips;
			this._updateTooltipsState();
		},

		visible: function(el) {
			if(el.nodeType === ice.dom.TEXT_NODE) el = el.parentNode;
			var rect = el.getBoundingClientRect();
			return ( rect.top > 0 && rect.left > 0);
		},


		/**
		 * Returns a tracking tag for the given `changeType`, with the optional `childNode` appended.
		 * @private
		 */
		_createIceNode: function (changeType, childNode, changeId) {
			var node = this.env.document.createElement(this.changeTypes[changeType].tag);
			node.setAttribute("class", this._getIceNodeClass(changeType));

			if (childNode) {
				node.appendChild(childNode);
			}
			this._addChange(changeType, [node], changeId);

			return node;
		},

		/**
		 * Inserts the given string/node into the given range with tracking tags, collapsing (deleting)
		 * the range first if needed. If range is undefined, then the range from the Selection object
		 * is used. If the range is in a parent delete node, then the range is positioned after the delete.
		 * @param options may contain <strong>nodes</strong> (DOM element or array of dom elements) or <strong>text</strong> (string).
		 * @returns {Boolean} true if the action should continue, false if the action was finished in the insert sequence
		 */
		insert: function (options) {
			this.hostMethods.beforeInsert && this.hostMethods.beforeInsert();

			var _rng = this.getCurrentRange(),
				range = this._isRangeInElement(_rng, this.element),
				hostRange = range ? null : this.hostMethods.getHostRange(),
				changeid = this._startBatchChange(),
				hadSelection = !!(range && !range.collapsed),
				ret = false;

			options = options || {};


		// If we have any nodes selected, then we want to delete them before inserting the new text.
			try {
				if (hadSelection) {
					this._deleteContents(false, range);
				// Update the range
					range = this.getCurrentRange();
				}
				if (range || hostRange) {
					var nodes = options.nodes;
					if (nodes && ! $.isArray(nodes)) {
						nodes = [nodes];
					}

					// If we are in a non-tracking/void element, move the range to the end/outside.
					this._moveRangeToValidTrackingPos(range, hostRange);

					// insertnodes returns true if the text was inserted
					ret = this._insertNodes(range, hostRange, {nodes: nodes, text: options.text, insertStubText: options.insertStubText !== false});
				}
			}
			catch(e) {
				logError(e, "while trying to insert nodes");
			}
			finally {
				this._endBatchChange(changeid);
			}
			return ret;//isPropagating;
		},

		/**
		 * Deletes the contents in the given range or the range from the Selection object. If the range
		 * is not collapsed, then a selection delete is handled; otherwise, it deletes one character
		 * to the left or right if the right parameter is false or true, respectively.
		 * compared OK
		 * @return true if deletion was handled.
		 * @private
		 */
		_deleteContents: function (right, range) {
			var prevent = true,
				browser = this._browser;

			this.hostMethods.beforeDelete && this.hostMethods.beforeDelete();
			if (range) {
				this.selection.addRange(range);
			}
			else {
				range = this.getCurrentRange();
			}
			var changeid = this._startBatchChange();
			try {
				if (range.collapsed === false) {
					range = this._deleteSelection(range);
	/*				if(this._browser.mozilla){
						if(range.startContainer.parentNode.previousSibling){
							range.setEnd(range.startContainer.parentNode.previousSibling, 0);
							range.moveEnd(ice.dom.CHARACTER_UNIT, ice.dom.getNodeCharacterLength(range.endContainer));
						}
						else {
							range.setEndAfter(range.startContainer.parentNode);
						}
						range.collapse(false);
					}
					else { */
						if(range && ! this.visible(range.endContainer)) {
							range.setEnd(range.endContainer, Math.max(0, range.endOffset - 1));
							range.collapse(false);
						}
//					}
				}
				else {
					this._cleanupSelection(range, false, true);
			        if (right) {
						// RIGHT DELETE
						if(browser["type"] === "mozilla"){
							prevent = this._deleteRight(range);
							// Handling track change show/hide
							if(!this.visible(range.endContainer)){
								if(range.endContainer.parentNode.nextSibling){
			//						range.setEnd(range.endContainer.parentNode.nextSibling, 0);
									range.setEndBefore(range.endContainer.parentNode.nextSibling);
								} else {
									range.setEndAfter(range.endContainer);
								}
								range.collapse(false);
							}
						}
						else {
							// Calibrate Cursor before deleting
							if(range.endOffset === ice.dom.getNodeCharacterLength(range.endContainer)){
								var next = range.startContainer.nextSibling;
								if (ice.dom.is(next,  '.' + this._getIceNodeClass('deleteType'))) {
									while(next){
										if (ice.dom.is(next,  '.' + this._getIceNodeClass('deleteType'))) {
											next = next.nextSibling;
											continue;
										}
										range.setStart(next, 0);
										range.collapse(true);
										break;
									}
								}
							}

							// Delete
							prevent = this._deleteRight(range);

							// Calibrate Cursor after deleting
							if(!this.visible(range.endContainer)){
								if (ice.dom.is(range.endContainer.parentNode,  '.' + this._getIceNodeClass('insertType') + ', .' + this._getIceNodeClass('deleteType'))) {
			//						range.setStart(range.endContainer.parentNode.nextSibling, 0);
									range.setStartAfter(range.endContainer.parentNode);
									range.collapse(true);
								}
							}
						}
					}
					else {
						// LEFT DELETE
						if(browser.mozilla){
							prevent = this._deleteLeft(range);
							// Handling track change show/hide
							if(!this.visible(range.startContainer)){
								if(range.startContainer.parentNode.previousSibling){
									range.setEnd(range.startContainer.parentNode.previousSibling, 0);
								} else {
									range.setEnd(range.startContainer.parentNode, 0);
								}
								range.moveEnd(ice.dom.CHARACTER_UNIT, ice.dom.getNodeCharacterLength(range.endContainer));
								range.collapse(false);
							}
						}
						else {
							if(!this.visible(range.startContainer)){
								if(range.endOffset === ice.dom.getNodeCharacterLength(range.endContainer)){
									var prev = range.startContainer.previousSibling;
									if (ice.dom.is(prev,  '.' + this._getIceNodeClass('deleteType'))) {
										while(prev){
											if (ice.dom.is(prev,  '.' + this._getIceNodeClass('deleteType'))) {
												prev = prev.prevSibling;
												continue;
											}
											range.setEndBefore(prev.nextSibling, 0);
											range.collapse(false);
											break;
										}
									}
								}
							}
							prevent = this._deleteLeft(range);
						}
					}
				}

				range && this.selection.addRange(range);
			}
			finally {
				this._endBatchChange(changeid);
			}
			return prevent;
		},

		/**
		 * Returns the changes - a hash of objects with the following properties:
		 * [changeid] => {`type`, `time`, `userid`, `username`}
		 */
		getChanges: function () {
			return this._changes;
		},

		/**
		 * Returns an array with the user ids who made the changes
		 */
		getChangeUserids: function () {
			var self = this,
				keys = Object.keys(this._changes),
				result = keys.map(function(key) {
					return self._changes[keys[key]].userid
				});

			// probably makes the list unique
			return result.sort().filter(function (el, i, a) {
				if (i === a.indexOf(el)) return 1;
				return 0;
			});
		},

		/**
		 * Returns the html contents for the tracked element.
		 */
		getElementContent: function () {
			return this.element.innerHTML;
		},

		/**
		 * Returns the html contents, without tracking tags, for `this.element` or
		 * the optional `body` param which can be of either type string or node.
		 * Delete tags, and their html content, are completely removed; all other
		 * change type tags are removed, leaving the html content in place. After
		 * cleaning, the optional `callback` is executed, which should further
		 * modify and return the element body.
		 *
		 * prepare gets run before the body is cleaned by ice.
		 */
		getCleanContent: function (body, callback, prepare) {
			var newBody = this.getCleanDOM(body, {callback:callback, prepare: prepare, clone: true});
			return (newBody && newBody.innerHTML) || "";
		},

		/**
		 * Returns a clone of the DOM, without tracking tags, for `this.element` or
		 * the optional `body` param which can be of either type string or node.
		 * Delete tags, and their html content, are completely removed; all other
		 * change type tags are removed, leaving the html content in place.
		 * @param body If not null, the node or html to process
		 * @param options may contain:
		 * <ul><li>callback - executed after cleaning, should return the processed body
		 * <li>clone If true, process a clone of the target element
		 * <li>prepare function to run on body before the cleaning
		 */
		getCleanDOM : function(body, options) {
			var classList = '',
				self = this;
			options = options || {};
			ice.dom.each(this.changeTypes, function (type, i) {
				if (type != 'deleteType') {
					if (i > 0) {
						classList += ',';
					}
					classList += '.' + self._getIceNodeClass(type);
				}
			});
			if (body) {
				if (typeof body === 'string') {
					body = ice.dom.create('<div>' + body + '</div>');
				}
				else if (options.clone){
					body = ice.dom.cloneNode(body, false)[0];
				}
			}
			else {
				body = options.clone? ice.dom.cloneNode(this.element, false)[0] : this.element;
			}
			return this._cleanBody(body, classList, options);
		},

		_cleanBody: function(body, classList, options) {
			body = options.prepare ? options.prepare.call(this, body) : body;
			var changes = ice.dom.find(body, classList);
			ice.dom.each(changes, function (i,el) {
				while (el.firstChild) {
					el.parentNode.insertBefore(el.firstChild, el);
				}
				el.parentNode.removeChild(el);
			});
			var deletes = ice.dom.find(body, '.' + this._getIceNodeClass('deleteType'));
			ice.dom.remove(deletes);

			body = options.callback ? options.callback.call(this, body) : body;

			return body;
		},

		/**
		 * Accepts all changes in the element body - removes delete nodes, and removes outer
		 * insert tags keeping the inner content in place.
		 * dfl:added support for filtering
		 */
		acceptAll: function (options) {
			if (options) {
				return this._acceptRejectSome(options, true);
			}
			else {
				this.getCleanDOM(this.element, {
					clone: false
				});
//				this.element.innerHTML = this.getCleanContent();
				this._changes = {}; // dfl, reset the changes table
				this._triggerChange(); // notify the world that our change count has changed
			}
		},

		/**
		 * Rejects all changes in the element body - removes insert nodes, and removes outer
		 * delete tags keeping the inner content in place.*
		 * dfl:added support for filtering
		 */
		rejectAll: function (options) {
			if (options) {
				return this._acceptRejectSome(options, false);
			}
			else {
				var insSel = '.' + this._getIceNodeClass('insertType'),
					delSel = '.' + this._getIceNodeClass('deleteType'),
					content, self = this;

				ice.dom.find(this.element, insSel).each(function(i,e) {
					self._removeNode(e);
				});
				ice.dom.each(ice.dom.find(this.element, delSel), function (i, el) {
					content = ice.dom.contents(el);
					ice.dom.replaceWith(el, content);
					$.each(content, function(i,e) {
						var parent = e && e.parentNode;
						self._normalizeNode(parent);
					});
				});
				this._changes = {}; // dfl, reset the changes table
				this._triggerChange(); // notify the world that our change count has changed
			}
		},

		/**
		 * Accepts the change at the given, or first tracking parent node of, `node`.	If
		 * `node` is undefined then the startContainer of the current collapsed range will be used.
		 * In the case of insert, inner content will be used to replace the containing tag; and in
		 * the case of delete, the node will be removed.
		 */
		acceptChange: function (node) {
			this.acceptRejectChange(node, true);
		},

		/**
		 * Rejects the change at the given, or first tracking parent node of, `node`.	If
		 * `node` is undefined then the startContainer of the current collapsed range will be used.
		 * In the case of delete, inner content will be used to replace the containing tag; and in
		 * the case of insert, the node will be removed.
		 */
		rejectChange: function (node) {
			this.acceptRejectChange(node, false);
		},

		/**
		 * Handles accepting or rejecting tracking changes
		 */
		acceptRejectChange: function (node, isAccept) {
			var delSel, insSel, selector, removeSel, replaceSel,
				trackNode, changes, dom = ice.dom, nChanges,
				self = this, changeId, content, userStyle,
				userStyles = this._userStyles,
				userId, userAttr = this.attributes.userId,
				delClass = this._getIceNodeClass('deleteType'),
				insClass = this._getIceNodeClass('insertType');

			if (!node) {
				var range = this.getCurrentRange();
				if (! range || !range.collapsed) {
					return;
				}
				node = range.startContainer;
			}

			delSel = removeSel = '.' + delClass;
			insSel = replaceSel = '.' + insClass;
			if (!isAccept) {
				removeSel = insSel;
				replaceSel = delSel;
			}

			selector = delSel + ',' + insSel;
			trackNode = dom.getNode(node, selector);
			changeId = dom.attr(trackNode, this.attributes.changeId);
				// Some changes are done in batches so there may be other tracking
				// nodes with the same `changeIdAttribute` batch number.
			changes = dom.find(this.element, removeSel + '[' + this.attributes.changeId + '=' + changeId + ']');
			nChanges = changes.length;
			changes.each(function(i, changeNode) {
				self._removeNode(changeNode);
			});

			// we handle the replaced nodes after the deleted nodes because, well, the engine may b buggy, resulting in some nesting
			changes = dom.find(this.element, replaceSel + '[' + this.attributes.changeId + '=' + changeId + ']');
			nChanges += changes.length;

			dom.each(changes, function (i, node) {
				if (isNewlineNode(node)) {
					return stripNode(node);
				}
				userId = node.getAttribute(userAttr);
				userStyle = userId !== null ? userStyles[userId] || "" :"";

				content = ice.dom.contents(node);
				// work around a situation where the browser extracts the node style and applies it to the content
				$(node).removeClass(insClass + ' ' + delClass + ' ' + userStyle);
				dom.replaceWith(node, content);
				$.each(content, function(i,e) {
					var txt = ice.dom.TEXT_NODE == e.nodeType && e.nodeValue;
					if (txt) {
						var found = false;
						while (txt.indexOf("  ") >= 0) {
							found = true;
							txt = txt.replace("  ", " \u00a0"); // replace two spaces with space+nbsp
						}
						if (found) {
							e.nodeValue = txt;
						}
					}
					var parent = e && e.parentNode;
					self._normalizeNode(parent);
				});
			});

			/* begin dfl: if changes were accepted/rejected, remove change trigger change event */
			delete this._changes[changeId];
			if (nChanges > 0) {
				this._triggerChange();
			}
			/* end dfl */
		},

		/**
		 * Returns true if the given `node`, or the current collapsed range is in a tracking
		 * node; otherwise, false.
		 * @param node The node to test or null to test the selection
		 * @param onlyNode if true, test only the node
		 * @param cleanupDOM - if false, don't mess with the selection, just test
		 */
		isInsideChange: function (node, onlyNode, cleanupDOM) {
			try {
				return !! this.currentChangeNode(node, onlyNode, cleanupDOM); // refactored by dfl
			}
			catch (e) {
				logError(e, "While testing if isInsideChange");
				return false;
			}
		},

		/**
		 * Returns a jquery list of all the tracking nodes in the current editable element
		 */
		getIceNodes : function() {
			var classList = [];
			var self = this;
			ice.dom.each(this.changeTypes, // iterate over type map
				function (type) {
					classList.push('.' + self._getIceNodeClass(type));
				});
			classList = classList.join(',');
			return $(this.element).find(classList);
		},

		/**
		 * Returns this `node` or the first parent tracking node with the given `changeType`.
		 * @private
		 */
		_getIceNode: function (node, changeType) {
			var selector = this.changeTypes[changeType].tag + '.' + this._getIceNodeClass(changeType);
			return ice.dom.getNode((node && node.$) || node, selector);
		},

		_isNodeOfChangeType: function(node, changeType) {
			if (! node) {
				return false;
			}
			var selector = '.' + this._getIceNodeClass(changeType);
			return ice.dom.is(node.$ || node, selector);
		},

		_isInsertNode: function(node) {
			return this._isNodeOfChangeType(node, "insertType");
		},

		_isDeleteNode: function(node) {
			return this._isNodeOfChangeType(node, "deleteType");
		},

		_normalizeNode: function(node) {
			return 	ice.dom.normalizeNode(node, this._browser.msie);
		},

		/**
		 * Sets the given `range` to the first position, to the right, where it is outside of
		 * void elements.
		 * @private
		 */
		_moveRangeToValidTrackingPos: function (range, hostRange) {
			// set range to hostRange if available
			if (! (range = (hostRange || range))) {
				return;
			}

			var voidEl,
				el, searchBack = -1, elNode,
				visited = [], newEdge, edgeNode,
				fnode = hostRange ? this.hostMethods.getHostNode : nativeElement,
				found = false;
			while (! found) {
				el = range.startContainer;
				if (! el || visited.indexOf(el) >= 0) {
					return; // loop
				}
				elNode = fnode(el);
				visited.push(el);
				voidEl = this._getVoidElement(elNode);
				if (voidEl) {
					if ((voidEl != el) && (visited.indexOf(voidEl) >= 0)) {
						return; // loop
					}
					visited.push(voidEl);
				}
				else {
					found = ice.dom.isTextContainer(elNode);
				}
				if (! found) { // in void element or non text container
					if (-1 == searchBack) {
						searchBack = ! isOnRightEdge(fnode(range.startContainer), range.startOffset);
					}
					newEdge = searchBack ? ice.dom.findPrevTextContainer(voidEl || elNode, this.element) :
							ice.dom.findNextTextContainer(voidEl || elNode, this.element);
					edgeNode = newEdge.node;
					// we have a new edge node

					if (hostRange) {
						edgeNode = this.hostMethods.makeHostElement(edgeNode);
					}
					try {
						if (searchBack) {
							range.setStart(edgeNode, newEdge.offset);
						}
						else {
							range.setEnd(edgeNode, newEdge.offset);
						}
						range.collapse(searchBack);
					}
					catch (e) { // if we can't set the selection for whatever reason, end of document etc., break
						logError(e, "While trying to move range to valid tracking position");
						break;
					}
				}
			}
		},

		/**
		 * Utility function
		 * Returns the range if its startcontainer is a descendant of (or equal to) the given top element
		 */
		_isRangeInElement: function(range, top) {
			var start = range && range.startContainer;
			while (start) {
				if (start == top) {
					return range;
				}
				start = start.parentNode;
			}
			return null;
		},


		/**
		 * Returns the given `node` or the first parent node that matches against the list of void elements.
		 * dfl: added try/catch
		 * @private
		 */
		_getVoidElement: function (node) {

			try {
				var voidParent = this._getIceNode(node, "deleteType");
				if (! voidParent) {
					if (3 == node.nodeType && node.nodeValue == '\u200B') {
						return node;
					}
				}
				return voidParent;
			}
			catch(e) {
				logError(e, "While trying to get void element of", node);
				return null;
			}
		},

		/**
		 * @private
		 * If the range is collapsed, removes empty nodes around the caret
		 * @param range the range to clean up
		 * @param isHostRange if true, the range is a ckeditor range
		 * @param changeSelection if true, the selected node can also be cleaned up
		 */
		_cleanupSelection: function(range, isHostRange, changeSelection) {
			var start;
			if (! range || ! range.collapsed || ! (start = range.startContainer)) {
				return;
			}
			if (isHostRange) {
				start = this.hostMethods.getHostNode(start);
			}
			var nt = start.nodeType;
			if (ice.dom.TEXT_NODE == nt) {
				return this._cleanupTextSelection(range, start, isHostRange, changeSelection);
			}
			else {
				return this._cleanupElementSelection(range, isHostRange);
			}
		},

		/**
		 * @private
		 * assumes range is valid for this operation
		 */
		_cleanupTextSelection: function(range, start, isHostRange, changeSelection) {
			this._cleanupAroundNode(start);
			if (changeSelection && ice.dom.isEmptyTextNode(start)) {
				var parent = start.parentNode,
					ind = ice.dom.getNodeIndex(start),
					f = isHostRange ? this.hostMethods.makeHostElement : nativeElement;
				parent.removeChild(start);
				ind = Math.max(0, ind);
				range.setStart(f(parent), ind);
				range.setEnd(f(parent), ind);
			}
		},


			/**
		 * @private
		 * assumes range is valid for this operation
		 */
		_cleanupElementSelection: function(range, isHostRange) {
			var start, includeStart = false,
				parent = isHostRange ? this.hostMethods.getHostNode(range.startContainer) : range.startContainer,
				childCount = parent.childNodes.length;
			if (childCount < 1) {
				return;
			}
			try {
				if (range.startOffset > 0) {
					start = parent.childNodes[range.startOffset - 1];
				}
				else {
					start = parent.firstChild;
					includeStart = true;
				}
				if (! start) {
					return;
				}
			}
			catch(e) {
				return;
			}
			this._cleanupAroundNode(start, includeStart);
			if (range.startOffset === 0) {
				return;
			}
			var ind = ice.dom.getNodeIndex(start) + 1;
			if (ice.dom.isEmptyTextNode(start)) {
				ind = Math.max(0, ind - 1);
				parent.removeChild(start);
			}
			if (parent.childNodes.length != childCount) {
				var f = isHostRange ? this.hostMethods.makeHostElement : nativeElement;
				range.setStart(f(parent), ind);
				range.setEnd(f(parent), ind);
			}
		},

		_cleanupAroundNode: function(node, includeNode) {
			var parent = node.parentNode,
				anchor = node.nextSibling,
				tmp;
			while (anchor) {
				if (ice.dom.isEmptyTextNode(anchor)) {
					tmp = anchor;
					anchor = anchor.nextSibling;
					parent.removeChild(tmp);
				}
				else {
					anchor = anchor.nextSibling;
				}
			}
			anchor = node.previousSibling;
			while (anchor) {
				if (ice.dom.isEmptyTextNode(anchor)) {
					tmp = anchor;
					anchor = anchor.previousSibling;
					parent.removeChild(tmp);
				}
				else {
					anchor = anchor.previousSibling;
				}
			}
			if (includeNode && ice.dom.isEmptyTextNode(node)) {
				parent.removeChild(node);
			}
		},

		/**
		 * Returns true if node has a user id attribute that matches the current user id.
		 * @private
		 */
		_isCurrentUserIceNode: function (node) {
			var ret = node && (ice.dom.attr(node, this.attributes.userId) == this.currentUser.id);
			if (ret && this._sessionId) {
				ret = ice.dom.attr(node, this.attributes.sessionId) === this._sessionId;
			}
			return ret;
		},

		/**
		 * With the given alias, searches the changeTypes objects and returns the
		 * associated key for the alias.
		 * @private
		 */
		_getChangeTypeFromAlias: function (alias) {
			var type, ctnType = null;
			for (type in this.changeTypes) {
				if (this.changeTypes.hasOwnProperty(type)) {
					if (this.changeTypes[type].alias == alias) {
						ctnType = type;
					}
				}
			}

			return ctnType;
		},

/**
 * @private
 */
		_getIceNodeClass: function (changeType) {
			return this.attrValuePrefix + this.changeTypes[changeType].alias;
		},

		/**
		 * @private
		 */
		_getUserStyle: function (userid) {
			if (userid === null || userid === "" || "undefined" == typeof userid) {
				return this.stylePrefix;
			}
			var styleIndex = null;
			if (this._userStyles[userid]) {
				styleIndex = this._userStyles[userid];
			}
			else {
				styleIndex = this._setUserStyle(userid, this._getNewStyleId());
			}
			return styleIndex;
		},

		/**
		 * @private
		 */
		_setUserStyle: function (userid, styleIndex) {
			var style = this.stylePrefix + '-' + styleIndex;
			if (!this._styles[styleIndex]) {
				this._styles[styleIndex] = true;
			}
			return this._userStyles[userid] = style;
		},

		_getNewStyleId: function () {
			var id = ++this._uniqueStyleIndex;
			if (this._styles[id]) {
			// Dupe.. create another..
				return this._getNewStyleId();
			}
			else {
				this._styles[id] = true;
				return id;
			}
		},

		_addChange: function (ctnType, ctNodes, changeIdToUse) {
			var changeid = changeIdToUse || this._batchChangeId || this.getNewChangeId(),
				self = this;

			if (!this._changes[changeid]) {
				var now =  (new Date()).getTime();
				// Create the change object.
				this._changes[changeid] = {
					type: ctnType,
					time: now,
					lastTime: now,
					sessionId: this._sessionId,
					userid: String(this.currentUser.id),// dfl: must stringify for consistency - when we read the props from dom attrs they are strings
					username: this.currentUser.name,
					data : this._changeData || ""
				};
				this._triggerChange(); //dfl
			}
			ice.dom.foreach(ctNodes, function (i) {
				self._addNodeToChange(changeid, ctNodes[i]);
			});

			return changeid;
		},

		/**
		 * Adds tracking attributes from the change with changeid to the ctNode.
		 * @param changeid Id of an existing change.
		 * @param ctNode The element to add for the change.
		 * @private
		 */
		_addNodeToChange: function (changeid, ctNode) {
			var change = this.getChange(changeid),
				attributes = {};

			if (!ctNode.getAttribute(this.attributes.changeId)) {
				attributes[this.attributes.changeId] = changeid;
			}
// handle missing userid, try to set username according to userid
			var userId = ctNode.getAttribute(this.attributes.userId);
			if (! userId) {
				userId = change.userid;
				attributes[this.attributes.userId] = userId;
			}
			if (userId == change.userid) {
				attributes[this.attributes.userName] = change.username;
			}

// add change data
			var changeData = ctNode.getAttribute(this.attributes.changeData);
			if (null === changeData) {
				attributes[this.attributes.changeData] = this._changeData || "";
			}

			if (!ctNode.getAttribute(this.attributes.time)) {
				attributes[this.attributes.time] = change.time;
			}

			if (!ctNode.getAttribute(this.attributes.lastTime)) {
				attributes[this.attributes.lastTime] = change.lastTime;
			}

			if (change.sessionId && ! ctNode.getAttribute(this.attributes.sessionId)) {
				attributes[this.attributes.sessionId] = change.sessionId;
			}

			if (! change.style) {
				change.style = this._getUserStyle(change.userid);
			}
			$(ctNode).attr(attributes).addClass(change.style);
			/* Added by dfl */
			this._updateNodeTooltip(ctNode);
		},

		getChange: function (changeid) {
			return this._changes[changeid] || null;
		},

		getNewChangeId: function () {
			var id = ++this._uniqueIDIndex;
			if (this._changes[id]) {
				// Dupe.. create another..
				id = this.getNewChangeId();
			}
			return id;
		},

		/**
		 * @private
		 * Start a batch change if none is already underway
		 * @return a change id if a new batch has been started, otherwise null
		 */
		_startBatchChange: function () {
			return this._batchChangeId ? null :
				(this._batchChangeId = this.getNewChangeId());
		},

		/**
		 * Returns the top level DOM element handled by this change tracker
		 */
		getContentElement: function() {
			return this.element;
		},

		/**
		 * @private
		 * End the batch change
		 * @param changeid If not identical to the current change id, no action is taken
		 * this allows callers to start a batch change but end it only if the change was really started by the caller
		 */
		_endBatchChange: function (changeid) {
			if (changeid && (changeid === this._batchChangeId)) {
				this._batchChangeId = null;
				this._triggerChangeText();
			}
		},

		getCurrentRange: function () {
			try {
				return this.selection.getRangeAt(0);
			}
			catch (e) {
				logError(e, "While trying to get current range");
				return null;
			}
		},

		_insertNodes: function (_range, hostRange, _data) {
			var range = hostRange || _range,
				data = _data || {},
				_start = range.startContainer,
				start = (_start && _start.$) || _start,
				f = hostRange ? this.hostMethods.makeHostElement : nativeElement,
				nodes = data.nodes,
				insertStubText = data.insertStubText !== false,
				text = data.text, i, len,
				doc= this.env.document,
				inserted = false;

			var ctNode = this._getIceNode(start, 'insertType'),
				inCurrentUserInsert = this._isCurrentUserIceNode(ctNode);

			this._cleanupSelection(range, Boolean(hostRange), true);
			if (inCurrentUserInsert) {
				var head = nodes && nodes[0],
					changeId = ctNode.getAttribute(this.attributes.changeId);
				if (head) {
					inserted = true;
					range.insertNode(f(head));
					var parent = head.parentNode,
						sibling = head.nextSibling;

					len = nodes.length;
					for (i = 1; i < len; ++i) {
						if (sibling) {
							parent.insertBefore(nodes[i], sibling);
						}
						else {
							parent.appendChild(nodes[i]);
						}
					}
					/* Now move the caret to the end of the last node inserted */
					var tail = nodes[len - 1];
					if (ice.dom.TEXT_NODE == tail.nodeType) {
						range.setEnd(tail, (tail.nodeValue && tail.nodeValue.length) || 0);
					}
					else {
						range.setEndAfter(tail);
					}
					range.collapse();
					if (hostRange) {
						this.hostMethods.setHostRange(hostRange);
					}
					else {
						this.selection.addRange(range);
					}
				}
				else {
					prepareSelectionForInsert(null, range, doc, insertStubText);
				}
				// even if there was no data to insert, we are probably setting up for a char insertion
				this._updateChangeTime(changeId);
			}
			else {
				// If we aren't in an insert node which belongs to the current user, then create a new ins node
				var node = this._createIceNode('insertType');
				if (ctNode) {
					var nChildren = ctNode.childNodes.length;
					this._normalizeNode(ctNode);
					if (nChildren != ctNode.childNodes.length) { // normalization removed nodes, refresh range
						if (hostRange) {
							hostRange = range = this.hostMethods.getHostRange();
						}
						else {
							range.refresh();
						}
					}
					if (ctNode) {
						var end = (hostRange && this.hostMethods.getHostNode(hostRange.endContainer)) || range.endContainer;
						// if inserting before the end of a tracked node by another user
						if ((end.nodeType == 3 && range.endOffset < range.endContainer.length) || (end != ctNode.lastChild)) {
							ctNode = this._splitNode(ctNode, range.endContainer, range.endOffset);
						}
					}
				}
				if (ctNode) {
					range.setStartAfter(f(ctNode));
					range.collapse(true);
				}


				range.insertNode(f(node));
				len = (nodes && nodes.length) || 0;
				if (len) {
					inserted = true;
					for (i = 0; i < len; ++i) {
						node.appendChild(nodes[i]);
					}
					range.setEndAfter(f(node.lastChild));
					range.collapse();
				}
				else if (text) {
					inserted = true;
					var tn = doc.createTextNode(text);
					node.appendChild(tn);
					range.setEnd(tn, 1);
					range.collapse();
				}
				else {
					prepareSelectionForInsert(node, range, doc, insertStubText);
				}
				if (hostRange) {
					this.hostMethods.setHostRange(hostRange);
				}
				else {
					this.selection.addRange(range);
				}
			}
			return inserted;
		},

		/**
		 * @private
		 * updates the change with the current time stamp and copies to change nodes
		 */
		_updateChangeTime: function(changeId) {
			var change = this._changes[changeId];
			if (change) {
				var now = (new Date()).getTime(),
					nodes = ice.dom.find(this.element, '[' + this.attributes.changeId + '=' + changeId + ']'),
					attr = this.attributes.lastTime;
				change.lastTime = now;
				nodes.each(function(index, node) {
					node.setAttribute(attr, now);
				});
			}
		},

// compared OK
		_handleVoidEl: function(el, range) {
			// If `el` is or is in a void element, but not a delete
			// then collapse the `range` and return `true`.
			var voidEl = el && this._getVoidElement(el);
			if (voidEl && !this._getIceNode(voidEl, 'deleteType')) {
				range.collapse(true);
				return true;
			}
			return false;
		},

// compared OK
		_deleteSelection: function (range) {

			// Bookmark the range and get elements between.
			var bookmark = new ice.Bookmark(this.env, range),
				elements = ice.dom.getElementsBetween(bookmark.start, bookmark.end),
				betweenBlocks = [];
	// elements length may change during the loop so don't optimize
			for (var i = 0; i < elements.length; i++) {
				var elem = elements[i];
				if (! elem || ! elem.parentNode) { // maybe removed as a side effect of removing other stuff
					continue;
				}
				if (ice.dom.isBlockElement(elem)) {
					betweenBlocks.push(elem);
					if (!ice.dom.canContainTextElement(elem)) {
						// Ignore containers that are not supposed to contain text. Check children instead.
						for (var k = 0; k < elem.childNodes.length; k++) {
							elements.push(elem.childNodes[k]);
						}
						continue;
					}
				}
				// Ignore empty space nodes
				if (ice.dom.isEmptyTextNode(elem)) {
					this._removeNode(elem);
					continue;
				}

				if (!this._getVoidElement(elem)) {
					// If the element is not a text or stub node, go deeper and check the children.
					if (elem.nodeType !== ice.dom.TEXT_NODE) {
						// Browsers like to insert breaks into empty paragraphs - remove them
						if (isBRNode(elem)) {
							this._addDeleteTrackingToBreak(elem);
							continue;
						}

						if (ice.dom.isStubElement(elem)) {
							this._addDeleteTracking(elem, {range:null, moveLeft:true});
							continue;
						}
						if (ice.dom.hasNoTextOrStubContent(elem)) {
							this._removeNode(elem);
							continue;
						}

//						if (isParagraphNode(elem)) {
//							this._addDeleteTrackingToBreak(elem);
//						}

						for (var j = 0; j < elem.childNodes.length; j++) {
							var child = elem.childNodes[j];
							elements.push(child);
						}
						continue;
					}
					var parentBlock = ice.dom.getBlockParent(elem);
					this._addDeleteTracking(elem, {range:null, moveLeft:true});
					if (ice.dom.hasNoTextOrStubContent(parentBlock)) {
						ice.dom.remove(parentBlock);
					}
				}
			}

			bookmark.selectBookmark();
			if (range = this.getCurrentRange()) {
				range.collapse(true);
			}
			return range;
		},

		/**
		 * Deletes to the right (delete key)
		 * @private
		 */
		_deleteRight: function (range) {

			var parentBlock = ice.dom.isBlockElement(range.startContainer) && range.startContainer || ice.dom.getBlockParent(range.startContainer, this.element) || null,
				isEmptyBlock = parentBlock ? (ice.dom.hasNoTextOrStubContent(parentBlock)) : false,
				nextBlock = parentBlock && ice.dom.getNextContentNode(parentBlock, this.element),
				nextBlockIsEmpty = nextBlock ? (ice.dom.hasNoTextOrStubContent(nextBlock)) : false,
				initialContainer = range.endContainer,
				initialOffset = range.endOffset, i,
				commonAncestor = range.commonAncestorContainer,
				nextContainer, returnValue = false;


			// If the current block is empty then let the browser handle the delete/event.
			if (isEmptyBlock) {
				return false;
			}

			// Some bugs in Firefox and Webkit make the caret disappear out of text nodes, so we try to put them back in.
			if (isBRNode(commonAncestor)) {
				this._addDeleteTrackingToBreak(commonAncestor, {range: range});
				return true;
			}

			if (commonAncestor.nodeType !== ice.dom.TEXT_NODE) {
				// If placed at the beginning of a container that cannot contain text, such as an ul element, place the caret at the beginning of the first item.
				if (initialOffset === 0 && ice.dom.isBlockElement(commonAncestor) && (!ice.dom.canContainTextElement(commonAncestor))) {
					var firstItem = commonAncestor.firstElementChild;
					if (firstItem) {
						range.setStart(firstItem, 0);
						range.collapse();
						return this._deleteRight(range);
					}
				}

				if (commonAncestor.childNodes.length > initialOffset) {
					var next = commonAncestor.childNodes[initialOffset];
					if (isBRNode(next)) {
						this._addDeleteTrackingToBreak(next, {range: range});
						return true;
					}
					range.setStart(commonAncestor.childNodes[initialOffset], 0);
					range.collapse(true);
					returnValue = this._deleteRight(range);
					range.refresh();
					return returnValue;
				}
				else {
					nextContainer = ice.dom.getNextContentNode(commonAncestor, this.element);

					if (nextContainer) {
						if (isBRNode(nextContainer)) {
							this._addDeleteTrackingToBreak(nextContainer, { range: range });
							return true;
						}
						range.setEnd(nextContainer, 0);
					}
					range.collapse();
					return this._deleteRight(range);
				}
			}

			// Move range to position the cursor on the inside of any adjacent container that it is going
			// to potentially delete into or after a stub element.	E.G.:	test|<em>text</em>	->	test<em>|text</em> or
			// text1 |<img> text2 -> text1 <img>| text2

			try {
				range.moveEnd(ice.dom.CHARACTER_UNIT, 1);
				range.moveEnd(ice.dom.CHARACTER_UNIT, -1);
			}
			catch (ignore){}

			// Handle cases of the caret is at the end of a container or placed directly in a block element
			if (initialOffset === initialContainer.data.length && (!ice.dom.hasNoTextOrStubContent(initialContainer))) {
				nextContainer = ice.dom.getNextNode(initialContainer, this.element);

				// If the next container is outside of ICE then do nothing.
				if (!nextContainer) {
					range.selectNodeContents(initialContainer);
					range.collapse();
					return false;
				}

				// If the next container is <br> element find the next node
				if (isBRNode(nextContainer)) {
					this._addDeleteTrackingToBreak(nextContainer, { range: range });
					return true;
//					nextContainer = ice.dom.getNextNode(nextContainer, this.element);
				}

				// If the next container is a text node, look at the parent node instead.
				if (nextContainer.nodeType === ice.dom.TEXT_NODE) {
					nextContainer = nextContainer.parentNode;
				}

				// If the next container is non-editable, enclose it with a delete ice node and add an empty text node after it to position the caret.
				if (!nextContainer.isContentEditable) {
					returnValue = this._addDeleteTracking(nextContainer, {range:null, moveLeft:false, merge: true});
					var emptySpaceNode = this.env.document.createTextNode('');
					nextContainer.parentNode.insertBefore(emptySpaceNode, nextContainer.nextSibling);
					range.selectNode(emptySpaceNode);
					range.collapse(true);
					return returnValue;
				}

				if (this._handleVoidEl(nextContainer, range)) {
					return true;
				}

				// If the caret was placed directly before a stub element, enclose the element with a delete ice node.
				if (ice.dom.isChildOf(nextContainer, parentBlock) && ice.dom.isStubElement(nextContainer)) {
					return this._addDeleteTracking(nextContainer, {range:range, moveLeft:false, merge:true});
				}

			}

			if (this._handleVoidEl(nextContainer, range)) {
				return true;
			}

			if (ice.dom.isOnBlockBoundary(range.startContainer, range.endContainer, this.element)) {
				if (this.mergeBlocks && ice.dom.is(ice.dom.getBlockParent(nextContainer, this.element), this.blockEl)) {
					// Since the range is moved by character, it may have passed through empty blocks.
					// <p>text {RANGE.START}</p><p></p><p>{RANGE.END} text</p>
					if (nextBlock !== ice.dom.getBlockParent(range.endContainer, this.element)) {
						range.setEnd(nextBlock, 0);
					}
					// The browsers like to auto-insert breaks into empty paragraphs - remove them.
					var elements = ice.dom.getElementsBetween(range.startContainer, range.endContainer);
					for (i = 0; i < elements.length; i++) {
						ice.dom.remove(elements[i]);
					}
					return ice.dom.mergeBlockWithSibling(range, ice.dom.getBlockParent(range.endContainer, this.element) || parentBlock);
				}
				else {
					// If the next block is empty, remove the next block.
					if (nextBlockIsEmpty) {
						ice.dom.remove(nextBlock);
						range.collapse(true);
						return true;
					}

					// Place the caret at the start of the next block.
					range.setStart(nextBlock, 0);
					range.collapse(true);
					return true;
				}
			}

			var entireTextNode = range.endContainer,
				deletedCharacter = splitTextAt(entireTextNode, range.endOffset, 1);

			return this._addDeleteTracking(deletedCharacter, {range:range, moveLeft:false, merge:true});

		},

		/**
		 * Deletes to the left (backspace)
		 * @private
		 */
		_deleteLeft: function (range) {
			var parentBlock = ice.dom.isBlockElement(range.startContainer) && range.startContainer || ice.dom.getBlockParent(range.startContainer, this.element) || null,
			isEmptyBlock = parentBlock ? ice.dom.hasNoTextOrStubContent(parentBlock) : false,
			prevBlock = parentBlock && ice.dom.getPrevContentNode(parentBlock, this.element), // || ice.dom.getBlockParent(parentBlock, this.element) || null,
			prevBlockIsEmpty = prevBlock ? ice.dom.hasNoTextOrStubContent(prevBlock) : false,
			initialContainer = range.startContainer,
			initialOffset = range.startOffset,
			commonAncestor = range.commonAncestorContainer,
			lastSelectable, prevContainer;

			// If the current block is empty, then let the browser handle the key/event.
			if (isEmptyBlock) {
				return false;
			}

			if (isBRNode(commonAncestor)) {
				this._addDeleteTrackingToBreak(commonAncestor, {range: range, moveLeft: true});
				return true;
			}

			// Handle cases of the caret is at the start of a container or outside a text node
			if (initialOffset === 0 || commonAncestor.nodeType !== ice.dom.TEXT_NODE) {
			// If placed at the end of a container that cannot contain text, such as an ul element, place the caret at the end of the last item.
				if (ice.dom.isBlockElement(commonAncestor) && (!ice.dom.canContainTextElement(commonAncestor))) {
					if (initialOffset === 0) {
						var firstItem = commonAncestor.firstElementChild;
						if (firstItem) {
							range.setStart(firstItem, 0);
							range.collapse();
							return this._deleteLeft(range);
						}
					}
					else {
						var lastItem = commonAncestor.lastElementChild;
						if (lastItem) {
							lastSelectable = range.getLastSelectableChild(lastItem);
							if (lastSelectable) {
								range.setStart(lastSelectable, lastSelectable.data.length);
								range.collapse();
								return this._deleteLeft(range);
							}
						}
					}
				}

				if (initialOffset === 0) {
					prevContainer = ice.dom.getPrevContentNode(initialContainer, this.element);
				}
				else {
					prevContainer = commonAncestor.childNodes[initialOffset - 1];
				}

				// If the previous container is outside of ICE then do nothing.
				if (!prevContainer) {
					return false;
				}

				// Firefox finds an ice node wrapped around an image instead of the image itself sometimes, so we make sure to look at the image instead.
				if (ice.dom.is(prevContainer,	'.' + this._getIceNodeClass('insertType') + ', .' + this._getIceNodeClass('deleteType')) && prevContainer.childNodes.length > 0 && prevContainer.lastChild) {
					prevContainer = prevContainer.lastChild;
				}

				if (isBRNode(prevContainer)) {
					this._addDeleteTrackingToBreak(prevContainer, { range: range, moveLeft: true });
					return true;
				}

				// If the previous container is a text node, look at the parent node instead.
				if (prevContainer.nodeType === ice.dom.TEXT_NODE) {
					prevContainer = prevContainer.parentNode;
				}

				// If the previous container is non-editable, enclose it with a delete ice node and add an empty text node before it to position the caret.
				if (!prevContainer.isContentEditable) {
					var returnValue = this._addDeleteTracking(prevContainer, {range:null, moveLeft:true, merge:true});
					var emptySpaceNode = document.createTextNode('');
					prevContainer.parentNode.insertBefore(emptySpaceNode, prevContainer);
					range.selectNode(emptySpaceNode);
					range.collapse(true);
					return returnValue;
				}

				if (this._handleVoidEl(prevContainer, range)) {
					return true;
				}

				// If the caret was placed directly after a stub element, enclose the element with a delete ice node.
				if (ice.dom.isStubElement(prevContainer) && ice.dom.isChildOf(prevContainer, parentBlock) || !prevContainer.isContentEditable) {
					 this._addDeleteTracking(prevContainer, {range:range, moveLeft:true, merge:true});
					 return true;
				}

				// If the previous container is a stub element between blocks
				// then just delete and leave the range/cursor in place.
				if (ice.dom.isStubElement(prevContainer)) {
					ice.dom.remove(prevContainer);
					range.collapse(true);
					return false;
				}

				if (prevContainer !== parentBlock && !ice.dom.isChildOf(prevContainer, parentBlock)) {

					if (!ice.dom.canContainTextElement(prevContainer)) {
						prevContainer = prevContainer.lastElementChild;
					}
					// Before putting the caret into the last selectable child, lets see if the last element is a stub element. If it is, we need to put the caret there manually.
					if (prevContainer.lastChild && prevContainer.lastChild.nodeType !== ice.dom.TEXT_NODE && ice.dom.isStubElement(prevContainer.lastChild) && prevContainer.lastChild.tagName !== 'BR') {
						range.setStartAfter(prevContainer.lastChild);
						range.collapse(true);
						return true;
					}
					// Find the last selectable part of the prevContainer. If it exists, put the caret there.
					lastSelectable = range.getLastSelectableChild(prevContainer);

					if (lastSelectable && !ice.dom.isOnBlockBoundary(range.startContainer, lastSelectable, this.element)) {
						range.selectNodeContents(lastSelectable);
						range.collapse();
						return true;
					}
				}
			}

			// Firefox: If an image is at the start of the paragraph and the user has just deleted the image using backspace, an empty text node is created in the delete node before
			// the image, but the caret is placed with the image. We move the caret to the empty text node and execute deleteFromLeft again.
			if (initialOffset === 1 && !ice.dom.isBlockElement(commonAncestor) && range.startContainer.childNodes.length > 1 && range.startContainer.childNodes[0].nodeType === ice.dom.TEXT_NODE && range.startContainer.childNodes[0].data.length === 0) {
				range.setStart(range.startContainer, 0);
				return this._deleteLeft(range);
			}

			// Move range to position the cursor on the inside of any adjacent container that it is going
			// to potentially delete into or before a stub element.	E.G.: <em>text</em>| test	->	<em>text|</em> test or
			// text1 <img>| text2 -> text1 |<img> text2
			try {
				range.moveStart(ice.dom.CHARACTER_UNIT, -1);
				range.moveStart(ice.dom.CHARACTER_UNIT, 1);
			}
			catch(ignore){}

			// Handles cases in which the caret is at the start of the block.
			if (ice.dom.isOnBlockBoundary(range.startContainer, range.endContainer, this.element)) {

				// If the previous block is empty, remove the previous block.
				if (prevBlockIsEmpty) {
					ice.dom.remove(prevBlock);
					range.collapse();
					return true;
				}

				// If the previous Block ends with a stub element, set the caret behind it.
				if (prevBlock && prevBlock.lastChild && ice.dom.isStubElement(prevBlock.lastChild)) {
					range.setStartAfter(prevBlock.lastChild);
					range.collapse(true);
					return true;
				}

				// Place the caret at the end of the previous block.
				lastSelectable = range.getLastSelectableChild(prevBlock);
				if (lastSelectable) {
					range.setStart(lastSelectable, lastSelectable.data.length);
					range.collapse(true);
				}
				else if (prevBlock) {
					range.setStart(prevBlock, prevBlock.childNodes.length);
					range.collapse(true);
				}

				return true;
			}

			var entireTextNode = range.startContainer;
			if (entireTextNode && (entireTextNode.nodeType === ice.dom.TEXT_NODE)) {
				var deletedCharacter = splitTextAt(entireTextNode, range.startOffset - 1, 1);
				this._addDeleteTracking(deletedCharacter, {range:range, moveLeft:true, merge:true});
				return true;
			}

			return false;

		},

		_removeNode: function(node) {
			var parent = node && node.parentNode;
			if (parent) {
				parent.removeChild(node);
				if (parent != this.element && ice.dom.hasNoTextOrStubContent(parent)) {
					this._removeNode(parent);
				}
			}
		},

		// Marks text and other nodes for deletion
		// compared OK

		/**
		 * @private
		 * Adds delete tracking to the provided node. The node is checked for containment in various tracking contexts
		 * (e.g. inside an insert block, delete block)
		 */
		_addDeleteTracking: function (contentNode, options) {

			var moveLeft = options && options.moveLeft;
			var contentAddNode = this._getIceNode(contentNode, 'insertType'),
				ctNode;

			if (contentAddNode) {
				return this._addDeletionInInsertNode(contentNode, contentAddNode, options);
			}

			var range = options && options.range;
			if (range && this._getIceNode(contentNode, 'deleteType')) {
				return this._deleteInDeleted(contentNode, options);

			}
			// Webkit likes to insert empty text nodes next to elements. We remove them here.
			if (contentNode.previousSibling && ice.dom.isEmptyTextNode(contentNode.previousSibling)) {
				contentNode.parentNode.removeChild(contentNode.previousSibling);
			}
			if (contentNode.nextSibling && ice.dom.isEmptyTextNode(contentNode.nextSibling)) {
				contentNode.parentNode.removeChild(contentNode.nextSibling);
			}
			var prevDelNode = this._getIceNode(contentNode.previousSibling, 'deleteType'),
				nextDelNode = this._getIceNode(contentNode.nextSibling, 'deleteType');

			if (prevDelNode && this._isCurrentUserIceNode(prevDelNode)) {
				ctNode = prevDelNode;
				ctNode.appendChild(contentNode);
				if (nextDelNode && this._isCurrentUserIceNode(nextDelNode)) {
					var nextDelContents = ice.dom.extractContent(nextDelNode);
					ice.dom.append(ctNode, nextDelContents);
					nextDelNode.parentNode.removeChild(nextDelNode);
				}
			}
			else if (nextDelNode && this._isCurrentUserIceNode(nextDelNode)) {
				ctNode = nextDelNode;
				ctNode.insertBefore(contentNode, ctNode.firstChild);
			}
			else { // not in the neighborhood of a delete node
				var changeId = this.getAdjacentChangeId(contentNode, moveLeft);
				ctNode = this._createIceNode('deleteType', null, changeId);
				contentNode.parentNode.insertBefore(ctNode, contentNode);
				ctNode.appendChild(contentNode);
			}
			if (range) {
				if (ice.dom.isStubElement(contentNode)) {
					range.selectNode(contentNode);
				}
				else {
					range.selectNodeContents(contentNode);
				}
				if (moveLeft) {
					range.collapse(true);
				}
				else {
					range.collapse();
				}
			}
			if (ctNode) {
				this._normalizeNode(ctNode);
				range && range.refresh();
			}

			return true;

		},

		/**
		 * @private
		 * Adds delete tracking to a BR node
		 */
		_addDeleteTrackingToBreak: function (brNode, options) {
			var moveLeft = Boolean(options && options.moveLeft);
			function move() {
				var range = options && options.range;
				if (range) {
					if (isBRNode(brNode) || ice.dom.hasNoTextOrStubContent(brNode) || moveLeft) {
						if (moveLeft) {
							range.setStartBefore(brNode);
							range.setEndBefore(brNode);
						}
						else {
							range.setStartAfter(brNode);
							range.setEndAfter(brNode);
						}
					}
					else if (brNode.firstChild) {
						range.setStartBefore(brNode.firstChild);
						range.setEndBefore(brNode.firstChild);
					}
					range.collapse();
				}
			}

			if (! isBRNode(brNode)) {
				logError("addDeleteTracking to BR: not a break element");
				return;
			}


			// if this is a delete node, just move the caret
			if (this._isDeleteNode(brNode)) {
				return move();
			}
			// remove all attrs and classes from the node'
			stripNode(brNode);
			var type = "deleteType";

			ice.dom.addClass(brNode, this._getIceNodeClass(type));
			var changeId = this.getAdjacentChangeId(brNode, moveLeft);

			this._addChange(type, [brNode], changeId);

			move();
		},

		/**
		 * Handle the case of deletion inside a delete element
		 */
		_deleteInDeleted: function(contentNode, options) {
			var range = options.range,
				moveLeft = options.moveLeft,
				ctNode;

			// It if the contentNode a text node, merge it with text nodes before and after it.
			this._normalizeNode(contentNode);// dfl - support ie8

			var found = false;
			if (moveLeft) {
				// Move to the left until there is valid sibling.
				var previousSibling = ice.dom.getPrevContentNode(contentNode, this.element);
				while (!found) {
					ctNode = this._getIceNode(previousSibling, 'deleteType');
					if (!ctNode) {
						found = true;
					}
					else {
						previousSibling = ice.dom.getPrevContentNode(previousSibling, this.element);
					}
				}
				if (previousSibling) {
					var lastSelectable = range.getLastSelectableChild(previousSibling);
					if (lastSelectable) {
						previousSibling = lastSelectable;
					}
					range.setStart(previousSibling, ice.dom.getNodeCharacterLength(previousSibling));
					range.collapse(true);
				}
			}
			else {
				// Move the range to the right until there is valid sibling.

				var nextSibling = ice.dom.getNextContentNode(contentNode, this.element);
				while (!found) {
					ctNode = this._getIceNode(nextSibling, 'deleteType');
					if (!ctNode) {
						found = true;
					}
					else {
						nextSibling = ice.dom.getNextContentNode(nextSibling, this.element);
					}
				}

				if (nextSibling) {
					range.selectNodeContents(nextSibling);
					range.collapse(true);
				}
			}
			return true;
		},


/**
 * @private
 * Adds delete tracking markup around a content node
 * @param contentNode the content to be marked as deleted
 * @param contentAddNode the insert node surrounding the content
 * @param options may contain range, moveLeft, merge
 */
		_addDeletionInInsertNode: function(contentNode, contentAddNode, options) {
			var range = options && options.range,
				moveLeft = options && options.moveLeft;
			if (this._isCurrentUserIceNode(contentAddNode)) {
				if (range) {
					if (moveLeft) {
						range.setStartBefore(contentNode);
					}
					else {
						range.setStartAfter(contentNode);
					}
					range.collapse(moveLeft);
				}
				contentNode.parentNode.removeChild(contentNode);
				if (! this._browser.msie) {
					this._normalizeNode(contentAddNode);
				}
				var bmCount = ice.dom.find(contentAddNode, ".iceBookmark").length,
					cleanNode;
				if (bmCount > 0) {
					cleanNode = ice.dom.cloneNode(contentAddNode);
					ice.dom.remove(ice.dom.find(cleanNode, '.iceBookmark'));
					cleanNode = cleanNode[0];
				}
				else {
					cleanNode = contentAddNode;
				}

				// Remove a potential empty tracking container
				if (ice.dom.hasNoTextOrStubContent(cleanNode)) {
					if (range) {
						range.setStartBefore(contentAddNode);
						range.collapse(true);
					}
					ice.dom.replaceWith(contentAddNode, ice.dom.contents(contentAddNode));
				}
			}
			else { // other user insert
				var cInd = rangy.dom.getNodeIndex(contentNode),
					parent = contentNode.parentNode,
					nChildren = parent.childNodes.length,
					ctNode;
				parent.removeChild(contentNode);
				ctNode = this._createIceNode('deleteType');
				ctNode.appendChild(contentNode);
				if (cInd > 0 && cInd >= (nChildren - 1)) {
					ice.dom.insertAfter(contentAddNode, ctNode);
				}
				else {
					if (cInd > 0) {
						this._splitNode(contentAddNode, parent, cInd);
					}
					contentAddNode.parentNode.insertBefore(ctNode, contentAddNode);
				}
				this._deleteEmptyNode(contentAddNode);


				if (range && moveLeft) {
					range.setStartBefore(ctNode);
					range.collapse(true);
					this.selection.addRange(range);
				}
				if (options && options.merge) {
					this._mergeDeleteNode(ctNode);
				}
				if (range) {
					range.refresh();
				}

			}
			return true;
		},


		/**
		 * @private
		 * Deletes a node if it does not contain anything
		 */
		_deleteEmptyNode: function(node) {
			var parent = node && node.parentNode;
			if (parent && ice.dom.hasNoTextOrStubContent(node)) {
				parent.removeChild(node);
			}
		},

		/**
		 * Merges a delete node with its siblings if they belong to the same user
		 */
		_mergeDeleteNode: function(delNode) {
			var siblingDel,
				content;

			if (this._isCurrentUserIceNode(siblingDel = this._getIceNode(delNode.previousSibling, 'deleteType'))) {
				content = ice.dom.extractContent(delNode);
				delNode.parentNode.removeChild(delNode);
				ice.dom.append(siblingDel, content);
				this._mergeDeleteNode(siblingDel);
			}
			else if (this._isCurrentUserIceNode(siblingDel = this._getIceNode(delNode.nextSibling, 'deleteType'))) {
					content = ice.dom.extractContent(siblingDel);
					delNode.parentNode.removeChild(siblingDel);
					ice.dom.append(delNode, content);
					this._mergeDeleteNode(delNode);
			}
		},


		/**
		 * If tracking is on, handles event e when it is one of the following types:
		 * keypress, keydown. Prevents default handling if the event
		 * was fully handled.
		 */
		handleEvent: function (e) {
			if (!this._isTracking) {
				return true;
			}
			var preventEvent = false;
			if ('keypress' == e.type) {
				preventEvent = this.keyPress(e);
			}
			else if ('keydown' == e.type) {
				preventEvent = ! this.handleKeyDown(e);
			}
			if (preventEvent) {
				e.stopImmediatePropagation();
				e.preventDefault();
				this.hostMethods.notifyChange();
			}
			return ! preventEvent;
		},

		/**
		 * @private
		 * Handles arrow, delete key events, and others.
		 * @param {Event} e Event object.
		 * @return {void|boolean} Returns true if default event needs to be blocked.
		 */
		_handleAncillaryKey: function (key) {
			var browser = this._browser,
				preventDefault = false,
				self = this,
				range = self.getCurrentRange();
			switch (key) {
				case ice.dom.DOM_VK_DELETE:
					preventDefault = this._deleteContents();
					break;

				case 46:
					// Key 46 is the DELETE key.
					preventDefault = this._deleteContents(true);
					break;

		/* ***********************************************************************************/
		/* BEGIN: Handling of caret movements inside hidden .ins/.del elements on Firefox **/
		/*  *Fix for carets getting stuck in .del elements when track changes are hidden  **/
				case ice.dom.DOM_VK_DOWN:
				case ice.dom.DOM_VK_UP:
				case ice.dom.DOM_VK_LEFT:
					if(browser["type"] === "mozilla"){
						if(!this.visible(range.startContainer)){
							// if Previous sibling exists in the paragraph, jump to the previous sibling
							if(range.startContainer.parentNode.previousSibling){
								// When moving left and moving into a hidden element, skip it and go to the previousSibling
								range.setEnd(range.startContainer.parentNode.previousSibling, 0);
								range.moveEnd(ice.dom.CHARACTER_UNIT, ice.dom.getNodeCharacterLength(range.endContainer));
								range.collapse(false);
							}
							// if Previous sibling doesn't exist, get out of the hidden zone by moving to the right
							else {
								range.setEnd(range.startContainer.parentNode.nextSibling, 0);
								range.collapse(false);
							}
						}
					  }
			          preventDefault = false;
			          break;
				case ice.dom.DOM_VK_RIGHT:
					if(browser["type"] === "mozilla"){
						if(!this.visible(range.startContainer)){
							if(range.startContainer.parentNode.nextSibling){
								// When moving right and moving into a hidden element, skip it and go to the nextSibling
								range.setStart(range.startContainer.parentNode.nextSibling,0);
								range.collapse(true);
							}
						}
					}
					break;
		/* END: Handling of caret movements inside hidden .ins/.del elements ***************/

				default:
					// Ignore key.
					break;
			} //end switch

			return preventDefault;

		},

		/**
		 * Returns false if the event should be cancelled
		 */
		handleKeyDown: function (e) {
			if (this._handleSpecialKey(e)) {
				return true;
			}

			return ! this.keyPress(e);
		},



		/**
		 * @private
		 * @param e event
		 * returns true if the event needs to be prevented
		 */
		onKeyDown: function (e) {
			if (this._handleSpecialKey(e)) {
				return false;
			}

			return this._handleAncillaryKey(e);
		},

		/**
		 * Returns true if the event should be cancelled
		 */
		keyPress: function (e) {
			var c = null;
			if (e.ctrlKey || e.metaKey) {
				return false;
			}

			// Inside a br - most likely in a placeholder of a new block - delete before handling.
			var range = this.getCurrentRange(), text,
				br = range && ice.dom.parents(range.startContainer, 'br')[0] || null;
			if (br) {
				range.moveToNextEl(br);
			}

//			if (c !== null) {
				var key = e.keyCode ? e.keyCode : e.which;
    		    switch (key) {
    		    	case 32: //ckeditor does funny stuff with spaces, so insert it ourselves
    		    		return this.insert({ text: ' ' });
					case ice.dom.DOM_VK_DELETE:
					case 46:
					case ice.dom.DOM_VK_DOWN:
					case ice.dom.DOM_VK_UP:
					case ice.dom.DOM_VK_LEFT:
					case ice.dom.DOM_VK_RIGHT:
						return this._handleAncillaryKey(key);
					case ice.dom.DOM_VK_ENTER:
						this._handleEnter();
						return false;
					default:
						c = String.fromCharCode(key);
						if (c !== null) {
							text = this._browser.msie ? {text: c} : null;
							return this.insert(text);
						}
						return false;
				}
	//		}

//			return false; //this._handleAncillaryKey(e);
		},


		_handleEnter: function () {
			var range = this.getCurrentRange();
			if (range && !range.collapsed) {
				this._deleteContents();
			}
		},

		/**
		 * @private
		 * returns true if the keytcombination was handled. This does not mean that the event should
		 * be preventDefault()ed, just that we don't need further processing
		 */
		_handleSpecialKey: function (e) {
			var keyCode = e.which;
			if (keyCode === null) {
			// IE.
				keyCode = e.keyCode;
			}

			switch (keyCode) {
				case 120:
				case 88:
					if (true === e.ctrlKey || true === e.metaKey) {
						this.prepareToCut();
						return true;
					}
					break;
				case 67:
				case 99:
					if (true === e.ctrlKey || true === e.metaKey) {
						this.prepareToCopy();
						return true;
					}
					break;
				default:
					// Not a special key.
					break;
			} //end switch
			return false;
		},

		/**
		 * Returns the first ice node in the hierarchy of the given node, or the current collapsed range.
		 * @param node if null, check the current selection
		 * @param onlyNode if true, check only the node, not its parents
		 * @param cleanup if false, don't clean up empty nodes around selection
		 * null if not in a track changes hierarchy
		 */
		currentChangeNode: function (node, onlyNode, cleanup) {
			var selector = '.' + this._getIceNodeClass('insertType') + ', .' + this._getIceNodeClass('deleteType'),
				range = null;
			if (!node) {
				range = this.getCurrentRange();
				if (! range) {
					return false;
				}
				if (cleanup !== false && range.collapsed) {
					this._cleanupSelection(range, false, false);
					node = range.startContainer;
				}
				else {
					node = range.commonAncestorContainer;
				}
			}

			var ret = onlyNode ? ice.dom.is(node, selector) && node : ice.dom.getNode(node, selector);
			if ((! ret) && range && range.collapsed) {
				var end = range.endContainer,
					endOffset = range.endOffset,
					nextNode = null;
				if (end.nodeType === ice.dom.TEXT_NODE) {
					if (endOffset === end.length) {
						nextNode = ice.dom.getNextNode(end);
					}
					else if (endOffset === 0) {
						nextNode = ice.dom.getPrevNode(end, this.element);
					}
				}
				else if (end.nodeType === ice.dom.ELEMENT_NODE) {
					if (endOffset === 0) {
						nextNode = ice.dom.getPrevNode(end, this.element);
					}
					else if (end.childNodes.length > endOffset) {
						end = end.childNodes[endOffset - 1];
						if (ice.dom.is(end, selector)) {
							return end;
						}
						nextNode = ice.dom.getNextNode(end);
					}
				}
				if (nextNode) {
					ret = ice.dom.is(nextNode, selector);
				}
			}
			return ret;
		},

		setShowChanges: function(bShow) {
			bShow = !! bShow;
			this._isVisible = bShow;
			var $body = $(this.element);
			$body.toggleClass("ICE-Tracking", bShow);
			this._showTitles(bShow);
			this._updateTooltipsState();
		},

		reload: function() {
			this._loadFromDom();
		},

		hasChanges: function() {
			for (var key in this._changes) {
				var change = this._changes[key];
				if (change && change.type) {
					return true;
				}
			}
			return false;
		},

		countChanges: function(options) {
			var changes = this._filterChanges(options);
			return changes.count;
		},

		setChangeData: function(data) {
			if (null == data || (typeof data == "undefined")) {
				data = "";
			}
			this._changeData = String(data);
		},

		getDeleteClass: function() {
			return this._getIceNodeClass('deleteType');
		},

		/**
		 * called before a copy operation.
		 * This function processes the current selection to remove the tracking style.
		 * The tracking is restored immediately after the copy operation
		 */
		prepareToCopy: function() {
			var range = this.getCurrentRange();
			if (range && ! range.collapsed) {
				this._removeTrackingInRange(range);
			}
		},

		/**
		 * Preprocesses the document selection so that a deleted span is left after the browser cut
		 * @return true if there's a selection
		 */
		prepareToCut: function() {
			var range = this.getCurrentRange(),
				hostRange = this.hostMethods.getHostRange();

			if (range && hostRange && range.collapsed && ! hostRange.collapsed) {
				// special case of IE showing collapsed selection when ckeditor thinks otherwise
				try {
					var data = this.hostMethods.getHostRangeData(hostRange);
					range.setStart(data.startContainer, data.startOffset);
					range.setEnd(data.endContainer, data.endOffset);
				}
				catch (e) {
					return;
				}
			}
			if (! range || range.collapsed) {
				return false;
			}
			fixSelection(range, this.element);
			var frag = range.cloneContents(),
				origRange = range.cloneRange(),
				head = frag.firstChild,tail = frag.lastChild;
//			printRange(range, "before cut");
			this.hostMethods.beforeEdit();

			range.collapse(false);
			range.insertNode(frag);
			range.setStartBefore(head);
//			printRange(range, "after set start before the head");
			range.setEndAfter(tail);
//			printRange(range, "after set end after the tail");
			var cid = this._startBatchChange();
			try {
				this._deleteSelection(range);
			}
			catch (e) {
				logError(e, "While trying to delete selection");
			}
			finally {
				this._endBatchChange(cid);
				this.selection.addRange(origRange);
				this._removeTrackingInRange(origRange, false);
//				printRange(this.selection.getRangeAt(0), "range after deletion");
			}
			return true;
		},

		toString: function() {
			return "ICE " + ((this.element && this.element.id) || "(no element id)");
		},

		_splitNode: function(node, atNode, atOffset) {
			var parent = node.parentNode,
			  	parentOffset = rangy.dom.getNodeIndex(node),
			  	doc = atNode.ownerDocument,
			  	leftRange = doc.createRange(),
			  	left;
			  leftRange.setStart(parent, parentOffset);
			  leftRange.setEnd(atNode, atOffset);
			  left = leftRange.extractContents();
			  parent.insertBefore(left, node);
			  if (this.isInsideChange(node, true)) {
				  this._updateNodeTooltip(node.previousSibling);
			  }
			  return node.previousSibling;
		},

		_triggerChange: function() {
			if (this._isTracking) {
				this.$this.trigger("change");
			}
		},

		_triggerChangeText: function() {
			this.$this.trigger("textChange");
		},

		_updateNodeTooltip: function(node) {
			if (this.tooltips && this._isVisible) {
				this._addTooltip(node);
			}
		},

		_acceptRejectSome: function(options, isAccept) {
			var f = (function(index, node) {
				this.acceptRejectChange(node, isAccept);
			}).bind(this);
			var changes = this._filterChanges(options);
			for (var id in changes.changes) {
				var nodes = ice.dom.find(this.element, '[' + this.attributes.changeId + '=' + id + ']');
				nodes.each(f);
			}
			if (changes.count) {
				this._triggerChange();
			}
		},

		/**
		 * Filters the current change set based on options
		 * @param _options may contain one of:<ul>
		 * <li>exclude: an array of user ids to exclude<li>include: an array of user ids to include
		 * <li>filter: a filter function of the form function({userid, time, data}):boolean
		 * <li>verify: a boolean indicating whether or not to verify that there are matching dom nodes for each matching change
		 * </ul>
		 *	@return {Object} an object with two members: count, changes (map of id:changeObject)
		 * @private
		 */
		_filterChanges: function(_options) {
			var count = 0, changes = {},
				change,
				options = _options || {},
				filter = options.filter,
				exclude = options.exclude ? $.map(options.exclude, function(e) { return String(e); }) : null,
				include = options.include ? $.map(options.include, function(e) { return String(e); }) : null,
				verify = options.verify,
				elements = null;
			for (var key in this._changes) {
				change = this._changes[key];
				if (change && change.type) {
					var skip = (filter && ! filter({userid: change.userid, time: change.time, data:change.data})) ||
						(exclude && exclude.indexOf(change.userid) >= 0) ||
						(include && include.indexOf(change.userid) < 0);
					if (! skip) {
						if (verify) {
							elements = ice.dom.find(this.element, "[" + this.attributes.changeId + "]");
							skip = ! elements.length;
						}
						if (! skip) {
							++count;
							changes[key] = change;
						}
					}
				}
			}

			return { count : count, changes : changes };
		},

		_loadFromDom : function() {
			this._changes = {};
			this._uniqueStyleIndex = 0;
			var myUserId = this.currentUser && this.currentUser.id,
				myUserName = (this.currentUser && this.currentUser.name) || "",
				now = (new Date()).getTime(),
				styleMatch,
				styleRegex = new RegExp(this.stylePrefix + '-(\\d+)'),
			// Grab class for each changeType
				changeTypeClasses = [];
			for (var changeType in this.changeTypes) {
				changeTypeClasses.push(this._getIceNodeClass(changeType));
			}

			var nodes = this.getIceNodes();
			var f = function(i, el) {
				var styleIndex = 0,
					styleName,
					ctnType = '', i,
					classList = el.className.split(' ');
				//TODO optimize this - create a map of regexp
				for (i = 0; i < classList.length; i++) {
					styleMatch = styleRegex.exec(classList[i]);
					if (styleMatch) {
						styleName = styleMatch[0];
						styleIndex = styleMatch[1];
					}
					var ctnReg = new RegExp('(' + changeTypeClasses.join('|') + ')').exec(classList[i]);
					if (ctnReg) {
						ctnType = this._getChangeTypeFromAlias(ctnReg[1]);
					}
				}
				var userid = ice.dom.attr(el, this.attributes.userId);
				var userName;
				if (myUserId && (userid == myUserId)) {
					userName = myUserName;
					el.setAttribute(this.attributes.userName, myUserName);
				}
				else {
					userName = el.getAttribute(this.attributes.userName);
				}
				this._setUserStyle(userid, Number(styleIndex));
				var changeid = parseInt(ice.dom.attr(el, this.attributes.changeId) || "");
				if (isNaN(changeid)) {
					changeid = this.getNewChangeId();
					el.setAttribute(this.attributes.changeId, changeid);
				}
				var timeStamp = parseInt(el.getAttribute(this.attributes.time) || "");
				if (isNaN(timeStamp)) {
					timeStamp = now;
				}
				var lastTimeStamp = parseInt(el.getAttribute(this.attributes.lastTime) || "");
				if (isNaN(lastTimeStamp)) {
					lastTimeStamp = timeStamp;
				}
				var sessionId = el.getAttribute(this.attributes.sessionId);

				var changeData = ice.dom.attr(el, this.attributes.changeData) || "";
				this._changes[changeid] = {
					type: ctnType,
					style: styleName,
					userid: String(userid),// dfl: must stringify for consistency - when we read the props from dom attrs they are strings
					username: userName,
					time: timeStamp,
					lastTime: lastTimeStamp,
					sessionId: sessionId,
					data : changeData
				};
				this._updateNodeTooltip(el);
			}.bind(this);
			nodes.each(f);
			this._triggerChange();
		},

		_updateUserData : function(user) {
			if (user) {
				for (var key in this._changes) {
					var change = this._changes[key];
					if (change.userid == user.id) {
						change.username = user.name;
					}
				}
			}
			var nodes = this.getIceNodes();
			nodes.each((function(i,node) {
				var match = (! user) || (user.id == node.getAttribute(this.attributes.userId));
				if (user && match) {
					node.setAttribute(this.attributes.userName, user.name);
				}
			}).bind(this));
		},

		_showTitles : function(bShow) {
			var nodes = this.getIceNodes();
			if (bShow) {
				$(nodes).each((function(i, node) {
					this._updateNodeTooltip(node);
				}).bind(this));
			}
			else {
				$(nodes).removeAttr("title");
			}
		},

		_updateTooltipsState: function() {
			var $nodes,
				self = this;
			// show tooltips if they are enabled and change tracking is on
			if (this.tooltips && this._isVisible) {
				if (! this._showingTips) {
					this._showingTips = true;
					$nodes = this.getIceNodes();
					$nodes.each(function(i, node) {
						self._addTooltip(node);
					});
				}
			}
			else if (this._showingTips) {
				this._showingTips = false;
				$nodes = this.getIceNodes();
				$nodes.each(function(i, node) {
					$(node).unbind("mouseover").unbind("mouseout");
				});
			}
		},

		_addTooltip: function(node) {
			$(node).unbind("mouseover").unbind("mouseout").mouseover(this._tooltipMouseOver).mouseout(this._tooltipMouseOut);
		},

		_tooltipMouseOver: function(event) {
			var node = event.currentTarget,
				$node = $(node), to,
				self = this;
			if (event.buttons || $node.data("_tooltip_t")) {
				return;
			}
			to = setTimeout(function() {
				var iceNode = self.currentChangeNode(node),
					cid = iceNode && iceNode.getAttribute(self.attributes.changeId),
					change = cid && self.getChange(cid);
				if (change) {
					var type = ice.dom.hasClass(iceNode, self._getIceNodeClass("insertType")) ? "insert" : "delete";
					$node.removeData("_tooltip_t");
					self.hostMethods.showTooltip(node, {
						userName: change.username,
						changeId: cid,
						userId: change.userid,
						time: change.time,
						lastTime: change.lastTime,
						type: type
					});
				}
			}, this.tooltipsDelay);
			$node.data("_tooltip_t", to);
		},

		_tooltipMouseOut: function(event) {
			var node = event.currentTarget,
				$node = $(node),
				to = $node.data("_tooltip_t");
			$node.removeData("_tooltip_t");
			if (to) {
				clearTimeout(to);
			}
			else {
				this.hostMethods.hideTooltip(node);
			}
		},

		/**
		 * Finds all the tracking nodes involved in the range and removes their tracking classes.
		 * A timeout is set to restore the tracking classes immediately.
		 * This allows the editor to copy tracked text without its style
		 * @private
		 */
		_removeTrackingInRangeOld: function (range) {
			var insClass = this._getIceNodeClass('insertType'),
				delClass = this._getIceNodeClass('deleteType'),
				clsSelector = '.' + insClass+",."+delClass,
				clsAttr = "data-ice-class",
				filter = function(node) {
					var iceNode,
						$iceNode = null;
					if (node.nodeType == ice.dom.TEXT_NODE) {
						$iceNode = $(node).parents(clsSelector);
					}
					else {
						var $node = $(node);
						if ($node.is(clsSelector)) {
							$iceNode = $node;
						}
						else {
							$iceNode = $node.parents(clsSelector);
						}
					}
					iceNode = ($iceNode && $iceNode[0]);
					if (iceNode) {
						var cls = iceNode.className;
						iceNode.setAttribute(clsAttr, cls);
						iceNode.setAttribute("class", "ice-no-decoration");
						return true;
					}
					return false;
				};
			range.getNodes(null, filter);
			var el = this.element;
			setTimeout(function() {
				var nodes = $(el).find('['+ clsAttr + ']');
				nodes.each(function(i, node) {
					var cls = node.getAttribute(clsAttr);
					if (cls) {
						node.setAttribute("class", cls);
						node.removeAttribute(clsAttr);
					}
				});

			}, 10);
		},
		/**
		 * Finds all the tracking nodes involved in the range and removes their tracking classes.
		 * A timeout is set to restore the tracking classes immediately.
		 * This allows the editor to copy tracked text without its style
		 * @private
		 */
		_removeTrackingInRange: function (range) {
			var insClass = this._getIceNodeClass('insertType'),
				delClass = this._getIceNodeClass('deleteType'),
				clsSelector = '.' + insClass+",."+delClass,
				saveMap = this._savedNodesMap,
				clsAttr = "data-ice-class",
				base = Date.now() % 1000000,
				filter = function(node) {
					var $node,iceNode,
						$iceNode = null;
					if (node.nodeType == ice.dom.TEXT_NODE) {
						$iceNode = $(node).parents(clsSelector);
					}
					else {
						$node = $(node);
						if ($node.is(clsSelector)) {
							$iceNode = $node;
						}
						else {
							$iceNode = $node.parents(clsSelector);
						}
					}
					if (iceNode = ($iceNode && $iceNode[0])) {
						var attrs = getNodeAttributes(iceNode),
							cls = iceNode.className,
							dataId = String(base++);

						saveMap[dataId] = {
							attributes: attrs,
							className: cls
						};
						removeAllAttributes(iceNode);
						iceNode.setAttribute(clsAttr, dataId);
						iceNode.setAttribute("class", "ice-no-decoration");
						return true;
					}
					return false;
				};
			range.getNodes(null, filter);
			var el = this.element;
			setTimeout(function() {
				var nodes = $(el).find('['+ clsAttr + ']');
				nodes.each(function(i, node) {
					var dataId = node.getAttribute(clsAttr),
						nodeData = saveMap[dataId];
					if (dataId) {
						delete saveMap[dataId];
						Object.keys(nodeData.attributes).forEach(function(key) {
							node.setAttribute(key, nodeData.attributes[key]);
						});
						node.setAttribute("class", nodeData.className);
						node.removeAttribute(clsAttr);
					}
					else {
						logError("missing save data for node");
					}
				});

			}, 10);
		},

		getAdjacentChangeId: function(node, left) {
			var next = left ? ice.dom.getNextNode(node) : ice.dom.getPrevNode(node),
				nextChange,
				changeId = null;

			nextChange = this._getIceNode(next, "insertType") || this._getIceNode(next, "deleteType");
			if (! nextChange) {
				if (this._isInsertNode(next) || this._isDeleteNode(next)) {
					nextChange = next;
				}
			}
			if (nextChange && this._isCurrentUserIceNode(nextChange)) {
				changeId = ice.dom.attr(nextChange, this.attributes.changeId);
			}
			return changeId;
		}


	};

	var console = (window && window.console) || {
		log: function(){},
		error: function(){},
		info: function(){},
		assert:function(){},
		count: function(){}
	} ;

	/** Utility functions **/

	function getNodeAttributes(node) {
		var attrs = node.attributes,
			attr,
			len = attrs && attrs.length,
			ret = {};
		for (var i = 0; i < len; ++i) {
			attr = attrs[i];
			ret[attr.name] = attr.value;
		}
		return ret;
	}

	function removeAllAttributes(node) {
		var last = null,
			next;
		try {
			while (node.attributes.length > 0) {
				next = node.attributes[0];
				if (next === last) {
					return;
				}
				last = next;
				node.removeAttribute(next.name);
			}
		}
		catch(ignore){}
	}

	function nativeElement(e) {
		return e;
	}

	/**
	 * Strip all attributes and classes from a node
	 * @param node
	 * @returns
	 */
	function stripNode(node) {
		// remove all attrs and classes from the node
		var	attributes = $.map(node.attributes, function(attr) {
			return attr.name;
		});
		$(node).removeClass(); // remove all classes
		$.each(attributes, function(i, item) {
			node.removeAttribute(item);
		});
	}

	function isBRNode(node) {
		return BREAK_ELEMENT == ice.dom.getTagName(node);
	}

	function isNewlineNode(node) {
		var tag = ice.dom.getTagName(node);
		return BREAK_ELEMENT === tag || PARAGRAPH_ELEMENT === tag;
	}

	function isOnRightEdge(el, offset) {
		if (! el) {
			return false;
		}
		var type = el.nodeType;
		if (ice.dom.TEXT_NODE == type) {
			return offset && el.nodeValue && (offset >= el.nodeValue.length - 1);
		}
		if (ice.dom.ELEMENT_NODE == type) {
			return el.childNodes && el.childNodes.length && (offset >= el.childNodes.length);
		}
		return false;
	}

	var logError = null;

	function fixSelection(range, top) {
		if (! range || ! top || range.collapsed) {
			return range;
		}
		var current;
		// fix end
		try {
			while ((current = range.endContainer) && (current != top) && (range.endOffset == 0) && ! range.collapsed) {
				if (current.previousSibling) {
					range.setEndBefore(current);
				}
				else if (current.parentNode && current.parentNode != top) {
					range.setEndBefore(current.parentNode);
				}
				if (range.endContainer == current) {
					break;
				}
			}
		}
		catch (e) {
			logError(e, "fixSelection, while trying to set end");
		}


		try {
			while ((current = range.startContainer) && (current != top) && ! range.collapsed) {
				current = range.startContainer;

				if (current.nodeType == ice.dom.TEXT_NODE) {
					if (range.startOffset >= current.nodeValue.length) {
						range.setStartAfter(current);
					}
				}
				else { // element
					if (range.startOffset >= current.childNodes.length) {
						range.setStartAfter(current);
					}
				}
				if (range.startContainer == current) {
					break;
				}
			}
		}
		catch (e) {
			logError(e, "fixSelection, while trying to set start");
		}
	}

	function splitTextAt(textNode, at, count) {
		var textLength = textNode.length,
			splitText;
		if (at < 0 || at >= textLength) {
			return textNode;
		}
		if (at + count >= textLength) {
			count = textLength - at;
		}
		if (count === textLength) {
			return textNode;
		}
		splitText = at > 0 ? textNode.splitText(at) : textNode;
		if (splitText.length > count) {
			splitText.splitText(count);
		}
		return splitText;
	}

	function prepareSelectionForInsert(node, range, doc, insertStub) {
		if (insertStub) {
			if (range.collapsed && range.startContainer && range.startContainer.nodeType === ice.dom.TEXT_NODE && range.startContainer.length) {
				return;
			}
		// create empty node and select it, to be replaced with the typed char
			var tn = doc.createTextNode('\uFEFF');
			if (node) {
				node.appendChild(tn);
			}
			else {
				range.insertNode(tn);
			}
			range.selectNode(tn);
		}
		else if (node) {
			range.selectNodeContents(node);
		}
	}

	function printRange(range, message) {
		if (! range || ! range.startContainer || ! range.endContainer) {
			return;
		}
		var parts = [];
		function printText(txt) {
			if (! txt) {
				return "";
			}
			txt = txt.replace('/\n/g', "\\n").replace('/\r/g', "").replace('\u200B', "{filler}").replace('\uFEFF', "{filler}");
			if (txt.length <= 15) {
				return txt;
			}
			return txt.substring(0, 5)+ "..." + txt.substring(txt.length - 5);
		}
		function addNode(node) {
			var str;
			if (node.nodeType === 3) {
				str = "Text:" + printText(node.nodeValue);
			}
			else {
				var txt = node.innerText;
				str = node.nodeName + (txt ? "(" + printText(txt) + ")" :'');
			}
			parts.push("<" + str + " />");
		}
		function printNode(node, offset1, offset2) {
			if ("number" != typeof offset2) {
				offset2 = -1;
			}
			if (3 == node.nodeType) { // text
				var txt = node.nodeValue;
				parts.push(printText(txt.substring(0, offset1)));
				parts.push("|");
				if (offset2 > offset1) {
					parts.push(printText(txt.substring(offset1, offset2)));
					parts.push("|");
					parts.push(printText(txt.substring(offset2)));
				}
				else {
					parts.push(printText(txt.substring(offset1)));
				}
			}
			else if (1 == node.nodeType) {
				var i = 0,
					children = node.childNodes,
					start = 0;
				addNode(node);
				for (i = start; i < offset1; ++i) {
					addNode(children[i]);
				}
				parts.push("|");
				if (offset2 > offset1) {
					for (i = offset1; i < offset2; ++i) {
						addNode(children[i]);
					}
					parts.push('|');
				}
				if (offset2 > 0 && offset2 < children.length){
					var child = children[offset2];
					while (child) {
						addNode(child);
						child = child.nextSibling;
					}
				}

			}
		}
		if (range.startContainer === range.endContainer) {
			printNode(range.startContainer, range.startOffset, range.endOffset);
		}
		else {
			printNode(range.startContainer, range.startOffset);
			printNode(range.endContainer, range.endOffset);
		}
		var ret = parts.join(' ');
		if (message) {
			console.log(message + ":" + ret);
		}
		return ret;
	}


	exports.ice = this.ice || {};
	this.ice.printRange = printRange;
	exports.ice.InlineChangeEditor = InlineChangeEditor;

}).call(this, window.jQuery);
