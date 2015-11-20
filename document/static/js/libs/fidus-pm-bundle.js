(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

window.pm = {
  ProseMirror: require("../src/edit/main").ProseMirror,
  Pos: require("../src/model").Pos,
  Node: require("../src/model").Node,
  fromDOM: require("../src/parse/dom").fromDOM,
  schema: require("../src/model").defaultSchema,
  MenuBar: require("../src/menu/menubar").MenuBar
};

},{"../src/edit/main":14,"../src/menu/menubar":20,"../src/model":24,"../src/parse/dom":30}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.elt = elt;
exports.requestAnimationFrame = requestAnimationFrame;
exports.rmClass = rmClass;
exports.addClass = addClass;
exports.contains = contains;
exports.insertCSS = insertCSS;

function elt(tag, attrs) {
  var result = document.createElement(tag);
  if (attrs) for (var _name in attrs) {
    if (_name == "style") result.style.cssText = attrs[_name];else if (attrs[_name] != null) result.setAttribute(_name, attrs[_name]);
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

var browser = {
  mac: /Mac/.test(navigator.platform),
  ie_upto10: ie_upto10,
  ie_11up: ie_11up,
  ie: ie_upto10 || ie_11up,
  gecko: /gecko\/\d/i.test(navigator.userAgent)
};

exports.browser = browser;
function classTest(cls) {
  return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*");
}

function rmClass(node, cls) {
  var current = node.className;
  var match = classTest(cls).exec(current);
  if (match) {
    var after = current.slice(match.index + match[0].length);
    node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
  }
}

function addClass(node, cls) {
  var current = node.className;
  if (!classTest(cls).test(current)) node.className += (current ? " " : "") + cls;
}

function contains(parent, child) {
  // Android browser and IE will return false if child is a text node.
  if (child.nodeType != 1) child = child.parentNode;
  return child && parent.contains(child);
}

function insertCSS(css) {
  var style = document.createElement("style");
  style.textContent = css;
  document.head.insertBefore(style, document.head.firstChild);
}

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _selection = require("./selection");

var _dom = require("../dom");

var _keys = require("./keys");

function nothing() {}

function ensureSelection(pm) {
  if (pm.selection.node) {
    var found = (0, _selection.findSelectionNear)(pm.doc, pm.selection.from, 1, true);
    if (found) (0, _selection.setDOMSelectionToPos)(pm, found.head);
  }
  return false;
}

// A backdrop keymap used to make sure we always suppress keys that
// have a dangerous default effect, even if the commands they are
// bound to return false, and to make sure that cursor-motion keys
// find a cursor (as opposed to a node selection) when pressed.

var keys = {
  "Enter": nothing,
  "Mod-Enter": nothing,
  "Shift-Enter": nothing,
  "Backspace": nothing,
  "Delete": nothing,
  "Mod-B": nothing,
  "Mod-I": nothing,
  "Mod-Backspace": nothing,
  "Mod-Delete": nothing,
  "Shift-Backspace": nothing,
  "Shift-Delete": nothing,
  "Shift-Mod-Backspace": nothing,
  "Shift-Mod-Delete": nothing,
  "Mod-Z": nothing,
  "Mod-Y": nothing,
  "Shift-Mod-Z": nothing,
  "Ctrl-D": nothing,
  "Ctrl-H": nothing,
  "Ctrl-Alt-Backspace": nothing,
  "Alt-D": nothing,
  "Alt-Delete": nothing,
  "Alt-Backspace": nothing,

  "Mod-A": ensureSelection
};["Left", "Right", "Up", "Down", "Home", "End", "PageUp", "PageDown"].forEach(function (key) {
  keys[key] = keys["Shift-" + key] = keys["Mod-" + key] = keys["Shift-Mod-" + key] = keys["Alt-" + key] = keys["Shift-Alt-" + key] = ensureSelection;
});["Left", "Mod-Left", "Right", "Mod-Right", "Up", "Down"].forEach(function (key) {
  return delete keys[key];
});

if (_dom.browser.mac) keys["Ctrl-F"] = keys["Ctrl-B"] = keys["Ctrl-P"] = keys["Ctrl-N"] = keys["Alt-F"] = keys["Alt-B"] = keys["Ctrl-A"] = keys["Ctrl-E"] = keys["Ctrl-V"] = keys["goPageUp"] = ensureSelection;

var captureKeys = new _keys.Keymap(keys);
exports.captureKeys = captureKeys;

},{"../dom":2,"./keys":13,"./selection":17}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isWordChar = isWordChar;
exports.charCategory = charCategory;
exports.isExtendingChar = isExtendingChar;
var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;

// Extending unicode characters. A series of a non-extending char +
// any number of extending chars is treated as a single unit as far
// as editing and measuring is concerned. This is not fully correct,
// since some scripts/fonts/browsers also treat other configurations
// of code points as a group.
var extendingChar = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;

function isWordChar(ch) {
  return (/\w/.test(ch) || isExtendingChar(ch) || ch > "\x80" && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
  );
}

/**
 * Get the category of a given character. Either a "space",
 * a character that can be part of a word ("word"), or anything else ("other").
 *
 * @param  {string} ch The character.
 * @return {string}
 */

function charCategory(ch) {
  return (/\s/.test(ch) ? "space" : isWordChar(ch) ? "word" : "other"
  );
}

function isExtendingChar(ch) {
  return ch.charCodeAt(0) >= 768 && extendingChar.test(ch);
}

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.defineCommand = defineCommand;
exports.defineParamHandler = defineParamHandler;
exports.initCommands = initCommands;
exports.defaultKeymap = defaultKeymap;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _transform = require("../transform");

var _dom = require("../dom");

var _utilSortedinsert = require("../util/sortedinsert");

var _utilSortedinsert2 = _interopRequireDefault(_utilSortedinsert);

var _char = require("./char");

var _keys = require("./keys");

var _selection = require("./selection");

var globalCommands = Object.create(null);
var paramHandlers = Object.create(null);

function defineCommand(name, cmd) {
  globalCommands[name] = cmd instanceof Command ? cmd : new Command(name, cmd);
}

_model.NodeType.attachCommand = _model.StyleType.attachCommand = function (name, create) {
  this.register("commands", { name: name, create: create });
};

function defineParamHandler(name, handler) {
  paramHandlers[name] = handler;
}

function getParamHandler(pm) {
  var option = pm.options.commandParamHandler;
  if (option && paramHandlers[option]) return paramHandlers[option];
}

var Command = (function () {
  function Command(name, options) {
    _classCallCheck(this, Command);

    this.name = name;
    this.label = options.label || name;
    this.run = options.run;
    this.params = options.params || [];
    this.select = options.select || function () {
      return true;
    };
    this.active = options.active || function () {
      return false;
    };
    this.info = options;
    this.display = options.display || "icon";
  }

  _createClass(Command, [{
    key: "exec",
    value: function exec(pm, params) {
      var _this = this;

      if (!this.params.length) return this.run(pm);
      if (params) return this.run.apply(this, [pm].concat(_toConsumableArray(params)));
      var handler = getParamHandler(pm);
      if (handler) handler(pm, this, function (params) {
        if (params) _this.run.apply(_this, [pm].concat(_toConsumableArray(params)));
      });else return false;
    }
  }]);

  return Command;
})();

exports.Command = Command;

function initCommands(schema) {
  var result = Object.create(null);
  for (var cmd in globalCommands) {
    result[cmd] = globalCommands[cmd];
  }function fromTypes(types) {
    var _loop = function (_name) {
      var type = types[_name],
          cmds = type.commands;
      if (cmds) cmds.forEach(function (_ref) {
        var name = _ref.name;
        var create = _ref.create;

        result[name] = new Command(name, create(type));
      });
    };

    for (var _name in types) {
      _loop(_name);
    }
  }
  fromTypes(schema.nodes);
  fromTypes(schema.styles);
  return result;
}

function defaultKeymap(pm) {
  var bindings = {};
  function add(command, key) {
    if (Array.isArray(key)) {
      for (var i = 0; i < key.length; i++) {
        add(command, key[i]);
      }
    } else if (key) {
      var _d$$exec = /^(.+?)(?:\((\d+)\))?$/.exec(key);

      var _d$$exec2 = _slicedToArray(_d$$exec, 3);

      var _ = _d$$exec2[0];
      var _name2 = _d$$exec2[1];
      var _d$$exec2$2 = _d$$exec2[2];
      var rank = _d$$exec2$2 === undefined ? 50 : _d$$exec2$2;

      (0, _utilSortedinsert2["default"])(bindings[_name2] || (bindings[_name2] = []), { command: command, rank: rank }, function (a, b) {
        return a.rank - b.rank;
      });
    }
  }
  for (var _name3 in pm.commands) {
    var cmd = pm.commands[_name3];
    add(_name3, cmd.info.key);
    add(_name3, _dom.browser.mac ? cmd.info.macKey : cmd.info.pcKey);
  }

  for (var key in bindings) {
    bindings[key] = bindings[key].map(function (b) {
      return b.command;
    });
  }return new _keys.Keymap(bindings);
}

var andScroll = { scrollIntoView: true };

_model.HardBreak.attachCommand("insertHardBreak", function (type) {
  return {
    label: "Insert hard break",
    run: function run(pm) {
      var _pm$selection = pm.selection;
      var node = _pm$selection.node;
      var from = _pm$selection.from;

      if (node && node.isBlock) return false;else if (pm.doc.path(from.path).type.isCode) return pm.tr.typeText("\n").apply(andScroll);else return pm.tr.replaceSelection(type.create()).apply(andScroll);
    },
    key: ["Mod-Enter", "Shift-Enter"]
  };
});

function inlineStyleActive(pm, type) {
  var sel = pm.selection;
  if (sel.empty) return (0, _model.containsStyle)(pm.activeStyles(), type);else return (0, _model.rangeHasStyle)(pm.doc, sel.from, sel.to, type);
}

function canAddInline(pm, type) {
  var _pm$selection2 = pm.selection;
  var from = _pm$selection2.from;
  var to = _pm$selection2.to;
  var empty = _pm$selection2.empty;

  if (empty) return !(0, _model.containsStyle)(pm.activeStyles(), type) && pm.doc.path(from.path).type.canContainStyle(type);
  var can = false;
  pm.doc.nodesBetween(from, to, function (node) {
    if (can || node.isTextblock && !node.type.canContainStyle(type)) return false;
    if (node.isInline && !(0, _model.containsStyle)(node.styles, type)) can = true;
  });
  return can;
}

function inlineStyleApplies(pm, type) {
  var _pm$selection3 = pm.selection;
  var from = _pm$selection3.from;
  var to = _pm$selection3.to;

  var relevant = false;
  pm.doc.nodesBetween(from, to, function (node) {
    if (node.isTextblock) {
      if (node.type.canContainStyle(type)) relevant = true;
      return false;
    }
  });
  return relevant;
}

function generateStyleCommands(type, name, labelName, info) {
  if (!labelName) labelName = name;
  var cap = name.charAt(0).toUpperCase() + name.slice(1);
  type.attachCommand("set" + cap, function (type) {
    return {
      label: "Set " + labelName,
      run: function run(pm) {
        pm.setStyle(type, true);
      },
      select: function select(pm) {
        return canAddInline(pm, type);
      }
    };
  });
  type.attachCommand("unset" + cap, function (type) {
    return {
      label: "Remove " + labelName,
      run: function run(pm) {
        pm.setStyle(type, false);
      },
      select: function select(pm) {
        return inlineStyleActive(pm, type);
      }
    };
  });
  type.attachCommand(name, function (type) {
    var command = {
      label: "Toggle " + labelName,
      run: function run(pm) {
        pm.setStyle(type, null);
      },
      active: function active(pm) {
        return inlineStyleActive(pm, type);
      },
      select: function select(pm) {
        return inlineStyleApplies(pm, type);
      },
      info: info
    };
    for (var prop in info) {
      command[prop] = info[prop];
    }return command;
  });
}

generateStyleCommands(_model.StrongStyle, "strong", null, {
  menuGroup: "inline",
  menuRank: 20,
  key: "Mod-B"
});

generateStyleCommands(_model.EmStyle, "em", "emphasis", {
  menuGroup: "inline",
  menuRank: 21,
  key: "Mod-I"
});

generateStyleCommands(_model.CodeStyle, "code", null, {
  menuGroup: "inline",
  menuRank: 22,
  key: "Mod-`"
});

_model.LinkStyle.attachCommand("unlink", function (type) {
  return {
    label: "Unlink",
    run: function run(pm) {
      pm.setStyle(type, false);
    },
    select: function select(pm) {
      return inlineStyleActive(pm, type);
    },
    active: function active() {
      return true;
    },
    menuGroup: "inline", menuRank: 30
  };
});
_model.LinkStyle.attachCommand("link", function (type) {
  return {
    label: "Add link",
    run: function run(pm, href, title) {
      pm.setStyle(type, true, { href: href, title: title });
    },
    params: [{ name: "Target", type: "text" }, { name: "Title", type: "text", "default": "" }],
    select: function select(pm) {
      return inlineStyleApplies(pm, type) && !inlineStyleActive(pm, type);
    },
    menuGroup: "inline", menuRank: 30
  };
});

_model.Image.attachCommand("insertImage", function (type) {
  return {
    label: "Insert image",
    run: function run(pm, src, alt, title) {
      return pm.tr.replaceSelection(type.create({ src: src, title: title, alt: alt })).apply(andScroll);
    },
    params: [{ name: "Image URL", type: "text" }, { name: "Description / alternative text", type: "text", "default": "" }, { name: "Title", type: "text", "default": "" }],
    select: function select(pm) {
      return pm.doc.path(pm.selection.from.path).type.canContainType(type);
    },
    menuGroup: "inline",
    menuRank: 40,
    prefillParams: function prefillParams(pm) {
      var node = pm.selection.node;

      if (node && node.type == type) return [node.attrs.src, node.attrs.alt, node.attrs.title];
    }
  };
});

/**
 * Get an offset moving backward from a current offset inside a node.
 *
 * @param  {Object} parent The parent node.
 * @param  {int}    offset Offset to move from inside the node.
 * @param  {string} by     Size to delete by. Either "char" or "word".
 * @return {[type]}        [description]
 */
function moveBackward(parent, offset, by) {
  if (by != "char" && by != "word") throw new Error("Unknown motion unit: " + by);

  var _parent$childBefore = parent.childBefore(offset);

  var index = _parent$childBefore.index;
  var innerOffset = _parent$childBefore.innerOffset;

  var cat = null,
      counted = 0;
  for (; index >= 0; index--, innerOffset = null) {
    var child = parent.child(index),
        size = child.offset;
    if (!child.isText) return cat ? offset : offset - 1;

    if (by == "char") {
      for (var i = innerOffset == null ? size : innerOffset; i > 0; i--) {
        if (!(0, _char.isExtendingChar)(child.text.charAt(i - 1))) return offset - 1;
        offset--;
      }
    } else if (by == "word") {
      // Work from the current position backwards through text of a singular
      // character category (e.g. "cat" of "#!*") until reaching a character in a
      // different category (i.e. the end of the word).
      for (var i = innerOffset == null ? size : innerOffset; i > 0; i--) {
        var nextCharCat = (0, _char.charCategory)(child.text.charAt(i - 1));
        if (cat == null || counted == 1 && cat == "space") cat = nextCharCat;else if (cat != nextCharCat) return offset;
        offset--;
        counted++;
      }
    }
  }
  return offset;
}

defineCommand("deleteSelection", {
  label: "Delete the selection",
  run: function run(pm) {
    return pm.tr.replaceSelection().apply(andScroll);
  },
  key: ["Backspace(10)", "Delete(10)", "Mod-Backspace(10)", "Mod-Delete(10)"],
  macKey: ["Ctrl-H(10)", "Alt-Backspace(10)", "Ctrl-D(10)", "Ctrl-Alt-Backspace(10)", "Alt-Delete(10)", "Alt-D(10)"]
});

function deleteBarrier(pm, cut) {
  var around = pm.doc.path(cut.path);
  var before = around.child(cut.offset - 1),
      after = around.child(cut.offset);
  if (before.type.canContainChildren(after) && pm.tr.join(cut).apply(andScroll) !== false) return;

  var conn = undefined;
  if (after.isTextblock && (conn = before.type.findConnection(after.type))) {
    var tr = pm.tr,
        end = cut.move(1);
    tr.step("ancestor", cut, end, null, { wrappers: [before].concat(_toConsumableArray(conn.map(function (t) {
        return t.create();
      }))) });
    tr.join(end);
    tr.join(cut);
    if (tr.apply(andScroll) !== false) return;
  }

  var selAfter = (0, _selection.findSelectionFrom)(pm.doc, cut, 1);
  return pm.tr.lift(selAfter.from, selAfter.to).apply(andScroll);
}

defineCommand("joinBackward", {
  label: "Join with the block above",
  run: function run(pm) {
    var _pm$selection4 = pm.selection;
    var head = _pm$selection4.head;
    var empty = _pm$selection4.empty;

    if (!empty || head.offset > 0) return false;

    // Find the node before this one
    var before = undefined,
        cut = undefined;
    for (var i = head.path.length - 1; !before && i >= 0; i--) {
      if (head.path[i] > 0) {
        cut = head.shorten(i);
        before = pm.doc.path(cut.path).child(cut.offset - 1);
      }
    } // If there is no node before this, try to lift
    if (!before) return pm.tr.lift(head).apply(andScroll);

    // If the node doesn't allow children, delete it
    if (before.type.contains == null) return pm.tr["delete"](cut.move(-1), cut).apply(andScroll);

    // Apply the joining algorithm
    return deleteBarrier(pm, cut);
  },
  key: ["Backspace(30)", "Mod-Backspace(30)"]
});

defineCommand("deleteCharBefore", {
  label: "Delete a character before the cursor",
  run: function run(pm) {
    var _pm$selection5 = pm.selection;
    var head = _pm$selection5.head;
    var empty = _pm$selection5.empty;

    if (!empty || head.offset == 0) return false;
    var from = moveBackward(pm.doc.path(head.path), head.offset, "char");
    return pm.tr["delete"](new _model.Pos(head.path, from), head).apply(andScroll);
  },
  key: "Backspace(60)",
  macKey: "Ctrl-H(40)"
});

defineCommand("deleteWordBefore", {
  label: "Delete the word before the cursor",
  run: function run(pm) {
    var _pm$selection6 = pm.selection;
    var head = _pm$selection6.head;
    var empty = _pm$selection6.empty;

    if (!empty || head.offset == 0) return false;
    var from = moveBackward(pm.doc.path(head.path), head.offset, "word");
    return pm.tr["delete"](new _model.Pos(head.path, from), head).apply(andScroll);
  },
  key: "Mod-Backspace(40)",
  macKey: "Alt-Backspace(40)"
});

function moveForward(parent, offset, by) {
  if (by != "char" && by != "word") throw new Error("Unknown motion unit: " + by);

  var _parent$childAfter = parent.childAfter(offset);

  var index = _parent$childAfter.index;
  var innerOffset = _parent$childAfter.innerOffset;

  var cat = null,
      counted = 0;
  for (; index < parent.length; index++, innerOffset = 0) {
    var child = parent.child(index),
        size = child.offset;
    if (!child.isText) return cat ? offset : offset + 1;

    if (by == "char") {
      for (var i = innerOffset; i < size; i++) {
        if (!(0, _char.isExtendingChar)(child.text.charAt(i + 1))) return offset + 1;
        offset++;
      }
    } else if (by == "word") {
      for (var i = innerOffset; i < size; i++) {
        var nextCharCat = (0, _char.charCategory)(child.text.charAt(i));
        if (cat == null || counted == 1 && cat == "space") cat = nextCharCat;else if (cat != nextCharCat) return offset;
        offset++;
        counted++;
      }
    }
  }
  return offset;
}

defineCommand("joinForward", {
  label: "Join with the block below",
  run: function run(pm) {
    var _pm$selection7 = pm.selection;
    var head = _pm$selection7.head;
    var empty = _pm$selection7.empty;

    if (!empty || head.offset < pm.doc.path(head.path).maxOffset) return false;

    // Find the node after this one
    var after = undefined,
        cut = undefined;
    for (var i = head.path.length - 1; !after && i >= 0; i--) {
      cut = head.shorten(i, 1);
      var _parent = pm.doc.path(cut.path);
      if (cut.offset < _parent.length) after = _parent.child(cut.offset);
    }

    // If there is no node after this, there's nothing to do
    if (!after) return false;

    // If the node doesn't allow children, delete it
    if (after.type.contains == null) return pm.tr["delete"](cut, cut.move(1)).apply(andScroll);

    // Apply the joining algorithm
    return deleteBarrier(pm, cut);
  },
  key: ["Delete(30)", "Mod-Delete(30)"]
});

defineCommand("deleteCharAfter", {
  label: "Delete a character after the cursor",
  run: function run(pm) {
    var _pm$selection8 = pm.selection;
    var head = _pm$selection8.head;
    var empty = _pm$selection8.empty;

    if (!empty || head.offset == pm.doc.path(head.path).maxOffset) return false;
    var to = moveForward(pm.doc.path(head.path), head.offset, "char");
    return pm.tr["delete"](head, new _model.Pos(head.path, to)).apply(andScroll);
  },
  key: "Delete(60)",
  macKey: "Ctrl-D(60)"
});

defineCommand("deleteWordAfter", {
  label: "Delete a character after the cursor",
  run: function run(pm) {
    var _pm$selection9 = pm.selection;
    var head = _pm$selection9.head;
    var empty = _pm$selection9.empty;

    if (!empty || head.offset == pm.doc.path(head.path).maxOffset) return false;
    var to = moveForward(pm.doc.path(head.path), head.offset, "word");
    return pm.tr["delete"](head, new _model.Pos(head.path, to)).apply(andScroll);
  },
  key: "Mod-Delete(40)",
  macKey: ["Ctrl-Alt-Backspace(40)", "Alt-Delete(40)", "Alt-D(40)"]
});

function joinPointAbove(pm) {
  var _pm$selection10 = pm.selection;
  var node = _pm$selection10.node;
  var from = _pm$selection10.from;

  if (node) return (0, _transform.joinableBlocks)(pm.doc, from) ? from : null;else return (0, _transform.joinPoint)(pm.doc, from, -1);
}

defineCommand("joinUp", {
  label: "Join with above block",
  run: function run(pm) {
    var node = pm.selection.node;
    var point = joinPointAbove(pm);
    if (!point) return false;
    pm.tr.join(point).apply();
    if (node) pm.setNodeSelection(point.move(-1));
  },
  select: function select(pm) {
    return joinPointAbove(pm);
  },
  menuGroup: "block", menuRank: 80,
  key: "Alt-Up"
});

function joinPointBelow(pm) {
  var _pm$selection11 = pm.selection;
  var node = _pm$selection11.node;
  var to = _pm$selection11.to;

  if (node) return (0, _transform.joinableBlocks)(pm.doc, to) ? to : null;else return (0, _transform.joinPoint)(pm.doc, to, 1);
}

defineCommand("joinDown", {
  label: "Join with below block",
  run: function run(pm) {
    var node = pm.selection.node;
    var point = joinPointBelow(pm);
    if (!point) return false;
    pm.tr.join(point).apply();
    if (node) pm.setNodeSelection(point.move(-1));
  },
  select: function select(pm) {
    return joinPointBelow(pm);
  },
  key: "Alt-Down"
});

defineCommand("lift", {
  label: "Lift out of enclosing block",
  run: function run(pm) {
    var _pm$selection12 = pm.selection;
    var from = _pm$selection12.from;
    var to = _pm$selection12.to;

    return pm.tr.lift(from, to).apply(andScroll);
  },
  select: function select(pm) {
    var _pm$selection13 = pm.selection;
    var from = _pm$selection13.from;
    var to = _pm$selection13.to;

    return (0, _transform.canLift)(pm.doc, from, to);
  },
  menuGroup: "block", menuRank: 75,
  key: "Alt-Left"
});

function wrapCommand(type, name, labelName, info) {
  type.attachCommand("wrap" + name, function (type) {
    var command = {
      label: "Wrap in " + labelName,
      run: function run(pm) {
        var _pm$selection14 = pm.selection;
        var from = _pm$selection14.from;
        var to = _pm$selection14.to;

        return pm.tr.wrap(from, to, type.create()).apply(andScroll);
      },
      select: function select(pm) {
        var _pm$selection15 = pm.selection;
        var from = _pm$selection15.from;
        var to = _pm$selection15.to;

        return (0, _transform.canWrap)(pm.doc, from, to, type.create());
      }
    };
    for (var key in info) {
      command[key] = info[key];
    }return command;
  });
}

wrapCommand(_model.BulletList, "BulletList", "bullet list", {
  menuGroup: "block",
  menuRank: 40,
  key: ["Alt-Right '*'", "Alt-Right '-'"]
});

wrapCommand(_model.OrderedList, "OrderedList", "ordered list", {
  menuGroup: "block",
  menuRank: 41,
  key: "Alt-Right '1'"
});

wrapCommand(_model.BlockQuote, "BlockQuote", "block quote", {
  menuGroup: "block",
  menuRank: 45,
  key: ["Alt-Right '>'", "Alt-Right '\"'"]
});

defineCommand("newlineInCode", {
  label: "Insert newline",
  run: function run(pm) {
    var _pm$selection16 = pm.selection;
    var from = _pm$selection16.from;
    var to = _pm$selection16.to;
    var node = _pm$selection16.node;var block = undefined;
    if (!node && _model.Pos.samePath(from.path, to.path) && (block = pm.doc.path(from.path)).type.isCode && to.offset < block.maxOffset) return pm.tr.typeText("\n").apply(andScroll);else return false;
  },
  key: "Enter(10)"
});

defineCommand("createParagraphNear", {
  label: "Create a paragraph near the selected leaf block",
  run: function run(pm) {
    var _pm$selection17 = pm.selection;
    var from = _pm$selection17.from;
    var to = _pm$selection17.to;
    var node = _pm$selection17.node;

    if (!node || !node.isBlock || node.type.contains) return false;
    var side = from.offset ? to : from;
    pm.tr.insert(side, pm.schema.defaultTextblockType().create()).apply(andScroll);
    pm.setSelection(new _model.Pos(side.toPath(), 0));
  },
  key: "Enter(20)"
});

defineCommand("liftEmptyBlock", {
  label: "Move current block up",
  run: function run(pm) {
    var _pm$selection18 = pm.selection;
    var head = _pm$selection18.head;
    var empty = _pm$selection18.empty;

    if (!empty || head.offset > 0) return false;
    if (head.path[head.path.length - 1] > 0 && pm.tr.split(head.shorten()).apply() !== false) return;
    return pm.tr.lift(head).apply(andScroll);
  },
  key: "Enter(30)"
});

defineCommand("splitBlock", {
  label: "Split the current block",
  run: function run(pm) {
    var _pm$selection19 = pm.selection;
    var from = _pm$selection19.from;
    var to = _pm$selection19.to;
    var node = _pm$selection19.node;var block = pm.doc.path(to.path);
    if (node && node.isBlock) {
      if (!from.offset) return false;
      return pm.tr.split(from).apply(andScroll);
    } else {
      var type = to.offset == block.maxOffset ? pm.schema.defaultTextblockType().create() : null;
      return pm.tr["delete"](from, to).split(from, 1, type).apply(andScroll);
    }
  },
  key: "Enter(60)"
});

function blockTypeCommand(type, name, labelName, attrs, key) {
  if (!attrs) attrs = {};
  type.attachCommand(name, function (type) {
    return {
      label: "Change to " + labelName,
      run: function run(pm) {
        var _pm$selection20 = pm.selection;
        var from = _pm$selection20.from;
        var to = _pm$selection20.to;

        return pm.tr.setBlockType(from, to, pm.schema.node(type, attrs)).apply(andScroll);
      },
      select: function select(pm) {
        var _pm$selection21 = pm.selection;
        var from = _pm$selection21.from;
        var to = _pm$selection21.to;
        var node = _pm$selection21.node;

        if (node) return node.isTextblock && !(0, _model.compareMarkup)(type, node.type, attrs, node.attrs);else return !(0, _transform.alreadyHasBlockType)(pm.doc, from, to, type, attrs);
      },
      key: key
    };
  });
}

blockTypeCommand(_model.Heading, "makeH1", "heading 1", { level: 1 }, "Mod-H '1'");
blockTypeCommand(_model.Heading, "makeH2", "heading 2", { level: 2 }, "Mod-H '2'");
blockTypeCommand(_model.Heading, "makeH3", "heading 3", { level: 3 }, "Mod-H '3'");
blockTypeCommand(_model.Heading, "makeH4", "heading 4", { level: 4 }, "Mod-H '4'");
blockTypeCommand(_model.Heading, "makeH5", "heading 5", { level: 5 }, "Mod-H '5'");
blockTypeCommand(_model.Heading, "makeH6", "heading 6", { level: 6 }, "Mod-H '6'");

blockTypeCommand(_model.Paragraph, "makeParagraph", "paragraph", null, "Mod-P");
blockTypeCommand(_model.CodeBlock, "makeCodeBlock", "code block", null, "Mod-\\");

_model.HorizontalRule.attachCommand("insertHorizontalRule", function (type) {
  return {
    label: "Insert horizontal rule",
    run: function run(pm) {
      return pm.tr.replaceSelection(type.create()).apply(andScroll);
    },
    key: "Mod-Space"
  };
});

defineCommand("undo", {
  label: "Undo last change",
  run: function run(pm) {
    pm.scrollIntoView();return pm.history.undo();
  },
  select: function select(pm) {
    return pm.history.canUndo();
  },
  menuGroup: "history",
  menuRank: 10,
  key: "Mod-Z"
});

defineCommand("redo", {
  label: "Redo last undone change",
  run: function run(pm) {
    pm.scrollIntoView();return pm.history.redo();
  },
  select: function select(pm) {
    return pm.history.canRedo();
  },
  menuGroup: "history",
  menuRank: 20,
  key: ["Mod-Y", "Shift-Mod-Z"]
});

defineCommand("textblockType", {
  label: "Change block type",
  run: function run(pm, type) {
    var _pm$selection22 = pm.selection;
    var from = _pm$selection22.from;
    var to = _pm$selection22.to;

    return pm.tr.setBlockType(from, to, type).apply();
  },
  select: function select(pm) {
    var node = pm.selection.node;

    return !node || node.isTextblock;
  },
  params: [{ name: "Type", type: "select", options: listTextblockTypes, "default": currentTextblockType, defaultLabel: "Type..." }],
  display: "select",
  menuGroup: "block", menuRank: 10
});

_model.Paragraph.prototype.textblockTypes = [{ label: "Normal", rank: 10 }];
_model.CodeBlock.prototype.textblockTypes = [{ label: "Code", rank: 20 }];
_model.Heading.prototype.textblockTypes = [1, 2, 3, 4, 5, 6].map(function (n) {
  return { label: "Head " + n, attrs: { level: n }, rank: 30 + n };
});

function listTextblockTypes(pm) {
  var cached = pm.schema.cached.textblockTypes;
  if (cached) return cached;

  var found = [];
  for (var _name4 in pm.schema.nodes) {
    var type = pm.schema.nodes[_name4];
    if (!type.textblockTypes) continue;
    for (var i = 0; i < type.textblockTypes.length; i++) {
      var info = type.textblockTypes[i];
      (0, _utilSortedinsert2["default"])(found, { label: info.label, value: type.create(info.attrs), rank: info.rank }, function (a, b) {
        return a.rank - b.rank;
      });
    }
  }
  return pm.schema.cached.textblockTypes = found;
}

function currentTextblockType(pm) {
  var _pm$selection23 = pm.selection;
  var from = _pm$selection23.from;
  var to = _pm$selection23.to;
  var node = _pm$selection23.node;

  if (!node || node.isInline) {
    if (!_model.Pos.samePath(from.path, to.path)) return null;
    node = pm.doc.path(from.path);
  } else if (!node.isTextblock) {
    return null;
  }
  var types = listTextblockTypes(pm);
  for (var i = 0; i < types.length; i++) {
    if (types[i].value.sameMarkup(node)) return types[i];
  }
}

function nodeAboveSelection(pm) {
  var sel = pm.selection,
      i = 0;
  if (sel.node) return !!sel.from.depth && sel.from.shorten();
  for (; i < sel.head.depth && i < sel.anchor.depth; i++) if (sel.head.path[i] != sel.anchor.path[i]) break;
  return i == 0 ? false : sel.head.shorten(i - 1);
}

defineCommand("selectParentBlock", {
  label: "Select parent node",
  run: function run(pm) {
    var node = nodeAboveSelection(pm);
    if (!node) return false;
    pm.setNodeSelection(node);
  },
  select: function select(pm) {
    return nodeAboveSelection(pm);
  },
  menuGroup: "block",
  menuRank: 90,
  key: "Esc"
});

function moveSelectionBlock(pm, dir) {
  var _pm$selection24 = pm.selection;
  var from = _pm$selection24.from;
  var to = _pm$selection24.to;
  var node = _pm$selection24.node;

  var side = dir > 0 ? to : from;
  return (0, _selection.findSelectionFrom)(pm.doc, node && node.isBlock ? side : side.shorten(null, dir > 0 ? 1 : 0), dir);
}

function selectBlockHorizontally(pm, dir) {
  var _pm$selection25 = pm.selection;
  var empty = _pm$selection25.empty;
  var node = _pm$selection25.node;
  var from = _pm$selection25.from;
  var to = _pm$selection25.to;

  if (!empty && !node) return false;

  if (node && node.isInline) {
    pm.setSelection(dir > 0 ? to : from);
    return true;
  }

  var parent = undefined;
  if (!node && (parent = pm.doc.path(from.path)) && (dir > 0 ? from.offset < parent.maxOffset : from.offset)) {
    var _ref2 = dir > 0 ? parent.childAfter(from.offset) : parent.childBefore(from.offset);

    var nextNode = _ref2.node;
    var innerOffset = _ref2.innerOffset;

    if (nextNode && nextNode.type.selectable && (dir > 0 ? !innerOffset : innerOffset == nextNode.offset)) {
      pm.setNodeSelection(dir < 0 ? from.move(-1) : from);
      return true;
    }
    return false;
  }

  var next = moveSelectionBlock(pm, dir);
  if (next && (next instanceof _selection.NodeSelection || node)) {
    pm.setSelection(next);
    return true;
  }
  return false;
}

defineCommand("selectBlockLeft", {
  label: "Move the selection onto or out of the block to the left",
  run: function run(pm) {
    var done = selectBlockHorizontally(pm, -1);
    if (done) pm.scrollIntoView();
    return done;
  },
  key: ["Left", "Mod-Left"]
});

defineCommand("selectBlockRight", {
  label: "Move the selection onto or out of the block to the right",
  run: function run(pm) {
    var done = selectBlockHorizontally(pm, 1);
    if (done) pm.scrollIntoView();
    return done;
  },
  key: ["Right", "Mod-Right"]
});

function selectBlockVertically(pm, dir) {
  var _pm$selection26 = pm.selection;
  var empty = _pm$selection26.empty;
  var node = _pm$selection26.node;
  var from = _pm$selection26.from;
  var to = _pm$selection26.to;

  if (!empty && !node) return false;

  var leavingTextblock = true;
  if (!node || node.isInline) leavingTextblock = (0, _selection.verticalMotionLeavesTextblock)(pm, dir > 0 ? to : from, dir);

  if (leavingTextblock) {
    var next = moveSelectionBlock(pm, dir);
    if (next && next instanceof _selection.NodeSelection) {
      pm.setSelection(next);
      if (!node) pm.sel.lastNonNodePos = from;
      return true;
    }
  }

  if (!node) return false;

  if (node.isInline) {
    (0, _selection.setDOMSelectionToPos)(pm, from);
    return false;
  }

  var last = pm.sel.lastNonNodePos;
  var beyond = (0, _selection.findSelectionFrom)(pm.doc, dir < 0 ? from : to, dir);
  if (last && beyond && _model.Pos.samePath(last.path, beyond.from.path)) {
    (0, _selection.setDOMSelectionToPos)(pm, last);
    return false;
  }
  pm.setSelection(beyond);
  return true;
}

defineCommand("selectBlockUp", {
  label: "Move the selection onto or out of the block above",
  run: function run(pm) {
    var done = selectBlockVertically(pm, -1);
    if (done !== false) pm.scrollIntoView();
    return done;
  },
  key: "Up"
});

defineCommand("selectBlockDown", {
  label: "Move the selection onto or out of the block below",
  run: function run(pm) {
    var done = selectBlockVertically(pm, 1);
    if (done !== false) pm.scrollIntoView();
    return done;
  },
  key: "Down"
});

},{"../dom":2,"../model":24,"../transform":37,"../util/sortedinsert":49,"./char":4,"./keys":13,"./selection":17}],6:[function(require,module,exports){
"use strict";

var _dom = require("../dom");

(0, _dom.insertCSS)("\n\n.ProseMirror {\n  border: 1px solid silver;\n  position: relative;\n}\n\n.ProseMirror-content {\n  padding: 4px 8px 4px 14px;\n  white-space: pre-wrap;\n  line-height: 1.2;\n}\n\n.ProseMirror-drop-target {\n  position: absolute;\n  width: 1px;\n  background: #666;\n  display: none;\n}\n\n.ProseMirror-content ul.tight p, .ProseMirror-content ol.tight p {\n  margin: 0;\n}\n\n.ProseMirror-content ul, .ProseMirror-content ol {\n  padding-left: 30px;\n  cursor: default;\n}\n\n.ProseMirror-content blockquote {\n  padding-left: 1em;\n  border-left: 3px solid #eee;\n  margin-left: 0; margin-right: 0;\n}\n\n.ProseMirror-content pre {\n  white-space: pre-wrap;\n}\n\n.ProseMirror-selectednode {\n  outline: 2px solid #8cf;\n}\n\n.ProseMirror-content p:first-child,\n.ProseMirror-content h1:first-child,\n.ProseMirror-content h2:first-child,\n.ProseMirror-content h3:first-child,\n.ProseMirror-content h4:first-child,\n.ProseMirror-content h5:first-child,\n.ProseMirror-content h6:first-child {\n  margin-top: .3em;\n}\n\n/* Add space around the hr to make clicking it easier */\n\n.ProseMirror-content hr {\n  position: relative;\n  height: 6px;\n  border: none;\n}\n\n.ProseMirror-content hr:after {\n  content: \"\";\n  position: absolute;\n  left: 10px;\n  right: 10px;\n  top: 2px;\n  border-top: 2px solid silver;\n}\n\n.ProseMirror-content img {\n  cursor: default;\n}\n\n/* Make sure li selections wrap around markers */\n\n.ProseMirror-content li {\n  position: relative;\n  pointer-events: none; /* Don't do weird stuff with marker clicks */\n}\n.ProseMirror-content li > * {\n  pointer-events: auto;\n}\n\nli.ProseMirror-selectednode {\n  outline: none;\n}\n\nli.ProseMirror-selectednode:after {\n  content: \"\";\n  position: absolute;\n  left: -32px;\n  right: -2px; top: -2px; bottom: -2px;\n  border: 2px solid #8cf;\n  pointer-events: none;\n}\n\n");

},{"../dom":2}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyDOMChange = applyDOMChange;
exports.textContext = textContext;
exports.textInContext = textInContext;

var _model = require("../model");

var _parseDom = require("../parse/dom");

var _transformTree = require("../transform/tree");

var _selection = require("./selection");

function isAtEnd(node, pos, depth) {
  for (var i = depth || 0; i < pos.path.length; i++) {
    var n = pos.path[depth];
    if (n < node.length - 1) return false;
    node = node.child(n);
  }
  return pos.offset == node.maxOffset;
}
function isAtStart(pos, depth) {
  if (pos.offset > 0) return false;
  for (var i = depth || 0; i < pos.path.length; i++) {
    if (pos.path[depth] > 0) return false;
  }return true;
}

function parseNearSelection(pm) {
  var dom = pm.content,
      node = pm.doc;
  var _pm$selection = pm.selection;
  var from = _pm$selection.from;
  var to = _pm$selection.to;

  for (var depth = 0;; depth++) {
    var toNode = node.child(to.path[depth]);
    var fromStart = isAtStart(from, depth + 1);
    var toEnd = isAtEnd(toNode, to, depth + 1);
    if (fromStart || toEnd || from.path[depth] != to.path[depth] || toNode.isTextblock) {
      var startOffset = depth == from.depth ? from.offset : from.path[depth];
      if (fromStart && startOffset > 0) startOffset--;
      var endOffset = depth == to.depth ? to.offset : to.path[depth] + 1;
      if (toEnd && endOffset < node.length - 1) endOffset++;
      var parsed = (0, _parseDom.fromDOM)(pm.schema, dom, { topNode: node.copy(),
        from: startOffset,
        to: dom.childNodes.length - (node.length - endOffset) });
      parsed = parsed.copy(node.slice(0, startOffset).concat(parsed.children).concat(node.slice(endOffset)));
      for (var i = depth - 1; i >= 0; i--) {
        var wrap = pm.doc.path(from.path.slice(0, i));
        parsed = wrap.splice(from.path[i], from.path[i] + 1, [parsed]);
      }
      return parsed;
    }
    node = toNode;
    dom = (0, _selection.findByPath)(dom, from.path[depth], false);
  }
}

function applyDOMChange(pm) {
  var updated = parseNearSelection(pm);
  var changeStart = (0, _model.findDiffStart)(pm.doc, updated);
  if (changeStart) {
    var changeEnd = findDiffEndConstrained(pm.doc, updated, changeStart);
    // Mark nodes touched by this change as 'to be redrawn'
    pm.markRangeDirty((0, _model.siblingRange)(pm.doc, changeStart.a, changeEnd.a));

    pm.tr.replace(changeStart.a, changeEnd.a, updated, changeStart.b, changeEnd.b).apply();
    return true;
  } else {
    return false;
  }
}

function offsetBy(first, second, pos) {
  var same = (0, _transformTree.samePathDepth)(first, second);
  var firstEnd = same == first.depth,
      secondEnd = same == second.depth;
  var off = (secondEnd ? second.offset : second.path[same]) - (firstEnd ? first.offset : first.path[same]);
  var shorter = firstEnd ? pos.move(off) : pos.shorten(same, off);
  if (secondEnd) return shorter;else return shorter.extend(new _model.Pos(second.path.slice(same), second.offset));
}

function findDiffEndConstrained(a, b, start) {
  var end = (0, _model.findDiffEnd)(a, b);
  if (!end) return end;
  if (end.a.cmp(start.a) < 0) return { a: start.a, b: offsetBy(end.a, start.a, end.b) };
  if (end.b.cmp(start.b) < 0) return { a: offsetBy(end.b, start.b, end.a), b: start.b };
  return end;
}

// Text-only queries for composition events

function textContext(data) {
  var range = getSelection().getRangeAt(0);
  var start = range.startContainer,
      end = range.endContainer;
  if (start == end && start.nodeType == 3) {
    var value = start.nodeValue,
        lead = range.startOffset,
        _end = range.endOffset;
    if (data && _end >= data.length && value.slice(_end - data.length, _end) == data) lead = _end - data.length;
    return { inside: start, lead: lead, trail: value.length - _end };
  }

  var sizeBefore = null,
      sizeAfter = null;
  var before = start.childNodes[range.startOffset - 1] || nodeBefore(start);
  while (before.lastChild) before = before.lastChild;
  if (before && before.nodeType == 3) {
    var value = before.nodeValue;
    sizeBefore = value.length;
    if (data && value.slice(value.length - data.length) == data) sizeBefore -= data.length;
  }
  var after = end.childNodes[range.endOffset] || nodeAfter(end);
  while (after.firstChild) after = after.firstChild;
  if (after && after.nodeType == 3) sizeAfter = after.nodeValue.length;

  return { before: before, sizeBefore: sizeBefore,
    after: after, sizeAfter: sizeAfter };
}

function textInContext(context, deflt) {
  if (context.inside) {
    var _val = context.inside.nodeValue;
    return _val.slice(context.lead, _val.length - context.trail);
  } else {
    var before = context.before,
        after = context.after,
        val = "";
    if (!before) return deflt;
    if (before.nodeType == 3) val = before.nodeValue.slice(context.sizeBefore);
    var scan = scanText(before, after);
    if (scan == null) return deflt;
    val += scan;
    if (after && after.nodeType == 3) {
      var valAfter = after.nodeValue;
      val += valAfter.slice(0, valAfter.length - context.sizeAfter);
    }
    return val;
  }
}

function nodeAfter(node) {
  for (;;) {
    var next = node.nextSibling;
    if (next) {
      while (next.firstChild) next = next.firstChild;
      return next;
    }
    if (!(node = node.parentElement)) return null;
  }
}

function nodeBefore(node) {
  for (;;) {
    var prev = node.previousSibling;
    if (prev) {
      while (prev.lastChild) prev = prev.lastChild;
      return prev;
    }
    if (!(node = node.parentElement)) return null;
  }
}

function scanText(start, end) {
  var text = "",
      cur = nodeAfter(start);
  for (;;) {
    if (cur == end) return text;
    if (!cur) return null;
    if (cur.nodeType == 3) text += cur.nodeValue;
    cur = cur.firstChild || nodeAfter(cur);
  }
}

},{"../model":24,"../parse/dom":30,"../transform/tree":45,"./selection":17}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.draw = draw;
exports.redraw = redraw;

var _model = require("../model");

var _serializeDom = require("../serialize/dom");

var _dom = require("../dom");

var nonEditable = { html_block: true, html_tag: true, horizontal_rule: true };

function options(path, ranges) {
  return {
    onRender: function onRender(node, dom, offset) {
      if (!node.isInline && offset != null) dom.setAttribute("pm-path", offset);
      if (nonEditable.hasOwnProperty(node.type.name)) dom.contentEditable = false;
      return dom;
    },
    renderInlineFlat: function renderInlineFlat(node, dom, offset) {
      ranges.advanceTo(new _model.Pos(path, offset));
      var end = new _model.Pos(path, offset + node.offset);
      var nextCut = ranges.nextChangeBefore(end);

      var inner = dom,
          wrapped = undefined;
      for (var i = 0; i < node.styles.length; i++) {
        inner = inner.firstChild;
      }if (dom.nodeType != 1) {
        dom = (0, _dom.elt)("span", null, dom);
        if (!nextCut) wrapped = dom;
      }
      if (!wrapped && (nextCut || ranges.current.length)) {
        wrapped = inner == dom ? dom = (0, _dom.elt)("span", null, inner) : inner.parentNode.appendChild((0, _dom.elt)("span", null, inner));
      }

      dom.setAttribute("pm-span", offset + "-" + end.offset);
      if (!node.isText) dom.setAttribute("pm-span-atom", "true");

      var inlineOffset = 0;
      while (nextCut) {
        var size = nextCut - offset;
        var split = splitSpan(wrapped, size);
        if (ranges.current.length) split.className = ranges.current.join(" ");
        split.setAttribute("pm-span-offset", inlineOffset);
        inlineOffset += size;
        offset += size;
        ranges.advanceTo(new _model.Pos(path, offset));
        if (!(nextCut = ranges.nextChangeBefore(end))) wrapped.setAttribute("pm-span-offset", inlineOffset);
      }

      if (ranges.current.length) wrapped.className = ranges.current.join(" ");
      return dom;
    },
    document: document,
    path: path
  };
}

function splitSpan(span, at) {
  var textNode = span.firstChild,
      text = textNode.nodeValue;
  var newNode = span.parentNode.insertBefore((0, _dom.elt)("span", null, text.slice(0, at)), span);
  textNode.nodeValue = text.slice(at);
  return newNode;
}

function draw(pm, doc) {
  pm.content.textContent = "";
  pm.content.appendChild((0, _serializeDom.toDOM)(doc, options([], pm.ranges.activeRangeTracker())));
}

function deleteNextNodes(parent, at, amount) {
  for (var i = 0; i < amount; i++) {
    var prev = at;
    at = at.nextSibling;
    parent.removeChild(prev);
  }
  return at;
}

function redraw(pm, dirty, doc, prev) {
  var ranges = pm.ranges.activeRangeTracker();
  var path = [];

  function scan(dom, node, prev) {
    var status = [],
        inPrev = [],
        inNode = [];
    for (var i = 0, _j = 0; i < prev.length && _j < node.width; i++) {
      var cur = prev.child(i),
          dirtyStatus = dirty.get(cur);
      status.push(dirtyStatus);
      var matching = dirtyStatus ? -1 : node.children.indexOf(cur, _j);
      if (matching > -1) {
        inNode[i] = matching;
        inPrev[matching] = i;
        _j = matching + 1;
      }
    }

    if (node.isTextblock) {
      var needsBR = node.length == 0 || node.lastChild.type == node.type.schema.nodes.hard_break;
      var last = dom.lastChild,
          hasBR = last && last.nodeType == 1 && last.hasAttribute("pm-force-br");
      if (needsBR && !hasBR) dom.appendChild((0, _dom.elt)("br", { "pm-force-br": "true" }));else if (!needsBR && hasBR) dom.removeChild(last);
    }

    var domPos = dom.firstChild,
        j = 0;
    var block = node.isTextblock;
    for (var i = 0, offset = 0; i < node.length; i++) {
      var child = node.child(i);
      if (!block) path.push(i);
      var found = inPrev[i];
      var nodeLeft = true;
      if (found > -1) {
        domPos = deleteNextNodes(dom, domPos, found - j);
        j = found;
      } else if (!block && j < prev.length && inNode[j] == null && status[j] != 2 && child.sameMarkup(prev.child(j))) {
        scan(domPos, child, prev.child(j));
      } else {
        dom.insertBefore((0, _serializeDom.renderNodeToDOM)(child, options(path, ranges), block ? offset : i), domPos);
        nodeLeft = false;
      }
      if (nodeLeft) {
        if (block) domPos.setAttribute("pm-span", offset + "-" + (offset + child.offset));else domPos.setAttribute("pm-path", i);
        domPos = domPos.nextSibling;
        j++;
      }
      if (block) offset += child.offset;else path.pop();
    }
    deleteNextNodes(dom, domPos, prev.length - j);
  }
  scan(pm.content, doc, prev);
}

},{"../dom":2,"../model":24,"../serialize/dom":33}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.eventMixin = eventMixin;
var methods = {
  on: function on(type, f) {
    var map = this._handlers || (this._handlers = {});
    var arr = map[type] || (map[type] = []);
    arr.push(f);
  },

  off: function off(type, f) {
    var arr = this._handlers && this._handlers[type];
    if (arr) for (var i = 0; i < arr.length; ++i) {
      if (arr[i] == f) {
        arr.splice(i, 1);break;
      }
    }
  },

  signal: function signal(type) {
    var arr = this._handlers && this._handlers[type];

    for (var _len = arguments.length, values = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      values[_key - 1] = arguments[_key];
    }

    if (arr) for (var i = 0; i < arr.length; ++i) {
      arr[i].apply(arr, values);
    }
  },

  signalHandleable: function signalHandleable(type) {
    var arr = this._handlers && this._handlers[type];
    if (arr) {
      for (var _len2 = arguments.length, values = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        values[_key2 - 1] = arguments[_key2];
      }

      for (var i = 0; i < arr.length; ++i) {
        var result = arr[i].apply(arr, values);
        if (result !== false) return result;
      }
    }return false;
  },

  hasHandler: function hasHandler(type) {
    var arr = this._handlers && this._handlers[type];
    return arr && arr.length > 0;
  }
};

// Add event-related methods to a constructor's prototype, to make
// registering events on such objects more convenient.

function eventMixin(ctor) {
  var proto = ctor.prototype;
  for (var prop in methods) if (methods.hasOwnProperty(prop)) proto[prop] = methods[prop];
}

},{}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _transform = require("../transform");

var InvertedStep = function InvertedStep(step, version, id) {
  _classCallCheck(this, InvertedStep);

  this.step = step;
  this.version = version;
  this.id = id;
};

var BranchRemapping = (function () {
  function BranchRemapping(branch) {
    _classCallCheck(this, BranchRemapping);

    this.branch = branch;
    this.remap = new _transform.Remapping();
    this.version = branch.version;
    this.mirrorBuffer = Object.create(null);
  }

  _createClass(BranchRemapping, [{
    key: "moveToVersion",
    value: function moveToVersion(version) {
      while (this.version > version) this.addNextMap();
    }
  }, {
    key: "addNextMap",
    value: function addNextMap() {
      var found = this.branch.mirror[this.version];
      var mapOffset = this.branch.maps.length - (this.branch.version - this.version) - 1;
      var id = this.remap.addToFront(this.branch.maps[mapOffset], this.mirrorBuffer[this.version]);
      --this.version;
      if (found != null) this.mirrorBuffer[found] = id;
      return id;
    }
  }, {
    key: "movePastStep",
    value: function movePastStep(result) {
      var id = this.addNextMap();
      if (result) this.remap.addToBack(result.map, id);
    }
  }]);

  return BranchRemapping;
})();

var workTime = 100,
    pauseTime = 150;

var CompressionWorker = (function () {
  function CompressionWorker(doc, branch, callback) {
    _classCallCheck(this, CompressionWorker);

    this.branch = branch;
    this.callback = callback;
    this.remap = new BranchRemapping(branch);

    this.doc = doc;
    this.events = [];
    this.maps = [];
    this.version = this.startVersion = branch.version;

    this.i = branch.events.length;
    this.timeout = null;
    this.aborted = false;
  }

  _createClass(CompressionWorker, [{
    key: "work",
    value: function work() {
      var _this = this;

      if (this.aborted) return;

      var endTime = Date.now() + workTime;

      for (;;) {
        if (this.i == 0) return this.finish();
        var _event = this.branch.events[--this.i],
            outEvent = [];
        for (var j = _event.length - 1; j >= 0; j--) {
          var _event$j = _event[j];
          var step = _event$j.step;
          var stepVersion = _event$j.version;
          var stepID = _event$j.id;

          this.remap.moveToVersion(stepVersion);

          var mappedStep = (0, _transform.mapStep)(step, this.remap.remap);
          if (mappedStep && isDelStep(step)) {
            var extra = 0,
                start = step.from;
            while (j > 0) {
              var next = _event[j - 1];
              if (next.version != stepVersion - 1 || !isDelStep(next.step) || start.cmp(next.step.to)) break;
              extra += next.step.to.offset - next.step.from.offset;
              start = next.step.from;
              stepVersion--;
              j--;
              this.remap.addNextMap();
            }
            if (extra > 0) {
              var _start = mappedStep.from.move(-extra);
              mappedStep = new _transform.Step("replace", _start, mappedStep.to, _start, { nodes: [], openLeft: 0, openRight: 0 });
            }
          }
          var result = mappedStep && mappedStep.apply(this.doc);
          if (result) {
            this.doc = result.doc;
            this.maps.push(result.map.invert());
            outEvent.push(new InvertedStep(mappedStep, this.version, stepID));
            this.version--;
          }
          this.remap.movePastStep(result);
        }
        if (outEvent.length) {
          outEvent.reverse();
          this.events.push(outEvent);
        }
        if (Date.now() > endTime) {
          this.timeout = window.setTimeout(function () {
            return _this.work();
          }, pauseTime);
          return;
        }
      }
    }
  }, {
    key: "finish",
    value: function finish() {
      if (this.aborted) return;

      this.events.reverse();
      this.maps.reverse();
      this.callback(this.maps.concat(this.branch.maps.slice(this.branch.maps.length - (this.branch.version - this.startVersion))), this.events);
    }
  }, {
    key: "abort",
    value: function abort() {
      this.aborted = true;
      window.clearTimeout(this.timeout);
    }
  }]);

  return CompressionWorker;
})();

function isDelStep(step) {
  return step.name == "replace" && step.from.offset < step.to.offset && _model.Pos.samePath(step.from.path, step.to.path) && step.param.nodes.length == 0;
}

var compressStepCount = 150;

var Branch = (function () {
  function Branch(maxDepth) {
    _classCallCheck(this, Branch);

    this.maxDepth = maxDepth;
    this.version = 0;
    this.nextStepID = 1;

    this.maps = [];
    this.mirror = Object.create(null);
    this.events = [];

    this.stepsSinceCompress = 0;
    this.compressing = null;
    this.compressTimeout = null;
  }

  _createClass(Branch, [{
    key: "clear",
    value: function clear(force) {
      if (force || !this.empty()) {
        this.maps.length = this.events.length = this.stepsSinceCompress = 0;
        this.mirror = Object.create(null);
        this.abortCompression();
      }
    }
  }, {
    key: "newEvent",
    value: function newEvent() {
      this.abortCompression();
      this.events.push([]);
      while (this.events.length > this.maxDepth) this.events.shift();
    }
  }, {
    key: "addMap",
    value: function addMap(map) {
      if (!this.empty()) {
        this.maps.push(map);
        this.version++;
        this.stepsSinceCompress++;
        return true;
      }
    }
  }, {
    key: "empty",
    value: function empty() {
      return this.events.length == 0;
    }
  }, {
    key: "addStep",
    value: function addStep(step, map, id) {
      this.addMap(map);
      if (id == null) id = this.nextStepID++;
      this.events[this.events.length - 1].push(new InvertedStep(step, this.version, id));
    }
  }, {
    key: "addTransform",
    value: function addTransform(transform, ids) {
      this.abortCompression();
      for (var i = 0; i < transform.steps.length; i++) {
        var inverted = transform.steps[i].invert(transform.docs[i], transform.maps[i]);
        this.addStep(inverted, transform.maps[i], ids && ids[i]);
      }
    }
  }, {
    key: "popEvent",
    value: function popEvent(doc, allowCollapsing) {
      this.abortCompression();
      var event = this.events.pop();
      if (!event) return null;

      var remap = new BranchRemapping(this),
          collapsing = allowCollapsing;
      var tr = new _transform.Transform(doc);
      var ids = [];

      for (var i = event.length - 1; i >= 0; i--) {
        var invertedStep = event[i],
            step = invertedStep.step;
        if (!collapsing || invertedStep.version != remap.version) {
          collapsing = false;
          remap.moveToVersion(invertedStep.version);

          step = (0, _transform.mapStep)(step, remap.remap);
          var result = step && tr.step(step);
          if (result) {
            ids.push(invertedStep.id);
            if (this.addMap(result.map)) this.mirror[this.version] = invertedStep.version;
          }

          if (i > 0) remap.movePastStep(result);
        } else {
          this.version--;
          delete this.mirror[this.version];
          this.maps.pop();
          tr.step(step);
          ids.push(invertedStep.id);
          --remap.version;
        }
      }
      if (this.empty()) this.clear(true);
      return { transform: tr, ids: ids };
    }
  }, {
    key: "getVersion",
    value: function getVersion() {
      return { id: this.nextStepID, version: this.version };
    }
  }, {
    key: "findVersion",
    value: function findVersion(version) {
      for (var i = this.events.length - 1; i >= 0; i--) {
        var _event2 = this.events[i];
        for (var j = _event2.length - 1; j >= 0; j--) {
          var step = _event2[j];
          if (step.id == version.id) return { event: i, step: j };else if (step.id < version.id) return { event: i, step: j + 1 };
        }
      }
    }
  }, {
    key: "rebased",
    value: function rebased(newMaps, rebasedTransform, positions) {
      if (this.empty()) return;
      this.abortCompression();

      var startVersion = this.version - positions.length;

      // Update and clean up the events
      out: for (var i = this.events.length - 1; i >= 0; i--) {
        var _event3 = this.events[i];
        for (var j = _event3.length - 1; j >= 0; j--) {
          var step = _event3[j];
          if (step.version <= startVersion) break out;
          var off = positions[step.version - startVersion - 1];
          if (off == -1) {
            _event3.splice(j--, 1);
          } else {
            var inv = rebasedTransform.steps[off].invert(rebasedTransform.docs[off], rebasedTransform.maps[off]);
            _event3[j] = new InvertedStep(inv, startVersion + newMaps.length + off + 1, step.id);
          }
        }
      }

      // Sync the array of maps
      if (this.maps.length > positions.length) this.maps = this.maps.slice(0, this.maps.length - positions.length).concat(newMaps).concat(rebasedTransform.maps);else this.maps = rebasedTransform.maps.slice();

      this.version = startVersion + newMaps.length + rebasedTransform.maps.length;

      this.stepsSinceCompress += newMaps.length + rebasedTransform.steps.length - positions.length;
    }
  }, {
    key: "abortCompression",
    value: function abortCompression() {
      if (this.compressing) {
        this.compressing.abort();
        this.compressing = null;
      }
    }
  }, {
    key: "needsCompression",
    value: function needsCompression() {
      return this.stepsSinceCompress > compressStepCount && !this.compressing;
    }
  }, {
    key: "startCompression",
    value: function startCompression(doc) {
      var _this2 = this;

      this.compressing = new CompressionWorker(doc, this, function (maps, events) {
        _this2.maps = maps;
        _this2.events = events;
        _this2.mirror = Object.create(null);
        _this2.compressing = null;
        _this2.stepsSinceCompress = 0;
      });
      this.compressing.work();
    }
  }]);

  return Branch;
})();

var compressDelay = 750;

var History = (function () {
  function History(pm) {
    var _this3 = this;

    _classCallCheck(this, History);

    this.pm = pm;

    this.done = new Branch(pm.options.historyDepth);
    this.undone = new Branch(pm.options.historyDepth);

    this.lastAddedAt = 0;
    this.ignoreTransform = false;

    this.allowCollapsing = true;

    pm.on("transform", function (transform, options) {
      return _this3.recordTransform(transform, options);
    });
  }

  _createClass(History, [{
    key: "recordTransform",
    value: function recordTransform(transform, options) {
      if (this.ignoreTransform) return;

      if (options.addToHistory == false) {
        for (var i = 0; i < transform.maps.length; i++) {
          var map = transform.maps[i];
          this.done.addMap(map);
          this.undone.addMap(map);
        }
      } else {
        this.undone.clear();
        var now = Date.now();
        if (now > this.lastAddedAt + this.pm.options.historyEventDelay) this.done.newEvent();

        this.done.addTransform(transform);
        this.lastAddedAt = now;
      }
      this.maybeScheduleCompression();
    }
  }, {
    key: "undo",
    value: function undo() {
      return this.shift(this.done, this.undone);
    }
  }, {
    key: "redo",
    value: function redo() {
      return this.shift(this.undone, this.done);
    }
  }, {
    key: "canUndo",
    value: function canUndo() {
      return this.done.events.length > 0;
    }
  }, {
    key: "canRedo",
    value: function canRedo() {
      return this.undone.events.length > 0;
    }
  }, {
    key: "shift",
    value: function shift(from, to) {
      var event = from.popEvent(this.pm.doc, this.allowCollapsing);
      if (!event) return false;
      var transform = event.transform;
      var ids = event.ids;

      this.ignoreTransform = true;
      this.pm.apply(transform);
      this.ignoreTransform = false;

      if (!transform.steps.length) return this.shift(from, to);

      if (to) {
        to.newEvent();
        to.addTransform(transform, ids);
      }
      this.lastAddedAt = 0;

      return true;
    }
  }, {
    key: "getVersion",
    value: function getVersion() {
      return this.done.getVersion();
    }
  }, {
    key: "backToVersion",
    value: function backToVersion(version) {
      var found = this.done.findVersion(version);
      if (!found) return false;
      var event = this.done.events[found.event];
      var combined = this.done.events.slice(found.event + 1).reduce(function (comb, arr) {
        return comb.concat(arr);
      }, event.slice(found.step));
      this.done.events.length = found.event + ((event.length = found.step) ? 1 : 0);
      this.done.events.push(combined);

      this.shift(this.done);
    }
  }, {
    key: "rebased",
    value: function rebased(newMaps, rebasedTransform, positions) {
      this.done.rebased(newMaps, rebasedTransform, positions);
      this.undone.rebased(newMaps, rebasedTransform, positions);
      this.maybeScheduleCompression();
    }
  }, {
    key: "maybeScheduleCompression",
    value: function maybeScheduleCompression() {
      this.maybeScheduleCompressionForBranch(this.done);
      this.maybeScheduleCompressionForBranch(this.undone);
    }
  }, {
    key: "maybeScheduleCompressionForBranch",
    value: function maybeScheduleCompressionForBranch(branch) {
      var _this4 = this;

      window.clearTimeout(branch.compressTimeout);
      if (branch.needsCompression()) branch.compressTimeout = window.setTimeout(function () {
        if (branch.needsCompression()) branch.startCompression(_this4.pm.doc);
      }, compressDelay);
    }
  }]);

  return History;
})();

exports.History = History;

},{"../model":24,"../transform":37}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _main = require("./main");

Object.defineProperty(exports, "ProseMirror", {
  enumerable: true,
  get: function get() {
    return _main.ProseMirror;
  }
});

var _options = require("./options");

Object.defineProperty(exports, "defineOption", {
  enumerable: true,
  get: function get() {
    return _options.defineOption;
  }
});

var _selection = require("./selection");

Object.defineProperty(exports, "Range", {
  enumerable: true,
  get: function get() {
    return _selection.Range;
  }
});

var _event = require("./event");

Object.defineProperty(exports, "eventMixin", {
  enumerable: true,
  get: function get() {
    return _event.eventMixin;
  }
});

var _keys = require("./keys");

Object.defineProperty(exports, "Keymap", {
  enumerable: true,
  get: function get() {
    return _keys.Keymap;
  }
});

var _range = require("./range");

Object.defineProperty(exports, "MarkedRange", {
  enumerable: true,
  get: function get() {
    return _range.MarkedRange;
  }
});

var _commands = require("./commands");

Object.defineProperty(exports, "defineCommand", {
  enumerable: true,
  get: function get() {
    return _commands.defineCommand;
  }
});
Object.defineProperty(exports, "defineParamHandler", {
  enumerable: true,
  get: function get() {
    return _commands.defineParamHandler;
  }
});
Object.defineProperty(exports, "Command", {
  enumerable: true,
  get: function get() {
    return _commands.Command;
  }
});

},{"./commands":5,"./event":9,"./keys":13,"./main":14,"./options":15,"./range":16,"./selection":17}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.dispatchKey = dispatchKey;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _parseDom = require("../parse/dom");

var _dom = require("../dom");

var _serializeDom = require("../serialize/dom");

var _serializeText = require("../serialize/text");

var _parse = require("../parse");

var _keys = require("./keys");

var _capturekeys = require("./capturekeys");

var _domchange = require("./domchange");

var _selection = require("./selection");

var stopSeq = null;

/**
 * A collection of DOM events that occur within the editor, and callback functions
 * to invoke when the event fires.
 */
var handlers = {};

var Input = (function () {
  function Input(pm) {
    var _this = this;

    _classCallCheck(this, Input);

    this.pm = pm;

    this.keySeq = null;

    // When the user is creating a composed character,
    // this is set to a Composing instance.
    this.composing = null;
    this.shiftKey = this.updatingComposition = false;
    this.skipInput = 0;

    this.draggingFrom = false;

    this.keymaps = [];

    this.storedStyles = null;

    this.dropTarget = pm.wrapper.appendChild((0, _dom.elt)("div", { "class": "ProseMirror-drop-target" }));

    var _loop = function (_event) {
      var handler = handlers[_event];
      pm.content.addEventListener(_event, function (e) {
        return handler(pm, e);
      });
    };

    for (var _event in handlers) {
      _loop(_event);
    }

    pm.on("selectionChange", function () {
      return _this.storedStyles = null;
    });
  }

  /**
   * Dispatch a key press to the internal keymaps, which will override the default
   * DOM behavior.
   *
   * @param  {ProseMirror}   pm The editor instance.
   * @param  {string}        name The name of the key pressed.
   * @param  {KeyboardEvent} e
   * @return {string} If the key name has a mapping and the callback is invoked ("handled"),
   *                  if the key name needs to be combined in sequence with the next key ("multi"),
   *                  if there is no mapping ("nothing").
   */

  _createClass(Input, [{
    key: "maybeAbortComposition",
    value: function maybeAbortComposition() {
      if (this.composing && !this.updatingComposition) {
        if (this.composing.finished) {
          finishComposing(this.pm);
        } else {
          // Toggle selection to force end of composition
          this.composing = null;
          this.skipInput++;
          var sel = getSelection();
          if (sel.rangeCount) {
            var range = sel.getRangeAt(0);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
        return true;
      }
    }
  }]);

  return Input;
})();

exports.Input = Input;

function dispatchKey(pm, name, e) {
  var seq = pm.input.keySeq;
  // If the previous key should be used in sequence with this one, modify the name accordingly.
  if (seq) {
    if ((0, _keys.isModifierKey)(name)) return true;
    clearTimeout(stopSeq);
    stopSeq = setTimeout(function () {
      if (pm.input.keySeq == seq) pm.input.keySeq = null;
    }, 50);
    name = seq + " " + name;
  }

  var handle = function handle(bound) {
    var result = false;
    if (Array.isArray(bound)) {
      for (var i = 0; result === false && i < bound.length; i++) {
        result = handle(bound[i]);
      }
    } else if (typeof bound == "string") {
      result = pm.execCommand(bound);
    } else {
      result = bound(pm);
    }
    return result !== false;
  };

  var result = undefined;
  for (var i = 0; !result && i < pm.input.keymaps.length; i++) {
    result = (0, _keys.lookupKey)(name, pm.input.keymaps[i].map, handle, pm);
  }if (!result) result = (0, _keys.lookupKey)(name, pm.options.keymap, handle, pm) || (0, _keys.lookupKey)(name, _capturekeys.captureKeys, handle, pm);

  // If the key should be used in sequence with the next key, store the keyname internally.
  if (result == "multi") pm.input.keySeq = name;

  if (result == "handled" || result == "multi") e.preventDefault();

  if (seq && !result && /\'$/.test(name)) {
    e.preventDefault();
    return true;
  }
  return !!result;
}

handlers.keydown = function (pm, e) {
  if (e.keyCode == 16) pm.input.shiftKey = true;
  if (pm.input.composing) return;
  var name = (0, _keys.keyName)(e);
  if (name && dispatchKey(pm, name, e)) return;
  pm.sel.pollForUpdate();
};

handlers.keyup = function (pm, e) {
  if (e.keyCode == 16) pm.input.shiftKey = false;
};

function inputText(pm, range, text) {
  if (range.empty && !text) return false;
  var styles = pm.input.storedStyles || (0, _model.spanStylesAt)(pm.doc, range.from);
  var tr = pm.tr;
  tr.replaceWith(range.from, range.to, pm.schema.text(text, styles)).apply();
  pm.scrollIntoView();
}

handlers.keypress = function (pm, e) {
  if (pm.input.composing || !e.charCode || e.ctrlKey && !e.altKey || _dom.browser.mac && e.metaKey) return;
  var ch = String.fromCharCode(e.charCode);
  if (dispatchKey(pm, "'" + ch + "'", e)) return;
  var sel = pm.selection;
  if (sel.node && sel.node.contains == null) {
    pm.tr["delete"](sel.from, sel.to).apply();
    sel = pm.selection;
  }
  inputText(pm, sel, ch);
  e.preventDefault();
};

function selectClickedNode(pm, e) {
  var pos = (0, _selection.selectableNodeAbove)(pm, e.target, { left: e.clientX, top: e.clientY }, true);
  if (!pos) return pm.sel.pollForUpdate();

  var _pm$selection = pm.selection;
  var node = _pm$selection.node;
  var from = _pm$selection.from;

  if (node && pos.depth >= from.depth && pos.shorten(from.depth).cmp(from) == 0) {
    if (from.depth == 0) return pm.sel.pollForUpdate();
    pos = from.shorten();
  }

  pm.setNodeSelection(pos);
  pm.focus();
  e.preventDefault();
}

var lastClick = 0;

handlers.mousedown = function (pm, e) {
  if (e.ctrlKey) return selectClickedNode(pm, e);

  pm.sel.pollForUpdate();

  var now = Date.now(),
      multi = now - lastClick < 500;
  lastClick = now;
  if (pm.input.shiftKey || multi) return;

  var x = e.clientX,
      y = e.clientY;
  var done = function done() {
    removeEventListener("mouseup", up);
    removeEventListener("mousemove", move);
  };
  var up = function up() {
    done();
    var pos = (0, _selection.selectableNodeAbove)(pm, e.target, { left: e.clientX, top: e.clientY });
    if (pos) {
      pm.setNodeSelection(pos);
      pm.focus();
    }
  };
  var move = function move(e) {
    if (Math.abs(x - e.clientX) > 4 || Math.abs(y - e.clientY) > 4) done();
  };
  addEventListener("mouseup", up);
  addEventListener("mousemove", move);
};

handlers.touchdown = function (pm) {
  pm.sel.pollForUpdate();
};

handlers.mousemove = function (pm, e) {
  if (e.which || e.button) pm.sel.pollForUpdate();
};

/**
 * A class to track state while creating a composed character.
 */

var Composing = function Composing(pm, data) {
  _classCallCheck(this, Composing);

  this.finished = false;
  this.context = (0, _domchange.textContext)(data);
  this.data = data;
  this.endData = null;
  var range = pm.selection;
  if (data) {
    var path = range.head.path,
        line = pm.doc.path(path).textContent;
    var found = line.indexOf(data, range.head.offset - data.length);
    if (found > -1 && found <= range.head.offset + data.length) range = new _selection.TextSelection(new _model.Pos(path, found), new _model.Pos(path, found + data.length));
  }
  this.range = range;
};

handlers.compositionstart = function (pm, e) {
  if (pm.input.maybeAbortComposition()) return;

  pm.flush();
  pm.input.composing = new Composing(pm, e.data);
  var above = pm.selection.head.shorten();
  pm.markRangeDirty({ from: above, to: above.move(1) });
};

handlers.compositionupdate = function (pm, e) {
  var info = pm.input.composing;
  if (info && info.data != e.data) {
    info.data = e.data;
    pm.input.updatingComposition = true;
    inputText(pm, info.range, info.data);
    pm.input.updatingComposition = false;
    info.range = new _selection.TextSelection(info.range.from, info.range.from.move(info.data.length));
  }
};

handlers.compositionend = function (pm, e) {
  var info = pm.input.composing;
  if (info) {
    pm.input.composing.finished = true;
    pm.input.composing.endData = e.data;
    setTimeout(function () {
      if (pm.input.composing == info) finishComposing(pm);
    }, 20);
  }
};

function finishComposing(pm) {
  var info = pm.input.composing;
  var text = (0, _domchange.textInContext)(info.context, info.endData);
  var range = (0, _selection.rangeFromDOMLoose)(pm);
  pm.ensureOperation();
  pm.input.composing = null;
  if (text != info.data) inputText(pm, info.range, text);
  if (range && !range.eq(pm.sel.range)) pm.setSelection(range);
}

handlers.input = function (pm) {
  if (pm.input.skipInput) return --pm.input.skipInput;

  if (pm.input.composing) {
    if (pm.input.composing.finished) finishComposing(pm);
    return;
  }

  (0, _domchange.applyDOMChange)(pm);
  pm.scrollIntoView();
};

var lastCopied = null;

handlers.copy = handlers.cut = function (pm, e) {
  var _pm$selection2 = pm.selection;
  var from = _pm$selection2.from;
  var to = _pm$selection2.to;
  var empty = _pm$selection2.empty;

  if (empty) return;
  var fragment = pm.selectedDoc;
  lastCopied = { doc: pm.doc, from: from, to: to,
    html: (0, _serializeDom.toHTML)(fragment),
    text: (0, _serializeText.toText)(fragment) };

  if (e.clipboardData) {
    e.preventDefault();
    e.clipboardData.clearData();
    e.clipboardData.setData("text/html", lastCopied.html);
    e.clipboardData.setData("text/plain", lastCopied.text);
    if (e.type == "cut" && !empty) pm.tr["delete"](from, to).apply();
  }
};

function docSide(doc, side) {
  var path = [];
  for (var node = doc; node; node = side == "end" ? node.lastChild : node.firstChild) {
    var nextOff = side == "end" ? node.maxOffset : 0;
    if (node.isTextblock) return new _model.Pos(path, nextOff);
    if (node.type.contains == null && node.type.selectable) return _model.Pos.from(path);
    path.push(nextOff);
  }
}

handlers.paste = function (pm, e) {
  if (!e.clipboardData) return;
  var sel = pm.selection;
  var txt = e.clipboardData.getData("text/plain");
  var html = e.clipboardData.getData("text/html");
  if (html || txt) {
    e.preventDefault();
    var doc = undefined,
        from = undefined,
        to = undefined;
    if (pm.input.shiftKey && txt) {
      (function () {
        var paragraphs = txt.split(/[\r\n]+/);
        var styles = (0, _model.spanStylesAt)(pm.doc, sel.from);
        doc = pm.schema.node("doc", null, paragraphs.map(function (s) {
          return pm.schema.node("paragraph", null, [pm.schema.text(s, styles)]);
        }));
      })();
    } else if (lastCopied && (lastCopied.html == html || lastCopied.text == txt)) {
      ;var _lastCopied = lastCopied;
      doc = _lastCopied.doc;
      from = _lastCopied.from;
      to = _lastCopied.to;
    } else if (html) {
      doc = (0, _parseDom.fromHTML)(pm.schema, html);
    } else {
      doc = (0, _parse.convertFrom)(pm.schema, txt, (0, _parse.knownSource)("markdown") ? "markdown" : "text");
    }
    pm.tr.replace(sel.from, sel.to, doc, from || docSide(doc, "start"), to || docSide(doc, "end")).apply();
    pm.scrollIntoView();
  }
};

handlers.dragstart = function (pm, e) {
  if (!e.dataTransfer) return;

  var fragment = pm.selectedDoc;

  e.dataTransfer.setData("text/html", (0, _serializeDom.toHTML)(fragment));
  e.dataTransfer.setData("text/plain", (0, _serializeText.toText)(fragment));
  pm.input.draggingFrom = true;
};

handlers.dragend = function (pm) {
  return window.setTimeout(function () {
    return pm.input.dragginFrom = false;
  }, 50);
};

handlers.dragover = handlers.dragenter = function (pm, e) {
  e.preventDefault();
  var cursorPos = pm.posAtCoords({ left: e.clientX, top: e.clientY });
  if (!cursorPos) return;
  var coords = (0, _selection.coordsAtPos)(pm, cursorPos);
  var rect = pm.wrapper.getBoundingClientRect();
  coords.top -= rect.top;
  coords.right -= rect.left;
  coords.bottom -= rect.top;
  coords.left -= rect.left;
  var target = pm.input.dropTarget;
  target.style.display = "block";
  target.style.left = coords.left - 1 + "px";
  target.style.top = coords.top + "px";
  target.style.height = coords.bottom - coords.top + "px";
};

handlers.dragleave = function (pm) {
  return pm.input.dropTarget.style.display = "";
};

handlers.drop = function (pm, e) {
  pm.input.dropTarget.style.display = "";

  if (!e.dataTransfer) return;

  var html = undefined,
      txt = undefined,
      doc = undefined;
  if (html = e.dataTransfer.getData("text/html")) doc = (0, _parseDom.fromHTML)(pm.schema, html, { document: document });else if (txt = e.dataTransfer.getData("text/plain")) doc = (0, _parse.convertFrom)(pm.schema, txt, (0, _parse.knownSource)("markdown") ? "markdown" : "text");

  if (doc) {
    e.preventDefault();
    var insertPos = pm.posAtCoords({ left: e.clientX, top: e.clientY });
    if (!insertPos) return;
    var tr = pm.tr;
    if (pm.input.draggingFrom && !e.ctrlKey) {
      tr.deleteSelection();
      insertPos = tr.map(insertPos).pos;
    }
    tr.replace(insertPos, insertPos, doc, docSide(doc, "start"), docSide(doc, "end")).apply();
    pm.setSelection(insertPos, tr.map(insertPos).pos);
    pm.focus();
  }
};

handlers.focus = function (pm) {
  (0, _dom.addClass)(pm.wrapper, "ProseMirror-focused");
  pm.signal("focus");
};

handlers.blur = function (pm) {
  (0, _dom.rmClass)(pm.wrapper, "ProseMirror-focused");
  pm.signal("blur");
};

},{"../dom":2,"../model":24,"../parse":31,"../parse/dom":30,"../serialize/dom":33,"../serialize/text":35,"./capturekeys":3,"./domchange":7,"./keys":13,"./selection":17}],13:[function(require,module,exports){
// From CodeMirror, should be factored into its own NPM module

// declare_global: navigator
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.keyName = keyName;
exports.isModifierKey = isModifierKey;
exports.normalizeKeyName = normalizeKeyName;
exports.lookupKey = lookupKey;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;

/**
 * A map of KeyboardEvent keycodes to key names.
 *
 * @type {Array}
 */
var names = {
  3: "Enter", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
  19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
  36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
  46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
  106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 127: "Delete",
  173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
  221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
  63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
};

exports.names = names;
// Number keys
for (var i = 0; i < 10; i++) {
  names[i + 48] = names[i + 96] = String(i);
} // Alphabetic keys
for (var i = 65; i <= 90; i++) {
  names[i] = String.fromCharCode(i);
} // Function keys
for (var i = 1; i <= 12; i++) {
  names[i + 111] = names[i + 63235] = "F" + i;
} /**
   * Given a keypress event, get the key name.
   *
   * @param  {KeyboardEvent} event   The keypress event.
   * @param  {Boolean}       noShift
   * @return {string}                The key name.
   */

function keyName(event, noShift) {
  var base = names[event.keyCode],
      name = base;
  if (name == null || event.altGraphKey) return false;

  if (event.altKey && base != "Alt") name = "Alt-" + name;
  if (event.ctrlKey && base != "Ctrl") name = "Ctrl-" + name;
  if (event.metaKey && base != "Cmd") name = "Cmd-" + name;
  if (!noShift && event.shiftKey && base != "Shift") name = "Shift-" + name;
  return name;
}

function isModifierKey(value) {
  var name = typeof value == "string" ? value : names[value.keyCode];
  return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod";
}

function normalizeKeyName(fullName) {
  var parts = fullName.split(/-(?!'?$)/),
      name = parts[parts.length - 1];
  var alt = undefined,
      ctrl = undefined,
      shift = undefined,
      cmd = undefined;
  for (var i = 0; i < parts.length - 1; i++) {
    var mod = parts[i];
    if (/^(cmd|meta|m)$/i.test(mod)) cmd = true;else if (/^a(lt)?$/i.test(mod)) alt = true;else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true;else if (/^s(hift)$/i.test(mod)) shift = true;else if (/^mod$/i.test(mod)) {
      if (mac) cmd = true;else ctrl = true;
    } else throw new Error("Unrecognized modifier name: " + mod);
  }
  if (alt) name = "Alt-" + name;
  if (ctrl) name = "Ctrl-" + name;
  if (cmd) name = "Cmd-" + name;
  if (shift) name = "Shift-" + name;
  return name;
}

/**
 * A group of bindings of key names and editor commands,
 * which override the default key press event behavior in the editor's DOM.
 */

var Keymap = (function () {
  function Keymap(keys, options) {
    _classCallCheck(this, Keymap);

    this.options = options || {};
    this.bindings = Object.create(null);
    if (keys) for (var keyname in keys) {
      if (Object.prototype.hasOwnProperty.call(keys, keyname)) this.addBinding(keyname, keys[keyname]);
    }
  }

  /**
   * Lookup a key name in a KeyMap, and pass the mapped value to a handler.
   *
   * @param {string}   key     The key name.
   * @param {Keymap}   map     The key map. If the keymap has an options.call method,
   *                           that will be invoked to get the mapped value.
   * @param {Function} handle  Callback
   * @param {Object}   context
   * @return {string} If the key name has a mapping and the callback is invoked ("handled"),
   *                  if the key name needs to be combined in sequence with the next key ("multi"),
   *                  if there is no mapping ("nothing").
   */

  _createClass(Keymap, [{
    key: "addBinding",
    value: function addBinding(keyname, value) {
      var keys = keyname.split(" ").map(normalizeKeyName);
      for (var i = 0; i < keys.length; i++) {
        var _name = keys.slice(0, i + 1).join(" ");
        var val = i == keys.length - 1 ? value : "...";
        var prev = this.bindings[_name];
        if (!prev) this.bindings[_name] = val;else if (prev != val) throw new Error("Inconsistent bindings for " + _name);
      }
    }
  }, {
    key: "removeBinding",
    value: function removeBinding(keyname) {
      var keys = keyname.split(" ").map(normalizeKeyName);
      for (var i = keys.length - 1; i >= 0; i--) {
        var _name2 = keys.slice(0, i).join(" ");
        var val = this.bindings[_name2];
        if (val == "..." && !this.unusedMulti(_name2)) break;else if (val) delete this.bindings[_name2];
      }
    }
  }, {
    key: "unusedMulti",
    value: function unusedMulti(name) {
      for (var binding in this.bindings) {
        if (binding.length > name && binding.indexOf(name) == 0 && binding.charAt(name.length) == " ") return false;
      }return true;
    }
  }]);

  return Keymap;
})();

exports.Keymap = Keymap;

function lookupKey(_x, _x2, _x3, _x4) {
  var _again = true;

  _function: while (_again) {
    var key = _x,
        map = _x2,
        handle = _x3,
        context = _x4;
    _again = false;

    var found = map.options.call ? map.options.call(key, context) : map.bindings[key];
    if (found === false) return "nothing";
    if (found === "...") return "multi";
    if (found != null && handle(found)) return "handled";

    var fall = map.options.fallthrough;
    if (fall) {
      if (!Array.isArray(fall)) {
        _x = key;
        _x2 = fall;
        _x3 = handle;
        _x4 = context;
        _again = true;
        found = fall = undefined;
        continue _function;
      }
      for (var i = 0; i < fall.length; i++) {
        var result = lookupKey(key, fall[i], handle, context);
        if (result) return result;
      }
    }
  }
}

},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x4, _x5, _x6) { var _again = true; _function: while (_again) { var object = _x4, property = _x5, receiver = _x6; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x4 = parent; _x5 = property; _x6 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require("./css");

var _model = require("../model");

var _transform = require("../transform");

var _utilSortedinsert = require("../util/sortedinsert");

var _utilSortedinsert2 = _interopRequireDefault(_utilSortedinsert);

var _utilMap = require("../util/map");

var _options = require("./options");

var _selection2 = require("./selection");

var _dom = require("../dom");

var _draw = require("./draw");

var _input = require("./input");

var _history = require("./history");

var _event = require("./event");

var _serializeText = require("../serialize/text");

require("../parse/text");

var _parse = require("../parse");

var _serialize = require("../serialize");

var _commands = require("./commands");

var _range = require("./range");

var _keys = require("./keys");

/**
 * ProseMirror editor class.
 * @class
 */

var ProseMirror = (function () {
  /**
   * @param {Object} opts        Instance options hash.
   * @param {Object} opts.schema The document model schema for the editor instance.
   * @param {Object} opts.doc    The document model for the instance. Optional.
   */

  function ProseMirror(opts) {
    _classCallCheck(this, ProseMirror);

    opts = this.options = (0, _options.parseOptions)(opts);
    this.schema = opts.schema;
    if (opts.doc == null) opts.doc = this.schema.node("doc", null, [this.schema.node("paragraph")]);
    this.content = (0, _dom.elt)("div", { "class": "ProseMirror-content" });
    this.wrapper = (0, _dom.elt)("div", { "class": "ProseMirror" }, this.content);
    this.wrapper.ProseMirror = this;

    if (opts.place && opts.place.appendChild) opts.place.appendChild(this.wrapper);else if (opts.place) opts.place(this.wrapper);

    this.setDocInner(opts.docFormat ? (0, _parse.convertFrom)(this.schema, opts.doc, opts.docFormat, { document: document }) : opts.doc);
    (0, _draw.draw)(this, this.doc);
    this.content.contentEditable = true;

    this.mod = Object.create(null);
    this.operation = null;
    this.dirtyNodes = new _utilMap.Map(); // Maps node object to 1 (re-scan content) or 2 (redraw entirely)
    this.flushScheduled = false;

    this.sel = new _selection2.SelectionState(this);
    this.input = new _input.Input(this);

    this.commands = (0, _commands.initCommands)(this.schema);
    this.commandKeys = Object.create(null);

    (0, _options.initOptions)(this);
  }

  /**
   * @return {Range} The instance of the editor's selection range.
   */

  _createClass(ProseMirror, [{
    key: "apply",

    /**
     * Apply a transform on the editor.
     */
    value: function apply(transform) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? nullOptions : arguments[1];

      if (transform.doc == this.doc) return false;
      if (transform.docs[0] != this.doc && (0, _model.findDiffStart)(transform.docs[0], this.doc)) throw new Error("Applying a transform that does not start with the current document");

      this.updateDoc(transform.doc, transform, options.selection);
      this.signal("transform", transform, options);
      if (options.scrollIntoView) this.scrollIntoView();
      return transform;
    }

    /**
     * @return {Transform} A new transform object.
     */
  }, {
    key: "setContent",
    value: function setContent(value, format) {
      if (format) value = (0, _parse.convertFrom)(this.schema, value, format);
      this.setDoc(value);
    }
  }, {
    key: "getContent",
    value: function getContent(format) {
      return format ? (0, _serialize.convertTo)(this.doc, format) : this.doc;
    }
  }, {
    key: "setDocInner",
    value: function setDocInner(doc) {
      if (doc.type != this.schema.nodes.doc) throw new Error("Trying to set a document with a different schema");
      this.doc = doc;
      this.ranges = new _range.RangeStore(this);
      this.history = new _history.History(this);
    }
  }, {
    key: "setDoc",
    value: function setDoc(doc, sel) {
      if (!sel) sel = (0, _selection2.findSelectionAtStart)(doc);
      this.signal("beforeSetDoc", doc, sel);
      this.ensureOperation();
      this.setDocInner(doc);
      this.sel.set(sel, true);
      this.signal("setDoc", doc, sel);
    }
  }, {
    key: "updateDoc",
    value: function updateDoc(doc, mapping, selection) {
      this.ensureOperation();
      this.input.maybeAbortComposition();
      this.ranges.transform(mapping);
      this.doc = doc;
      this.sel.setAndSignal(selection || this.sel.range.map(doc, mapping));
      this.signal("change");
    }
  }, {
    key: "checkPos",
    value: function checkPos(pos, block) {
      if (!this.doc.isValidPos(pos, block)) throw new Error("Position " + pos + " is not valid in current document");
    }
  }, {
    key: "setSelection",
    value: function setSelection(rangeOrAnchor, head) {
      var range = rangeOrAnchor;
      if (!(range instanceof _selection2.Selection)) range = new _selection2.TextSelection(rangeOrAnchor, head);
      if (range instanceof _selection2.TextSelection) {
        this.checkPos(range.head, true);
        this.checkPos(range.anchor, true);
      } else {
        this.checkPos(range.from, false);
        this.checkPos(range.to, false);
      }
      this.ensureOperation();
      this.input.maybeAbortComposition();
      if (!range.eq(this.sel.range)) this.sel.setAndSignal(range);
    }
  }, {
    key: "setNodeSelection",
    value: function setNodeSelection(pos) {
      this.checkPos(pos, false);
      var parent = this.doc.path(pos.path);
      if (pos.offset >= parent.maxOffset) throw new Error("Trying to set a node selection at the end of a node");
      var node = parent.isTextblock ? parent.childAfter(pos.offset).node : parent.child(pos.offset);
      this.input.maybeAbortComposition();
      this.sel.setAndSignal(new _selection2.NodeSelection(pos, pos.move(1), node));
    }
  }, {
    key: "ensureOperation",
    value: function ensureOperation() {
      return this.operation || this.startOperation();
    }
  }, {
    key: "startOperation",
    value: function startOperation() {
      var _this = this;

      this.sel.beforeStartOp();
      this.operation = new Operation(this);
      if (!this.flushScheduled) {
        (0, _dom.requestAnimationFrame)(function () {
          _this.flushScheduled = false;
          _this.flush();
        });
        this.flushScheduled = true;
      }
      return this.operation;
    }
  }, {
    key: "flush",
    value: function flush() {
      var op = this.operation;
      if (!op || !document.body.contains(this.wrapper)) return;
      this.operation = null;

      var docChanged = op.doc != this.doc || this.dirtyNodes.size,
          redrawn = false;
      if (!this.input.composing && (docChanged || op.composingAtStart)) {
        (0, _draw.redraw)(this, this.dirtyNodes, this.doc, op.doc);
        this.dirtyNodes.clear();
        redrawn = true;
      }

      if ((redrawn || !op.sel.eq(this.sel.range)) && !this.input.composing) this.sel.toDOM(op.focus);

      if (op.scrollIntoView !== false) (0, _selection2.scrollIntoView)(this, op.scrollIntoView);
      if (docChanged) this.signal("draw");
      this.signal("flush");
    }
  }, {
    key: "setOption",
    value: function setOption(name, value) {
      (0, _options.setOption)(this, name, value);
    }
  }, {
    key: "getOption",
    value: function getOption(name) {
      return this.options[name];
    }
  }, {
    key: "addKeymap",
    value: function addKeymap(map) {
      var rank = arguments.length <= 1 || arguments[1] === undefined ? 50 : arguments[1];

      (0, _utilSortedinsert2["default"])(this.input.keymaps, { map: map, rank: rank }, function (a, b) {
        return a.rank - b.rank;
      });
    }
  }, {
    key: "removeKeymap",
    value: function removeKeymap(map) {
      var maps = this.input.keymaps;
      for (var i = 0; i < maps.length; ++i) {
        if (maps[i].map == map || maps[i].map.options.name == map) {
          maps.splice(i, 1);
          return true;
        }
      }
    }
  }, {
    key: "markRange",
    value: function markRange(from, to, options) {
      this.checkPos(from);
      this.checkPos(to);
      var range = new _range.MarkedRange(from, to, options);
      this.ranges.addRange(range);
      return range;
    }
  }, {
    key: "removeRange",
    value: function removeRange(range) {
      this.ranges.removeRange(range);
    }
  }, {
    key: "setStyle",
    value: function setStyle(type, to, attrs) {
      var sel = this.selection;
      if (sel.empty) {
        var styles = this.activeStyles();
        if (to == null) to = !(0, _model.containsStyle)(styles, type);
        if (to && !this.doc.path(sel.head.path).type.canContainStyle(type)) return;
        this.input.storedStyles = to ? type.create(attrs).addToSet(styles) : (0, _model.removeStyle)(styles, type);
        this.signal("activeStyleChange");
      } else {
        if (to != null ? to : !(0, _model.rangeHasStyle)(this.doc, sel.from, sel.to, type)) this.apply(this.tr.addStyle(sel.from, sel.to, type.create(attrs)));else this.apply(this.tr.removeStyle(sel.from, sel.to, type));
      }
    }
  }, {
    key: "activeStyles",
    value: function activeStyles() {
      return this.input.storedStyles || (0, _model.spanStylesAt)(this.doc, this.selection.head);
    }
  }, {
    key: "focus",
    value: function focus() {
      if (this.operation) this.operation.focus = true;else this.sel.toDOM(true);
    }
  }, {
    key: "hasFocus",
    value: function hasFocus() {
      if (this.sel.range instanceof _selection2.NodeSelection) return document.activeElement == this.content;else return (0, _selection2.hasFocus)(this);
    }
  }, {
    key: "posAtCoords",
    value: function posAtCoords(coords) {
      return (0, _selection2.posAtCoords)(this, coords);
    }
  }, {
    key: "coordsAtPos",
    value: function coordsAtPos(pos) {
      this.checkPos(pos);
      return (0, _selection2.coordsAtPos)(this, pos);
    }
  }, {
    key: "scrollIntoView",
    value: function scrollIntoView() {
      var pos = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

      if (pos) this.checkPos(pos);
      this.ensureOperation();
      this.operation.scrollIntoView = pos;
    }
  }, {
    key: "execCommand",
    value: function execCommand(name, params) {
      var cmd = this.commands[name];
      return !!(cmd && cmd.exec(this, params) !== false);
    }
  }, {
    key: "keyForCommand",
    value: function keyForCommand(name) {
      var cached = this.commandKeys[name];
      if (cached !== undefined) return cached;

      var cmd = this.commands[name];
      if (!cmd) return this.commandKeys[name] = null;
      var key = cmd.info.key || (_dom.browser.mac ? cmd.info.macKey : cmd.info.pcKey);
      if (key) {
        key = (0, _keys.normalizeKeyName)(Array.isArray(key) ? key[0] : key);
        var deflt = this.options.keymap.bindings[key];
        if (Array.isArray(deflt) ? deflt.indexOf(name) > -1 : deflt == name) return this.commandKeys[name] = key;
      }
      for (var _key in this.options.keymap.bindings) {
        var bound = this.options.keymap.bindings[_key];
        if (Array.isArray(bound) ? bound.indexOf(name) > -1 : bound == name) return this.commandKeys[name] = _key;
      }
      return this.commandKeys[name] = null;
    }
  }, {
    key: "markRangeDirty",
    value: function markRangeDirty(range) {
      this.ensureOperation();
      var dirty = this.dirtyNodes;
      var from = range.from,
          to = range.to;
      for (var depth = 0, node = this.doc;; depth++) {
        var fromEnd = depth == from.depth,
            toEnd = depth == to.depth;
        if (!fromEnd && !toEnd && from.path[depth] == to.path[depth]) {
          var child = node.child(from.path[depth]);
          if (!dirty.has(child)) dirty.set(child, 1);
          node = child;
        } else {
          var start = fromEnd ? from.offset : from.path[depth];
          var end = toEnd ? to.offset : to.path[depth] + 1;
          if (node.isTextblock) {
            for (var offset = 0, i = 0; offset < end; i++) {
              var child = node.child(i);
              offset += child.offset;
              if (offset > start) dirty.set(child, 2);
            }
          } else {
            for (var i = start; i < end; i++) {
              dirty.set(node.child(i), 2);
            }
          }
          break;
        }
      }
    }
  }, {
    key: "selection",
    get: function get() {
      this.ensureOperation();
      return this.sel.range;
    }
  }, {
    key: "selectedDoc",
    get: function get() {
      var sel = this.selection;
      return (0, _model.sliceBetween)(this.doc, sel.from, sel.to);
    }
  }, {
    key: "selectedText",
    get: function get() {
      return (0, _serializeText.toText)(this.selectedDoc);
    }
  }, {
    key: "tr",
    get: function get() {
      return new EditorTransform(this);
    }
  }]);

  return ProseMirror;
})();

exports.ProseMirror = ProseMirror;

var nullOptions = {};

(0, _event.eventMixin)(ProseMirror);

var Operation = function Operation(pm) {
  _classCallCheck(this, Operation);

  this.doc = pm.doc;
  this.sel = pm.sel.range;
  this.scrollIntoView = false;
  this.focus = false;
  this.composingAtStart = !!pm.input.composing;
};

var EditorTransform = (function (_Transform) {
  _inherits(EditorTransform, _Transform);

  function EditorTransform(pm) {
    _classCallCheck(this, EditorTransform);

    _get(Object.getPrototypeOf(EditorTransform.prototype), "constructor", this).call(this, pm.doc);
    this.pm = pm;
  }

  _createClass(EditorTransform, [{
    key: "apply",
    value: function apply(options) {
      return this.pm.apply(this, options);
    }
  }, {
    key: "replaceSelection",
    value: function replaceSelection(node, inheritStyles) {
      var _selection = this.selection;
      var empty = _selection.empty;
      var from = _selection.from;
      var to = _selection.to;
      var selNode = _selection.node;var parent = undefined;
      if (node && node.isInline && inheritStyles !== false) {
        var styles = empty ? this.pm.input.storedStyles : (0, _model.spanStylesAt)(this.doc, from);
        node = node.type.create(node.attrs, node.text, styles);
      }

      if (selNode && selNode.isTextblock && node && node.isInline) {
        // Putting inline stuff onto a selected textblock puts it inside
        from = new _model.Pos(from.toPath(), 0);
        to = new _model.Pos(from.path, selNode.maxOffset);
      } else if (selNode) {
        // This node can not simply be removed/replaced. Remove its parent as well
        while (from.depth && from.offset == 0 && (parent = this.doc.path(from.path)) && from.offset == parent.maxOffset - 1 && !parent.type.canBeEmpty && !(node && parent.type.canContain(node))) {
          from = from.shorten();
          to = to.shorten(null, 1);
        }
      } else if (node && node.isBlock && this.doc.path(from.path.slice(0, from.depth - 1)).type.canContain(node)) {
        // Inserting a block node into a textblock. Try to insert it above by splitting the textblock
        this["delete"](from, to);
        var _parent = this.doc.path(from.path);
        if (from.offset && from.offset != _parent.maxOffset) this.split(from);
        return this.insert(from.shorten(null, from.offset ? 1 : 0), node);
      }

      if (node) return this.replaceWith(from, to, node);else return this["delete"](from, to);
    }
  }, {
    key: "deleteSelection",
    value: function deleteSelection() {
      return this.replaceSelection();
    }
  }, {
    key: "typeText",
    value: function typeText(text) {
      return this.replaceSelection(this.pm.schema.text(text), true);
    }
  }, {
    key: "selection",
    get: function get() {
      return this.steps.length ? this.pm.selection.map(this) : this.pm.selection;
    }
  }]);

  return EditorTransform;
})(_transform.Transform);

},{"../dom":2,"../model":24,"../parse":31,"../parse/text":32,"../serialize":34,"../serialize/text":35,"../transform":37,"../util/map":48,"../util/sortedinsert":49,"./commands":5,"./css":6,"./draw":8,"./event":9,"./history":10,"./input":12,"./keys":13,"./options":15,"./range":16,"./selection":17}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defineOption = defineOption;
exports.parseOptions = parseOptions;
exports.initOptions = initOptions;
exports.setOption = setOption;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _commands = require("./commands");

var Option = function Option(defaultValue, update, updateOnInit) {
  _classCallCheck(this, Option);

  this.defaultValue = defaultValue;
  this.update = update;
  this.updateOnInit = updateOnInit !== false;
};

var options = {
  __proto__: null,

  schema: new Option(_model.defaultSchema, false, false),

  doc: new Option(null, function (pm, value) {
    pm.setDoc(value);
  }, false),

  docFormat: new Option(null),

  place: new Option(null),

  keymap: new Option(null, function (pm, value) {
    if (!value) pm.options.keymap = (0, _commands.defaultKeymap)(pm);
  }),

  historyDepth: new Option(50),

  historyEventDelay: new Option(500),

  commandParamHandler: new Option("default")
};

function defineOption(name, defaultValue, update, updateOnInit) {
  options[name] = new Option(defaultValue, update, updateOnInit);
}

function parseOptions(obj) {
  var result = Object.create(null);
  var given = obj ? [obj].concat(obj.use || []) : [];
  outer: for (var opt in options) {
    for (var i = 0; i < given.length; i++) {
      if (opt in given[i]) {
        result[opt] = given[i][opt];
        continue outer;
      }
    }
    result[opt] = options[opt].defaultValue;
  }
  return result;
}

function initOptions(pm) {
  for (var opt in options) {
    var desc = options[opt];
    if (desc.update && desc.updateOnInit) desc.update(pm, pm.options[opt], null, true);
  }
}

function setOption(pm, name, value) {
  var desc = options[name];
  if (desc.update === false) throw new Error("Option '" + name + "' can not be changed");
  var old = pm.options[name];
  pm.options[name] = value;
  if (desc.update) desc.update(pm, value, old, false);
}

},{"../model":24,"./commands":5}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _event = require("./event");

var MarkedRange = (function () {
  function MarkedRange(from, to, options) {
    _classCallCheck(this, MarkedRange);

    this.options = options || {};
    this.from = from;
    this.to = to;
  }

  _createClass(MarkedRange, [{
    key: "clear",
    value: function clear() {
      this.signal("removed", this.from);
      this.from = this.to = null;
    }
  }]);

  return MarkedRange;
})();

exports.MarkedRange = MarkedRange;

(0, _event.eventMixin)(MarkedRange);

var RangeSorter = (function () {
  function RangeSorter() {
    _classCallCheck(this, RangeSorter);

    this.sorted = [];
  }

  _createClass(RangeSorter, [{
    key: "find",
    value: function find(at) {
      var min = 0,
          max = this.sorted.length;
      for (;;) {
        if (max < min + 10) {
          for (var i = min; i < max; i++) {
            if (this.sorted[i].at.cmp(at) >= 0) return i;
          }return max;
        }
        var mid = min + max >> 1;
        if (this.sorted[mid].at.cmp(at) > 0) max = mid;else min = mid;
      }
    }
  }, {
    key: "insert",
    value: function insert(obj) {
      this.sorted.splice(this.find(obj.at), 0, obj);
    }
  }, {
    key: "remove",
    value: function remove(at, range) {
      var pos = this.find(at);
      for (var dist = 0;; dist++) {
        var leftPos = pos - dist - 1,
            rightPos = pos + dist;
        if (leftPos >= 0 && this.sorted[leftPos].range == range) {
          this.sorted.splice(leftPos, 1);
          return;
        } else if (rightPos < this.sorted.length && this.sorted[rightPos].range == range) {
          this.sorted.splice(rightPos, 1);
          return;
        }
      }
    }
  }, {
    key: "resort",
    value: function resort() {
      for (var i = 0; i < this.sorted.length; i++) {
        var cur = this.sorted[i];
        var at = cur.at = cur.type == "open" ? cur.range.from : cur.range.to;
        var pos = i;
        while (pos > 0 && this.sorted[pos - 1].at.cmp(at) > 0) {
          this.sorted[pos] = this.sorted[pos - 1];
          this.sorted[--pos] = cur;
        }
      }
    }
  }]);

  return RangeSorter;
})();

var RangeStore = (function () {
  function RangeStore(pm) {
    _classCallCheck(this, RangeStore);

    this.pm = pm;
    this.ranges = [];
    this.sorted = new RangeSorter();
  }

  _createClass(RangeStore, [{
    key: "addRange",
    value: function addRange(range) {
      this.ranges.push(range);
      this.sorted.insert({ type: "open", at: range.from, range: range });
      this.sorted.insert({ type: "close", at: range.to, range: range });
      this.pm.markRangeDirty(range);
    }
  }, {
    key: "removeRange",
    value: function removeRange(range) {
      var found = this.ranges.indexOf(range);
      if (found > -1) {
        this.ranges.splice(found, 1);
        this.sorted.remove(range.from, range);
        this.sorted.remove(range.to, range);
        this.pm.markRangeDirty(range);
        range.clear();
      }
    }
  }, {
    key: "transform",
    value: function transform(mapping) {
      for (var i = 0; i < this.ranges.length; i++) {
        var range = this.ranges[i];
        range.from = mapping.map(range.from, range.options.inclusiveLeft ? -1 : 1).pos;
        range.to = mapping.map(range.to, range.options.inclusiveRight ? 1 : -1).pos;
        var diff = range.from.cmp(range.to);
        if (range.options.clearWhenEmpty !== false && diff >= 0) {
          this.removeRange(range);
          i--;
        } else if (diff > 0) {
          range.to = range.from;
        }
      }
      this.sorted.resort();
    }
  }, {
    key: "activeRangeTracker",
    value: function activeRangeTracker() {
      return new RangeTracker(this.sorted.sorted);
    }
  }]);

  return RangeStore;
})();

exports.RangeStore = RangeStore;

var RangeTracker = (function () {
  function RangeTracker(sorted) {
    _classCallCheck(this, RangeTracker);

    this.sorted = sorted;
    this.pos = 0;
    this.current = [];
  }

  _createClass(RangeTracker, [{
    key: "advanceTo",
    value: function advanceTo(pos) {
      var next = undefined;
      while (this.pos < this.sorted.length && (next = this.sorted[this.pos]).at.cmp(pos) <= 0) {
        var className = next.range.options.className;
        if (!className) continue;
        if (next.type == "open") this.current.push(className);else this.current.splice(this.current.indexOf(className), 1);
        this.pos++;
      }
    }
  }, {
    key: "nextChangeBefore",
    value: function nextChangeBefore(pos) {
      for (;;) {
        if (this.pos == this.sorted.length) return null;
        var next = this.sorted[this.pos];
        if (!next.range.options.className) this.pos++;else if (next.at.cmp(pos) >= 0) return null;else return next.at.offset;
      }
    }
  }]);

  return RangeTracker;
})();

},{"./event":9}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.posFromDOM = posFromDOM;
exports.rangeFromDOMLoose = rangeFromDOMLoose;
exports.findByPath = findByPath;
exports.resolvePath = resolvePath;
exports.hasFocus = hasFocus;
exports.posAtCoords = posAtCoords;
exports.coordsAtPos = coordsAtPos;
exports.scrollIntoView = scrollIntoView;
exports.findSelectionFrom = findSelectionFrom;
exports.findSelectionNear = findSelectionNear;
exports.findSelectionAtStart = findSelectionAtStart;
exports.findSelectionAtEnd = findSelectionAtEnd;
exports.selectableNodeAbove = selectableNodeAbove;
exports.verticalMotionLeavesTextblock = verticalMotionLeavesTextblock;
exports.setDOMSelectionToPos = setDOMSelectionToPos;

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _dom = require("../dom");

var SelectionState = (function () {
  function SelectionState(pm) {
    var _this = this;

    _classCallCheck(this, SelectionState);

    this.pm = pm;

    this.range = findSelectionAtStart(pm.doc);
    this.lastNonNodePos = null;

    this.pollState = null;
    this.pollTimeout = null;
    this.lastAnchorNode = this.lastHeadNode = this.lastAnchorOffset = this.lastHeadOffset = null;
    this.lastNode = null;

    pm.content.addEventListener("focus", function () {
      return _this.receivedFocus();
    });
  }

  _createClass(SelectionState, [{
    key: "setAndSignal",
    value: function setAndSignal(range, clearLast) {
      this.set(range, clearLast);
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
    key: "setNodeAndSignal",
    value: function setNodeAndSignal(pos) {
      this.setNode(pos);
      this.pm.signal("selectionChange");
    }
  }, {
    key: "pollForUpdate",
    value: function pollForUpdate() {
      var _this2 = this;

      if (this.pm.input.composing) return;
      clearTimeout(this.pollTimeout);
      this.pollState = "update";
      var n = 0,
          check = function check() {
        if (_this2.pm.input.composing) {
          // Abort
        } else if (_this2.pm.operation) {
            _this2.pollTimeout = setTimeout(check, 20);
          } else if (!_this2.readUpdate() && ++n == 1) {
            _this2.pollTimeout = setTimeout(check, 50);
          } else {
            _this2.pollState = null;
            _this2.pollToSync();
          }
      };
      this.pollTimeout = setTimeout(check, 20);
    }
  }, {
    key: "domChanged",
    value: function domChanged() {
      var sel = getSelection();
      return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset || sel.focusNode != this.lastHeadNode || sel.focusOffset != this.lastHeadOffset;
    }
  }, {
    key: "storeDOMState",
    value: function storeDOMState() {
      var sel = getSelection();
      this.lastAnchorNode = sel.anchorNode;this.lastAnchorOffset = sel.anchorOffset;
      this.lastHeadNode = sel.focusNode;this.lastHeadOffset = sel.focusOffset;
    }
  }, {
    key: "readUpdate",
    value: function readUpdate() {
      if (this.pm.input.composing || !hasFocus(this.pm) || !this.domChanged()) return false;

      var sel = getSelection(),
          doc = this.pm.doc;
      var anchor = posFromDOMInner(this.pm, sel.anchorNode, sel.anchorOffset);
      var head = posFromDOMInner(this.pm, sel.focusNode, sel.focusOffset);
      var newSel = findSelectionNear(doc, head, this.range.head && this.range.head.cmp(head) < 0 ? -1 : 1);
      if (newSel instanceof TextSelection && doc.path(anchor.path).isTextblock) newSel = new TextSelection(anchor, newSel.head);
      this.setAndSignal(newSel);
      if (newSel instanceof NodeSelection || newSel.head.cmp(head) || newSel.anchor.cmp(anchor)) {
        this.toDOM();
      } else {
        this.clearNode();
        this.storeDOMState();
      }
      return true;
    }
  }, {
    key: "pollToSync",
    value: function pollToSync() {
      var _this3 = this;

      if (this.pollState) return;
      this.pollState = "sync";
      var sync = function sync() {
        if (document.activeElement != _this3.pm.content) {
          _this3.pollState = null;
        } else {
          if (!_this3.pm.operation && !_this3.pm.input.composing) _this3.syncDOM();
          _this3.pollTimeout = setTimeout(sync, 200);
        }
      };
      this.pollTimeout = setTimeout(sync, 200);
    }
  }, {
    key: "syncDOM",
    value: function syncDOM() {
      if (!this.pm.input.composing && hasFocus(this.pm) && this.domChanged()) this.toDOM();
    }
  }, {
    key: "toDOM",
    value: function toDOM(takeFocus) {
      if (this.range instanceof NodeSelection) this.nodeToDOM(takeFocus);else this.rangeToDOM(takeFocus);
    }
  }, {
    key: "nodeToDOM",
    value: function nodeToDOM(takeFocus) {
      window.getSelection().removeAllRanges();
      if (takeFocus) this.pm.content.focus();
      var pos = this.range.from,
          node = this.range.node,
          dom = undefined;
      if (node.isInline) dom = findByOffset(resolvePath(this.pm.content, pos.path), pos.offset, true).node;else dom = resolvePath(this.pm.content, pos.toPath());
      if (dom == this.lastNode) return;
      this.clearNode();
      addNodeSelection(node, dom);
      this.lastNode = dom;
    }
  }, {
    key: "clearNode",
    value: function clearNode() {
      if (this.lastNode) {
        clearNodeSelection(this.lastNode);
        this.lastNode = null;
        return true;
      }
    }
  }, {
    key: "rangeToDOM",
    value: function rangeToDOM(takeFocus) {
      var sel = window.getSelection();
      if (!this.clearNode() && !hasFocus(this.pm)) {
        if (!takeFocus) return;
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=921444
        else if (_dom.browser.gecko) this.pm.content.focus();
      }
      if (!this.domChanged()) return;

      var range = document.createRange();
      var content = this.pm.content;
      var anchor = DOMFromPos(content, this.range.anchor);
      var head = DOMFromPos(content, this.range.head);

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
    key: "receivedFocus",
    value: function receivedFocus() {
      if (!this.pollState) this.pollToSync();
    }
  }, {
    key: "beforeStartOp",
    value: function beforeStartOp() {
      if (this.pollState == "update" && this.readUpdate()) {
        clearTimeout(this.pollTimeout);
        this.pollState = null;
        this.pollToSync();
      } else {
        this.syncDOM();
      }
    }
  }]);

  return SelectionState;
})();

exports.SelectionState = SelectionState;

function clearNodeSelection(dom) {
  dom.classList.remove("ProseMirror-selectednode");
}

function addNodeSelection(_node, dom) {
  dom.classList.add("ProseMirror-selectednode");
}

function windowRect() {
  return { left: 0, right: window.innerWidth,
    top: 0, bottom: window.innerHeight };
}

var Selection = function Selection() {
  _classCallCheck(this, Selection);
};

exports.Selection = Selection;

var NodeSelection = (function (_Selection) {
  _inherits(NodeSelection, _Selection);

  function NodeSelection(from, to, node) {
    _classCallCheck(this, NodeSelection);

    _get(Object.getPrototypeOf(NodeSelection.prototype), "constructor", this).call(this);
    this.from = from;
    this.to = to;
    this.node = node;
  }

  /**
   * Text selection range class.
   *
   * A range consists of a head (the active location of the cursor)
   * and an anchor (the start location of the selection).
   */

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
        var _parent = doc.path(from.path);
        var node = _parent.isTextblock ? _parent.childAfter(from.offset).node : _parent.child(from.offset);
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
})(Selection);

exports.NodeSelection = NodeSelection;

var TextSelection = (function (_Selection2) {
  _inherits(TextSelection, _Selection2);

  function TextSelection(anchor, head) {
    _classCallCheck(this, TextSelection);

    _get(Object.getPrototypeOf(TextSelection.prototype), "constructor", this).call(this);
    this.anchor = anchor;
    this.head = head || anchor;
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
})(Selection);

exports.TextSelection = TextSelection;

function pathFromNode(node) {
  var path = [];
  for (;;) {
    var attr = node.getAttribute("pm-path");
    if (!attr) return path;
    path.unshift(+attr);
    node = node.parentNode;
  }
}

function posFromDOMInner(pm, node, domOffset, loose) {
  if (!loose && pm.operation && pm.doc != pm.operation.doc) throw new Error("Fetching a position from an outdated DOM structure");

  var extraOffset = 0,
      tag = undefined;
  for (;;) {
    if (node.nodeType == 3) extraOffset += domOffset;else if (node.hasAttribute("pm-path") || node == pm.content) break;else if (tag = node.getAttribute("pm-span-offset")) extraOffset += +tag;

    var _parent2 = node.parentNode;
    domOffset = Array.prototype.indexOf.call(_parent2.childNodes, node) + (node.nodeType != 3 && domOffset == node.childNodes.length ? 1 : 0);
    node = _parent2;
  }

  var offset = 0;
  for (var i = domOffset - 1; i >= 0; i--) {
    var child = node.childNodes[i];
    if (child.nodeType == 3) {
      if (loose) extraOffset += child.nodeValue.length;
    } else if (tag = child.getAttribute("pm-span")) {
      offset = parseSpan(tag).to;
      break;
    } else if (tag = child.getAttribute("pm-path")) {
      offset = +tag + 1;
      extraOffset = 0;
      break;
    } else if (loose) {
      extraOffset += child.textContent.length;
    }
  }
  return new _model.Pos(pathFromNode(node), offset + extraOffset);
}

function posFromDOM(pm, node, offset) {
  if (offset == null) {
    offset = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
    node = node.parentNode;
  }
  return posFromDOMInner(pm, node, offset);
}

function rangeFromDOMLoose(pm) {
  if (!hasFocus(pm)) return null;
  var sel = getSelection();
  return new TextSelection(posFromDOMInner(pm, sel.anchorNode, sel.anchorOffset, true), posFromDOMInner(pm, sel.focusNode, sel.focusOffset, true));
}

function findByPath(node, n, fromEnd) {
  for (var ch = fromEnd ? node.lastChild : node.firstChild; ch; ch = fromEnd ? ch.previousSibling : ch.nextSibling) {
    if (ch.nodeType != 1) continue;
    var path = ch.getAttribute("pm-path");
    if (!path) {
      var found = findByPath(ch, n);
      if (found) return found;
    } else if (+path == n) {
      return ch;
    }
  }
}

function resolvePath(parent, path) {
  var node = parent;
  for (var i = 0; i < path.length; i++) {
    node = findByPath(node, path[i]);
    if (!node) throw new Error("Failed to resolve path " + path.join("/"));
  }
  return node;
}

function parseSpan(span) {
  var _dD$$exec = /^(\d+)-(\d+)$/.exec(span);

  var _dD$$exec2 = _slicedToArray(_dD$$exec, 3);

  var _ = _dD$$exec2[0];
  var from = _dD$$exec2[1];
  var to = _dD$$exec2[2];

  return { from: +from, to: +to };
}

function findByOffset(node, offset, after) {
  function search(node) {
    for (var ch = node.firstChild, i = 0, attr = undefined; ch; ch = ch.nextSibling, i++) {
      if (ch.nodeType != 1) continue;
      if (attr = ch.getAttribute("pm-span")) {
        var _parseSpan = parseSpan(attr);

        var from = _parseSpan.from;
        var to = _parseSpan.to;

        if (after ? from == offset : to >= offset) return { node: ch, offset: i, innerOffset: offset - from };
      } else if (attr = ch.getAttribute("pm-path")) {
        var diff = offset - +attr;
        if (diff == 0 || after && diff == 1) return { node: ch, offset: i, innerOffset: diff };
      } else {
        var result = search(ch);
        if (result) return result;
      }
    }
  }
  return search(node);
}

function leafAt(node, offset) {
  for (;;) {
    var child = node.firstChild;
    if (!child) return { node: node, offset: offset };
    if (child.nodeType != 1) return { node: child, offset: offset };
    if (child.hasAttribute("pm-span-offset")) {
      var nodeOffset = 0;
      for (;;) {
        var nextSib = child.nextSibling,
            nextOffset = undefined;
        if (!nextSib || (nextOffset = +nextSib.getAttribute("pm-span-offset")) >= offset) break;
        child = nextSib;
        nodeOffset = nextOffset;
      }
      offset -= nodeOffset;
    }
    node = child;
  }
}

/**
 * Get a DOM element at a given position in the document.
 *
 * @param {Node} parent The parent DOM node.
 * @param {Pos} pos     The position in the document.
 * @return {Object}     The DOM node and character offset inside the node.
 */
function DOMFromPos(parent, pos) {
  var node = resolvePath(parent, pos.path);
  var found = findByOffset(node, pos.offset),
      inner = undefined;
  if (!found) return { node: node, offset: 0 };
  if (found.node.hasAttribute("pm-span-atom") || !(inner = leafAt(found.node, found.innerOffset))) return { node: found.node.parentNode, offset: found.offset + (found.innerOffset ? 1 : 0) };else return inner;
}

function hasFocus(pm) {
  var sel = window.getSelection();
  return sel.rangeCount && (0, _dom.contains)(pm.content, sel.anchorNode);
}

/**
 * Given an x,y position on the editor, get the position in the document.
 *
 * @param  {ProseMirror} pm     Editor instance.
 * @param  {Object}      coords The x, y coordinates.
 * @return {Pos}
 */
// FIXME fails on the space between lines
// FIXME reformulate as selectionAtCoords? So that it can't return null

function posAtCoords(pm, coords) {
  var element = document.elementFromPoint(coords.left, coords.top + 1);
  if (!(0, _dom.contains)(pm.content, element)) return null;

  var offset = undefined;
  if (element.childNodes.length == 1 && element.firstChild.nodeType == 3) {
    element = element.firstChild;
    offset = offsetInTextNode(element, coords);
  } else {
    offset = offsetInElement(element, coords);
  }

  return posFromDOM(pm, element, offset);
}

function textRect(node, from, to) {
  var range = document.createRange();
  range.setEnd(node, to);
  range.setStart(node, from);
  return range.getBoundingClientRect();
}

/**
 * Given a position in the document model, get a bounding box of the character at
 * that position, relative to the window.
 *
 * @param  {ProseMirror} pm The editor instance.
 * @param  {Pos}         pos
 * @return {Object} The bounding box.
 */

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

var scrollMargin = 5;

function scrollIntoView(pm, pos) {
  if (!pos) pos = pm.sel.range.head || pm.sel.range.from;
  var coords = coordsAtPos(pm, pos);
  for (var _parent3 = pm.content;; _parent3 = _parent3.parentNode) {
    var atBody = _parent3 == document.body;
    var rect = atBody ? windowRect() : _parent3.getBoundingClientRect();
    if (coords.top < rect.top) _parent3.scrollTop -= rect.top - coords.top + scrollMargin;else if (coords.bottom > rect.bottom) _parent3.scrollTop += coords.bottom - rect.bottom + scrollMargin;
    if (coords.left < rect.left) _parent3.scrollLeft -= rect.left - coords.left + scrollMargin;else if (coords.right > rect.right) _parent3.scrollLeft += coords.right - rect.right + scrollMargin;
    if (atBody) break;
  }
}

function offsetInRects(coords, rects, strict) {
  var y = coords.top;
  var x = coords.left;

  var minY = 1e8,
      minX = 1e8,
      offset = 0;
  for (var i = 0; i < rects.length; i++) {
    var rect = rects[i];
    if (!rect || rect.top == rect.bottom) continue;
    var dX = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
    if (dX > minX) continue;
    if (dX < minX) {
      minX = dX;minY = 1e8;
    }
    var dY = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    if (dY < minY) {
      minY = dY;
      offset = x < (rect.left + rect.right) / 2 ? i : i + 1;
    }
  }
  if (strict && (minX || minY)) return null;
  return offset;
}

function offsetInTextNode(text, coords, strict) {
  var len = text.nodeValue.length;
  var range = document.createRange();
  var rects = [];
  for (var i = 0; i < len; i++) {
    range.setEnd(text, i + 1);
    range.setStart(text, i);
    rects.push(range.getBoundingClientRect());
  }
  return offsetInRects(coords, rects, strict);
}

function offsetInElement(element, coords) {
  var rects = [];
  for (var child = element.firstChild; child; child = child.nextSibling) {
    if (child.getBoundingClientRect) rects.push(child.getBoundingClientRect());else rects.push(null);
  }
  return offsetInRects(coords, rects);
}

function findSelectionIn(doc, path, offset, dir, text) {
  var node = doc.path(path);
  if (node.isTextblock) return new TextSelection(new _model.Pos(path, offset));

  for (var i = offset + (dir > 0 ? 0 : -1); dir > 0 ? i < node.maxOffset : i >= 0; i += dir) {
    var child = node.child(i);
    if (!text && child.type.contains == null && child.type.selectable) return new NodeSelection(new _model.Pos(path, i), new _model.Pos(path, i + 1), child);
    path.push(i);
    var inside = findSelectionIn(doc, path, dir < 0 ? child.maxOffset : 0, dir, text);
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

function findSelectionNear(doc, pos, bias, text) {
  if (bias === undefined) bias = 1;

  var result = findSelectionFrom(doc, pos, bias, text) || findSelectionFrom(doc, pos, -bias, text);
  if (!result) throw new Error("Searching for selection in invalid document " + doc);
  return result;
}

function findSelectionAtStart(node, path, text) {
  if (path === undefined) path = [];

  return findSelectionIn(node, path.slice(), 0, 1, text);
}

function findSelectionAtEnd(node, path, text) {
  if (path === undefined) path = [];

  return findSelectionIn(node, path.slice(), node.maxOffset, -1, text);
}

function selectableNodeAbove(pm, dom, coords, liberal) {
  for (; dom && dom != pm.content; dom = dom.parentNode) {
    if (dom.hasAttribute("pm-path")) {
      var path = pathFromNode(dom);
      var node = pm.doc.path(path);
      // Leaf nodes are implicitly clickable
      if (node.type.clicked) {
        var result = node.type.clicked(node, path, dom, coords);
        if (result) return result;
      }
      if ((liberal || node.type.contains == null) && node.type.selectable) return _model.Pos.from(path);
      return null;
    } else if (dom.hasAttribute("pm-span-atom")) {
      var path = pathFromNode(dom.parentNode);
      var _parent4 = pm.doc.path(path),
          span = parseSpan(dom.getAttribute("pm-span"));
      var node = _parent4.childAfter(span.from).node;
      return node.type.selectable ? new _model.Pos(path, span.from) : null;
    }
  }
}

function verticalMotionLeavesTextblock(pm, pos, dir) {
  var dom = resolvePath(pm.content, pos.path);
  var coords = coordsAtPos(pm, pos);
  for (var child = dom.firstChild; child; child = child.nextSibling) {
    var boxes = child.getClientRects();
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (dir < 0 ? box.bottom < coords.top : box.top > coords.bottom) return false;
    }
  }
  return true;
}

function setDOMSelectionToPos(pm, pos) {
  var _DOMFromPos2 = DOMFromPos(pm.content, pos);

  var node = _DOMFromPos2.node;
  var offset = _DOMFromPos2.offset;

  var range = document.createRange();
  range.setEnd(node, offset);
  range.setStart(node, offset);
  var sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

},{"../dom":2,"../model":24}],18:[function(require,module,exports){
"use strict";

var _dom = require("../dom");

(0, _dom.insertCSS)("\n\n.ProseMirror-icon-lift:after {\n  font-family: ProseMirror-icons;\n  content: \"\";\n}\n.ProseMirror-icon-joinUp:after {\n  font-family: ProseMirror-icons;\n  content: \"\";\n}\n.ProseMirror-icon-insertImage:after {\n  font-family: ProseMirror-icons;\n  content: \"\";\n}\n.ProseMirror-icon-strong:after {\n  font-family: ProseMirror-icons;\n  content: \"\";\n}\n.ProseMirror-icon-em:after {\n  font-family: ProseMirror-icons;\n  content: \"\";\n}\n.ProseMirror-icon-link:after, .ProseMirror-icon-unlink:after {\n  font-family: ProseMirror-icons;\n  content: \"\";\n}\n.ProseMirror-icon-code:after {\n  font-family: ProseMirror-icons;\n  font-size: 110%;\n  content: \"\";\n}\n.ProseMirror-icon-wrapOrderedList:after {\n  font-family: ProseMirror-icons;\n  font-size: 110%;\n  content: \"\";\n}\n.ProseMirror-icon-wrapBulletList:after {\n  font-family: ProseMirror-icons;\n  font-size: 110%;\n  content: \"\";\n}\n.ProseMirror-icon-wrapBlockQuote:after {\n  font-family: ProseMirror-icons;\n  font-size: 110%;\n  content: \"\";\n}\n.ProseMirror-icon-insertHorizontalRule:after {\n  font-family: ProseMirror-icons;\n  content: \"\";\n}\n.ProseMirror-icon-undo:after {\n  font-family: ProseMirror-icons;\n  content: \"\";\n}\n.ProseMirror-icon-redo:after {\n  font-family: ProseMirror-icons;\n  content: \"\";\n}\n\n.ProseMirror-icon-selectParentBlock:after {\n  content: \"⬚\";\n  font-weight: bold;\n  vertical-align: 20%;\n}\n\n@font-face {\n  font-family: ProseMirror-icons;\n  src: url(data:application/x-font-woff;base64,d09GRgABAAAAAA2QAAsAAAAADUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABPUy8yAAABCAAAAGAAAABgDxIG02NtYXAAAAFoAAAAfAAAAHy2vLZyZ2FzcAAAAeQAAAAIAAAACAAAABBnbHlmAAAB7AAACRgAAAkYOsDSDGhlYWQAAAsEAAAANgAAADYHM7UpaGhlYQAACzwAAAAkAAAAJAgLBBtobXR4AAALYAAAAEQAAABEM24B5GxvY2EAAAukAAAAJAAAACQNyBAebWF4cAAAC8gAAAAgAAAAIAAdAJBuYW1lAAAL6AAAAYYAAAGGmUoJ+3Bvc3QAAA1wAAAAIAAAACAAAwAAAAMDYwGQAAUAAAKZAswAAACPApkCzAAAAesAMwEJAAAAAAAAAAAAAAAAAAAAARAAAAAAAAAAAAAAAAAAAAAAQAAA6kYDwP/AAEADwABAAAAAAQAAAAAAAAAAAAAAIAAAAAAAAwAAAAMAAAAcAAEAAwAAABwAAwABAAAAHAAEAGAAAAAUABAAAwAEAAEAIOYE5gjmCuYM6WjqRv/9//8AAAAAACDmAOYG5grmDOln6kb//f//AAH/4xoEGgMaAhoBFqcVygADAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAH//wAPAAEAAAAAAAAAAAACAAA3OQEAAAAAAQAAAAAAAAAAAAIAADc5AQAAAAABAAAAAAAAAAAAAgAANzkBAAAAAAEAVQGAA6sB1QASAAATITIXFhUUBwYjISInJjU0NzYzgAMAEgwNDQwS/QASDA0NDBIB1QwNERINDAwNEhENDAACAAAAgAOAAwAABgANAAABBxcHFwkBIQkBNyc3JwJgYODgYAEg/uD+wP7gASBg4OBgAwBg4OBgAUABQP7A/sBg4OBgAAIAAADAAoACwAANABsAABMRIREjMDYzNTAOAhUlNTAOAhURIREjMDYzAAEAgCBgUGBQAoBQYFABAIAgYAHA/wABAICACDBoYICACDBoYP8AAQCAAAYAAACAAwADAAAEAAkADgATABgAHQAAEzM1IxURMzUjFREzNSMVASE1IRURITUhFREhNSEVAICAgICAgAEAAgD+AAIA/gACAP4AAYCAgAEAgID+AICAAQCAgAEAgID+AICAAAAFAAAAfwMAAwAABAAJAA4AFgAvAAABITUhFREhNSEVERUhNSEDMxEjBxU3FRc0JiMiBgcXPgEzMhYVFAYHFTM1Bz4BNTcBQAHA/kABwP5AAcD+QPFOJFUrbiE/GSwOARAgExMNMjzAWyUyAQGAgID/AICAAoCAgP8AAQAXMgK5zhszCAhCBwgPDRM0KTJDAhY4IwEABAAAAAAESQNuABAAFwAsAEEAAAEUBwYjIicmNTQ3NjMyFxYVBREhNTcXASUhIgcGFREUFxYzITI3NjURNCcmIxcRFAcGIyEiJyY1ETQ3NjMhMhcWFQFuICAuLiAgICAuLiAgAkn827dcASQBJfxtBwUGBgUHA5MHBgUFBgdbGxsl/G0lGxsbGyUDkyUbGwJuLiAgICAuLSAgICAt3P8AbrdcASWlBgUI/UkHBQYGBQcCtwgFBhP9SSUbGxsbJQK3JhsbGxsmAAADAAAAAAMlA24AHgA9AI0AACUWMzI1NCcmJyYnJicmJyYjIgcUFRQVFAcGFxQXFhcDFjMyNzY3Njc2NTQnJicmJyYjIgcUFxYVFBUUFRQVATc2NzY3Njc2NzY3NjU0PQEQJyYnJicmJyYnJiMnNjc2MzIXMjMyFxYXFhcWFxYVFAcGBwYHBgcGBxYXFhUUBwYHBgcGBwYjIicmIyIHBgcBPSom1xcQFBMTExsbFRUhKhABAQECAwQIGCYvIyMcHA8OEBEdHCEhJh0tAgL+ywEJKCgUBAMEAQIBAgwCCwoPDw0ODg8DAjiKi0sNGhoMKCYmJCMaGxAQCgkNDRgYEhEfWDs7FBQiIS4tMDA1GTIyGjxzcxFSE8BBJhkREQoJBQUBAQYePTweBCIiFhUaGwsBqgQHCBISISEwKB4eEREICAgcOjodDx4fDxoN/gQ2AgcHCAcJCAsKCAgODQYmAjEYBQQDAwMBAQIBMAEFBgEHCBARGBgkIyseGRkQEBEQCQoNFDk4VjktLh0dFBMICAECBgYBAAMACQAJA64DrgArAFcAgAAAATQvASYjIgcWFxYXFhcWFxYVFAcGIyInJicmJyYnJicGFRQfARYzMj8BNjUBNC8BJiMiDwEGFRQfARYzMjcmJyYnJicmJyY1NDc2MzIXFhcWFxYXFhc2NQEUDwEGIyIvASY1NDcnBiMiLwEmNTQ/ATYzMh8BFhUUBxc2MzIfARYVA0AQdxAXGBECCQkDAwYFAgIQEBcIBwcIBwQDCQkCEhB1EBcXEFQQ/m4QdRAXFxBUEBB3DxgYEQIJCQMEBQUCAhAQFgkHBwgHBAMJCQETAgAxVC9FRS92MDMzMUVFMHcwMVQvRUUvdi8yMjJFRTB3MAEAFxB3EBMBCQkDBAcIBwcJFhAQAgIFBQQDCQkCEhgXEHYQD1QQFgGTFxB2EA9UEBYXEHcPEQIJCQMEBwgHBwgXEBACAgUGAwMJCQISGP5tRS9TMDF2L0VGMTMzMHcwRUQwUzAxdjBERjIyMjB2MEUAAAEAAAAAAkkDbgBOAAA/ATY3Njc2NzY3Njc2PQEmJyYnJic3FhcWFxYzMjc2NzY3BgcGBwYHBgcGBwYHBgcGBwYHBgcGBwYHBhUXFhcGByIHBiMiJyYjJiMiBwYHAAoDKysVEAcBIyMeHg4REhYWCwsSMjIkIyEcHR0oKBADCBEpKRUEBAMCAgIDAQ8jIgoBBwYFBQQEAQpgAgcHDAwHECEhEE8nHTU0EQExAQsLChQmBKGhlpUUDwcDAwIBAjsBAwMBAQEBAwMBFxwGCgsJCg4NCgkREAhUm5wwBRwcFxgYGAkKAhAZHwEBBgUCBgUBAAUAAABJBAADbgATACgAPQBSAGcAABMRFAcGIyIvASY1ND8BNjMyFxYVARUUBwYjISInJj0BNDc2MyEyFxYVNRUUBwYjISInJj0BNDc2MyEyFxYVNRUUBwYjISInJj0BNDc2MyEyFxYVNRUUBwYjISInJj0BNDc2MyEyFxYV2wUFCAgFpQUFpQUICAUFAyUFBgf8JAcGBQUGBwPcBwYFBQYH/ZIHBgUFBgcCbgcGBQUGB/2SBwYFBQYHAm4HBgUFBgf8JAcGBQUGBwPcBwYFAoD+twgFBQWkBQgIBqQFBQYH/kluBwUGBgUHbggFBQUFCNxuCAUFBQUIbgcFBgYFB9tuBwYFBQYHbgcGBQUGB9ttCAUGBgUIbQgFBgYFCAAAAAEAQP/AAvoDwAAOAAAFPgEuAQcVCQEVNh4BAgcC+ismOKuo/oABgMnjRk9pQE22mmUE/gGAAYD4BZzs/u1yAAABAQb/wAPAA8AADgAAATUJATUmDgEWFyYCPgEXAkABgP6AqKs4JitpT0bjyQLI+P6A/oD+BGWatk1yARPsnAUACwBAAAADoAMAAAYACwAQABUAGgAfACQAKQAuADMAOAAAAREzETMnBwEzFSM1OwEVIzU7ARUjNQUzFSM1FzMVIzU7ARUjNSczFSM1BTMVIzURFSM1MzchESERAsBAoMDA/iBgYIBgYIBAQP8AQEBgYGCAYGDgQEABAEBAwMBA/sABQAHA/oABgMDAAUBAQEBAYGDgYGAgQEBAQKBgYCBgYP6AwMBA/sABQAAAAAEAAAAAAABpWQ1jXw889QALBAAAAAAA0eY4VgAAAADR5jhWAAD/wARJA8AAAAAIAAIAAAAAAAAAAQAAA8D/wAAABEkAAAAABEkAAQAAAAAAAAAAAAAAAAAAABEEAAAAAAAAAAAAAAACAAAABAAAVQOAAAACgAAAAwAAAAMAAAAESQAAAyUAAAO3AAkCSQAABAAAAAQAAEAEAAEGBAAAQAAAAAAACgAUAB4APgBgAIoAvAEGAWoCNALuA2YD9gQWBDYEjAABAAAAEQCOAAsAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAADgCuAAEAAAAAAAEABwAAAAEAAAAAAAIABwBgAAEAAAAAAAMABwA2AAEAAAAAAAQABwB1AAEAAAAAAAUACwAVAAEAAAAAAAYABwBLAAEAAAAAAAoAGgCKAAMAAQQJAAEADgAHAAMAAQQJAAIADgBnAAMAAQQJAAMADgA9AAMAAQQJAAQADgB8AAMAAQQJAAUAFgAgAAMAAQQJAAYADgBSAAMAAQQJAAoANACkaWNvbW9vbgBpAGMAbwBtAG8AbwBuVmVyc2lvbiAxLjAAVgBlAHIAcwBpAG8AbgAgADEALgAwaWNvbW9vbgBpAGMAbwBtAG8AbwBuaWNvbW9vbgBpAGMAbwBtAG8AbwBuUmVndWxhcgBSAGUAZwB1AGwAYQByaWNvbW9vbgBpAGMAbwBtAG8AbwBuRm9udCBnZW5lcmF0ZWQgYnkgSWNvTW9vbi4ARgBvAG4AdAAgAGcAZQBuAGUAcgBhAHQAZQBkACAAYgB5ACAASQBjAG8ATQBvAG8AbgAuAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==) format('woff');\n  font-weight: normal;\n  font-style: normal;\n}\n\n");

},{"../dom":2}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.showSelectMenu = showSelectMenu;
exports.readParams = readParams;
exports.commandGroups = commandGroups;
exports.forceFontLoad = forceFontLoad;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _tooltip = require("./tooltip");

var _dom = require("../dom");

var _edit = require("../edit");

var _utilSortedinsert = require("../util/sortedinsert");

var _utilSortedinsert2 = _interopRequireDefault(_utilSortedinsert);

var Menu = (function () {
  function Menu(pm, display) {
    _classCallCheck(this, Menu);

    this.display = display;
    this.stack = [];
    this.pm = pm;
  }

  _createClass(Menu, [{
    key: "show",
    value: function show(content, displayInfo) {
      this.stack.length = 0;
      this.enter(content, displayInfo);
    }
  }, {
    key: "reset",
    value: function reset() {
      this.stack.length = 0;
      this.display.reset();
    }
  }, {
    key: "enter",
    value: function enter(content, displayInfo) {
      var _this = this;

      var pieces = [],
          explore = function explore(value) {
        if (Array.isArray(value)) {
          for (var i = 0; i < value.length; i++) {
            explore(value[i]);
          }pieces.push(separator);
        } else if (!value.select || value.select(_this.pm)) {
          pieces.push(value);
        }
      };
      explore(content);
      // Remove superfluous separators
      for (var i = 0; i < pieces.length; i++) {
        if (pieces[i] == separator && (i == 0 || i == pieces.length - 1 || pieces[i + 1] == separator)) pieces.splice(i--, 1);
      }if (!pieces.length) return this.display.clear();

      this.stack.push(pieces);
      this.draw(displayInfo);
    }
  }, {
    key: "draw",
    value: function draw(displayInfo) {
      var _this2 = this;

      var cur = this.stack[this.stack.length - 1];
      var rendered = (0, _dom.elt)("div", { "class": "ProseMirror-menu" }, cur.map(function (item) {
        return renderItem(item, _this2);
      }));
      if (this.stack.length > 1) this.display.enter(rendered, function () {
        return _this2.leave();
      }, displayInfo);else this.display.show(rendered, displayInfo);
    }
  }, {
    key: "leave",
    value: function leave() {
      this.stack.pop();
      if (this.stack.length) this.draw();else this.display.reset();
    }
  }, {
    key: "active",
    get: function get() {
      return this.stack.length > 1;
    }
  }]);

  return Menu;
})();

exports.Menu = Menu;

var TooltipDisplay = (function () {
  function TooltipDisplay(tooltip, resetFunc) {
    _classCallCheck(this, TooltipDisplay);

    this.tooltip = tooltip;
    this.resetFunc = resetFunc;
  }

  _createClass(TooltipDisplay, [{
    key: "clear",
    value: function clear() {
      this.tooltip.close();
    }
  }, {
    key: "reset",
    value: function reset() {
      if (this.resetFunc) this.resetFunc();else this.clear();
    }
  }, {
    key: "show",
    value: function show(dom, info) {
      this.tooltip.open(dom, info);
    }
  }, {
    key: "enter",
    value: function enter(dom, back, info) {
      var button = (0, _dom.elt)("div", { "class": "ProseMirror-tooltip-back", title: "Back" });
      button.addEventListener("mousedown", function (e) {
        e.preventDefault();e.stopPropagation();
        back();
      });
      this.show((0, _dom.elt)("div", { "class": "ProseMirror-tooltip-back-wrapper" }, dom, button), info);
    }
  }]);

  return TooltipDisplay;
})();

exports.TooltipDisplay = TooltipDisplay;

function title(pm, command) {
  var key = pm.keyForCommand(command.name);
  return key ? command.label + " (" + key + ")" : command.label;
}

function renderIcon(command, menu) {
  var iconClass = "ProseMirror-menuicon";
  if (command.active(menu.pm)) iconClass += " ProseMirror-menuicon-active";

  var dom = (0, _dom.elt)("div", { "class": iconClass, title: title(menu.pm, command) }, (0, _dom.elt)("span", { "class": "ProseMirror-menuicon ProseMirror-icon-" + command.name }));
  dom.addEventListener("mousedown", function (e) {
    e.preventDefault();e.stopPropagation();
    if (!command.params.length) {
      command.exec(menu.pm);
      menu.reset();
    } else if (command.params.length == 1 && command.params[0].type == "select") {
      showSelectMenu(menu.pm, command, dom);
    } else {
      menu.enter(readParams(command));
    }
  });
  return dom;
}

function renderSelect(item, menu) {
  var param = item.params[0];
  var value = !param["default"] ? null : param["default"].call ? param["default"](menu.pm) : param["default"];

  var dom = (0, _dom.elt)("div", { "class": "ProseMirror-select ProseMirror-select-command-" + item.name, title: item.label }, !value ? param.defaultLabel || "Select..." : value.display ? value.display(value) : value.label);
  dom.addEventListener("mousedown", function (e) {
    e.preventDefault();e.stopPropagation();
    showSelectMenu(menu.pm, item, dom);
  });
  return dom;
}

function showSelectMenu(pm, item, dom) {
  var param = item.params[0];
  var options = param.options.call ? param.options(pm) : param.options;
  var menu = (0, _dom.elt)("div", { "class": "ProseMirror-select-menu" }, options.map(function (o) {
    var dom = (0, _dom.elt)("div", null, o.display ? o.display(o) : o.label);
    dom.addEventListener("mousedown", function (e) {
      e.preventDefault();
      item.exec(pm, [o.value]);
      finish();
    });
    return dom;
  }));
  var pos = dom.getBoundingClientRect(),
      box = pm.wrapper.getBoundingClientRect();
  menu.style.left = pos.left - box.left - 2 + "px";
  menu.style.top = pos.top - box.top - 2 + "px";

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    document.body.removeEventListener("mousedown", finish);
    document.body.removeEventListener("keydown", finish);
    pm.wrapper.removeChild(menu);
  }
  document.body.addEventListener("mousedown", finish);
  document.body.addEventListener("keydown", finish);
  pm.wrapper.appendChild(menu);
}

function renderItem(item, menu) {
  if (item.display == "icon") return renderIcon(item, menu);else if (item.display == "select") return renderSelect(item, menu);else if (!item.display) throw new Error("Command " + item.name + " can not be shown in a menu");else return item.display(menu);
}

function buildParamForm(pm, command) {
  var prefill = command.info.prefillParams && command.info.prefillParams(pm);
  var fields = command.params.map(function (param, i) {
    var field = undefined,
        name = "field_" + i;
    var val = prefill ? prefill[i] : param["default"] || "";
    if (param.type == "text") field = (0, _dom.elt)("input", { name: name, type: "text",
      placeholder: param.name,
      value: val,
      autocomplete: "off" });else if (param.type == "select") field = (0, _dom.elt)("select", { name: name }, (param.options.call ? param.options(pm) : param.options).map(function (o) {
      return (0, _dom.elt)("option", { value: o.value, selected: o == val }, o.label);
    }));else // FIXME more types
      throw new Error("Unsupported parameter type: " + param.type);
    return (0, _dom.elt)("div", null, field);
  });
  return (0, _dom.elt)("form", null, fields);
}

function gatherParams(pm, command, form) {
  var bad = false;
  var params = command.params.map(function (param, i) {
    var val = form.elements["field_" + i].value;
    if (val) return val;
    if (param["default"] == null) bad = true;else return param["default"].call ? param["default"](pm) : param["default"];
  });
  return bad ? null : params;
}

function paramForm(pm, command, callback) {
  var form = buildParamForm(pm, command),
      done = false;

  var finish = function finish(result) {
    if (!done) {
      done = true;
      callback(result);
    }
  };

  var submit = function submit() {
    // FIXME error messages
    finish(gatherParams(pm, command, form));
  };
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submit();
  });
  form.addEventListener("keydown", function (e) {
    if (e.keyCode == 27) {
      finish(null);
    } else if (e.keyCode == 13 && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
      e.preventDefault();
      submit();
    }
  });
  // FIXME too hacky?
  setTimeout(function () {
    var input = form.querySelector("input, textarea");
    if (input) input.focus();
  }, 20);

  return form;
}

function readParams(command) {
  return { display: function display(menu) {
      return paramForm(menu.pm, command, function (params) {
        menu.pm.focus();
        if (params) {
          command.exec(menu.pm, params);
          menu.reset();
        } else {
          menu.leave();
        }
      });
    } };
}

var separator = {
  display: function display() {
    return (0, _dom.elt)("div", { "class": "ProseMirror-menuseparator" });
  }
};

function commandGroups(pm) {
  for (var _len = arguments.length, names = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    names[_key - 1] = arguments[_key];
  }

  return names.map(function (group) {
    var found = [];
    for (var _name in pm.commands) {
      var cmd = pm.commands[_name];
      if (cmd.info.menuGroup && cmd.info.menuGroup == group) (0, _utilSortedinsert2["default"])(found, cmd, function (a, b) {
        return (a.info.menuRank || 50) - (b.info.menuRank || 50);
      });
    }
    return found;
  });
}

// Awkward hack to force Chrome to initialize the font and not return
// incorrect size information the first time it is used.

var forced = false;

function forceFontLoad(pm) {
  if (forced) return;
  forced = true;

  var node = pm.wrapper.appendChild((0, _dom.elt)("div", { "class": "ProseMirror-menuicon ProseMirror-icon-strong",
    style: "visibility: hidden; position: absolute" }));
  window.setTimeout(function () {
    return pm.wrapper.removeChild(node);
  }, 20);
}

function tooltipParamHandler(pm, command, callback) {
  var tooltip = new _tooltip.Tooltip(pm, "center");
  tooltip.open(paramForm(pm, command, function (params) {
    pm.focus();
    tooltip.close();
    callback(params);
  }));
}

(0, _edit.defineParamHandler)("default", tooltipParamHandler);
(0, _edit.defineParamHandler)("tooltip", tooltipParamHandler);

// FIXME check for obsolete styles
(0, _dom.insertCSS)("\n\n.ProseMirror-menu {\n  margin: 0 -4px;\n  line-height: 1;\n  white-space: pre;\n}\n.ProseMirror-tooltip .ProseMirror-menu {\n  width: -webkit-fit-content;\n  width: fit-content;\n}\n\n.ProseMirror-tooltip-back-wrapper {\n  padding-left: 12px;\n}\n.ProseMirror-tooltip-back {\n  position: absolute;\n  top: 5px; left: 5px;\n  cursor: pointer;\n}\n.ProseMirror-tooltip-back:after {\n  content: \"«\";\n}\n\n.ProseMirror-menuicon {\n  display: inline-block;\n  padding: 1px 4px;\n  margin: 0 2px;\n  cursor: pointer;\n  text-rendering: auto;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  text-align: center;\n  vertical-align: middle;\n}\n\n.ProseMirror-menuicon-active {\n  background: #666;\n  border-radius: 4px;\n}\n\n.ProseMirror-menuseparator {\n  display: inline-block;\n}\n.ProseMirror-menuseparator:after {\n  content: \"︙\";\n  opacity: 0.5;\n  padding: 0 4px;\n  vertical-align: middle;\n}\n\n.ProseMirror-select, .ProseMirror-select-menu {\n  border: 1px solid #777;\n  border-radius: 3px;\n  font-size: 90%;\n}\n\n.ProseMirror-select {\n  padding: 1px 12px 1px 4px;\n  display: inline-block;\n  vertical-align: middle;\n  position: relative;\n  cursor: pointer;\n  margin: 0 4px;\n}\n\n.ProseMirror-select-command-textblockType {\n  min-width: 3.2em;\n}\n\n.ProseMirror-select:after {\n  content: \"▿\";\n  color: #777;\n  position: absolute;\n  right: 4px;\n}\n\n.ProseMirror-select-menu {\n  position: absolute;\n  background: #444;\n  color: white;\n  padding: 2px 2px;\n  z-index: 15;\n}\n.ProseMirror-select-menu div {\n  cursor: pointer;\n  padding: 0 1em 0 2px;\n}\n.ProseMirror-select-menu div:hover {\n  background: #777;\n}\n\n");

},{"../dom":2,"../edit":11,"../util/sortedinsert":49,"./tooltip":21}],20:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _edit = require("../edit");

var _dom = require("../dom");

var _utilDebounce = require("../util/debounce");

var _menu = require("./menu");

require("./icons");

(0, _edit.defineOption)("menuBar", false, function (pm, value) {
  if (pm.mod.menuBar) pm.mod.menuBar.detach();
  pm.mod.menuBar = value ? new MenuBar(pm, value) : null;
});

var BarDisplay = (function () {
  function BarDisplay(container, resetFunc) {
    _classCallCheck(this, BarDisplay);

    this.container = container;
    this.resetFunc = resetFunc;
  }

  _createClass(BarDisplay, [{
    key: "clear",
    value: function clear() {
      this.container.textContent = "";
    }
  }, {
    key: "reset",
    value: function reset() {
      this.resetFunc();
    }
  }, {
    key: "show",
    value: function show(dom) {
      this.clear();
      this.container.appendChild(dom);
    }
  }, {
    key: "enter",
    value: function enter(dom, back) {
      var current = this.container.firstChild;
      if (current) {
        current.style.position = "absolute";
        current.style.opacity = "0.5";
      }
      var backButton = (0, _dom.elt)("div", { "class": "ProseMirror-menubar-back" });
      backButton.addEventListener("mousedown", function (e) {
        e.preventDefault();e.stopPropagation();
        back();
      });
      var added = (0, _dom.elt)("div", { "class": "ProseMirror-menubar-sliding" }, backButton, dom);
      this.container.appendChild(added);
      added.getBoundingClientRect(); // Force layout for transition
      added.style.left = "0";
      added.addEventListener("transitionend", function () {
        if (current && current.parentNode) current.parentNode.removeChild(current);
      });
    }
  }]);

  return BarDisplay;
})();

var MenuBar = (function () {
  function MenuBar(pm, config) {
    var _this = this;

    _classCallCheck(this, MenuBar);

    this.pm = pm;

    this.menuElt = (0, _dom.elt)("div", { "class": "ProseMirror-menubar-inner" });
    this.wrapper = (0, _dom.elt)("div", { "class": "ProseMirror-menubar" },
    // Height-forcing placeholder
    (0, _dom.elt)("div", { "class": "ProseMirror-menu", style: "visibility: hidden" }, (0, _dom.elt)("div", { "class": "ProseMirror-menuicon" }, (0, _dom.elt)("span", { "class": "ProseMirror-menuicon ProseMirror-icon-strong" }))), this.menuElt);
    pm.wrapper.insertBefore(this.wrapper, pm.wrapper.firstChild);

    this.menu = new _menu.Menu(pm, new BarDisplay(this.menuElt, function () {
      return _this.resetMenu();
    }));
    this.debounced = new _utilDebounce.Debounced(pm, 100, function () {
      return _this.update();
    });
    pm.on("selectionChange", this.updateFunc = function () {
      return _this.debounced.trigger();
    });
    pm.on("change", this.updateFunc);
    pm.on("activeStyleChange", this.updateFunc);

    this.menuItems = config && config.items || (0, _menu.commandGroups)(pm, "inline", "block", "history");
    this.update();

    this.floating = false;
    if (config && config.float) {
      this.updateFloat();
      this.scrollFunc = function () {
        if (!document.body.contains(_this.pm.wrapper)) window.removeEventListener("scroll", _this.scrollFunc);else _this.updateFloat();
      };
      window.addEventListener("scroll", this.scrollFunc);
    }
  }

  _createClass(MenuBar, [{
    key: "detach",
    value: function detach() {
      this.debounced.clear();
      this.wrapper.parentNode.removeChild(this.wrapper);

      this.pm.off("selectionChange", this.updateFunc);
      this.pm.off("change", this.updateFunc);
      this.pm.off("activeStyleChange", this.updateFunc);
      if (this.scrollFunc) window.removeEventListener("scroll", this.scrollFunc);
    }
  }, {
    key: "update",
    value: function update() {
      if (!this.menu.active) this.resetMenu();
      if (this.floating) this.scrollCursorIfNeeded();
    }
  }, {
    key: "resetMenu",
    value: function resetMenu() {
      this.menu.show(this.menuItems);
    }
  }, {
    key: "updateFloat",
    value: function updateFloat() {
      var editorRect = this.pm.wrapper.getBoundingClientRect();
      if (this.floating) {
        if (editorRect.top >= 0 || editorRect.bottom < this.menuElt.offsetHeight + 10) {
          this.floating = false;
          this.menuElt.style.position = this.menuElt.style.left = this.menuElt.style.width = "";
          this.menuElt.style.display = "";
        } else {
          var border = (this.pm.wrapper.offsetWidth - this.pm.wrapper.clientWidth) / 2;
          this.menuElt.style.left = editorRect.left + border + "px";
          this.menuElt.style.display = editorRect.top > window.innerHeight ? "none" : "";
        }
      } else {
        if (editorRect.top < 0 && editorRect.bottom >= this.menuElt.offsetHeight + 10) {
          this.floating = true;
          var menuRect = this.menuElt.getBoundingClientRect();
          this.menuElt.style.left = menuRect.left + "px";
          this.menuElt.style.width = menuRect.width + "px";
          this.menuElt.style.position = "fixed";
        }
      }
    }
  }, {
    key: "scrollCursorIfNeeded",
    value: function scrollCursorIfNeeded() {
      var head = this.pm.selection.head;
      if (!head) return;
      var cursorPos = this.pm.coordsAtPos(head);
      var menuRect = this.menuElt.getBoundingClientRect();
      if (cursorPos.top < menuRect.bottom && cursorPos.bottom > menuRect.top) {
        var scrollable = findWrappingScrollable(this.pm.wrapper);
        if (scrollable) scrollable.scrollTop -= menuRect.bottom - cursorPos.top;
      }
    }
  }]);

  return MenuBar;
})();

function findWrappingScrollable(node) {
  for (var cur = node.parentNode; cur; cur = cur.parentNode) {
    if (cur.scrollHeight > cur.clientHeight) return cur;
  }
}

(0, _dom.insertCSS)("\n.ProseMirror-menubar {\n  padding: 1px 4px;\n  position: relative;\n  margin-bottom: 3px;\n  border-top-left-radius: inherit;\n  border-top-right-radius: inherit;\n}\n\n.ProseMirror-menubar-inner {\n  color: #666;\n  padding: 1px 4px;\n  top: 0; left: 0; right: 0;\n  position: absolute;\n  border-bottom: 1px solid silver;\n  background: white;\n  z-index: 10;\n  -moz-box-sizing: border-box;\n  box-sizing: border-box;\n  overflow: hidden;\n  border-top-left-radius: inherit;\n  border-top-right-radius: inherit;\n}\n\n.ProseMirror-menubar .ProseMirror-menuicon-active {\n  background: #eee;\n}\n\n.ProseMirror-menubar input[type=\"text\"],\n.ProseMirror-menubar textarea {\n  background: #eee;\n  color: black;\n  border: none;\n  outline: none;\n  width: 100%;\n  box-sizing: -moz-border-box;\n  box-sizing: border-box;\n}\n\n.ProseMirror-menubar input[type=\"text\"] {\n  padding: 0 4px;\n}\n\n.ProseMirror-menubar form {\n  position: relative;\n  padding: 2px 4px;\n}\n\n.ProseMirror-menubar .ProseMirror-blocktype {\n  border: 1px solid #ccc;\n  min-width: 4em;\n}\n.ProseMirror-menubar .ProseMirror-blocktype:after {\n  color: #ccc;\n}\n\n.ProseMirror-menubar-sliding {\n  -webkit-transition: left 0.2s ease-out;\n  -moz-transition: left 0.2s ease-out;\n  transition: left 0.2s ease-out;\n  position: relative;\n  left: 100%;\n  width: 100%;\n  box-sizing: -moz-border-box;\n  box-sizing: border-box;\n  padding-left: 16px;\n  background: white;\n}\n\n.ProseMirror-menubar-back {\n  position: absolute;\n  height: 100%;\n  margin-top: -1px;\n  padding-bottom: 2px;\n  width: 10px;\n  left: 0;\n  border-right: 1px solid silver;\n  cursor: pointer;\n}\n.ProseMirror-menubar-back:after {\n  content: \"«\";\n}\n\n");

},{"../dom":2,"../edit":11,"../util/debounce":46,"./icons":18,"./menu":19}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _dom = require("../dom");

var prefix = "ProseMirror-tooltip";

var Tooltip = (function () {
  function Tooltip(pm, dir) {
    var _this = this;

    _classCallCheck(this, Tooltip);

    this.pm = pm;
    this.dir = dir || "above";
    this.pointer = pm.wrapper.appendChild((0, _dom.elt)("div", { "class": prefix + "-pointer-" + this.dir + " " + prefix + "-pointer" }));
    this.pointerWidth = this.pointerHeight = null;
    this.dom = pm.wrapper.appendChild((0, _dom.elt)("div", { "class": prefix }));
    this.dom.addEventListener("transitionend", function () {
      if (_this.dom.style.opacity == "0") _this.dom.style.display = _this.pointer.style.display = "";
    });

    this.isOpen = false;
    this.lastLeft = this.lastRight = null;
  }

  _createClass(Tooltip, [{
    key: "detach",
    value: function detach() {
      this.dom.parentNode.removeChild(this.dom);
      this.pointer.parentNode.removeChild(this.pointer);
    }
  }, {
    key: "getSize",
    value: function getSize(node) {
      var wrap = this.pm.wrapper.appendChild((0, _dom.elt)("div", {
        "class": prefix,
        style: "display: block; position: absolute"
      }, node));
      var size = { width: wrap.offsetWidth, height: wrap.offsetHeight };
      wrap.parentNode.removeChild(wrap);
      return size;
    }
  }, {
    key: "open",
    value: function open(node, pos) {
      var left = this.lastLeft = pos ? pos.left : this.lastLeft;
      var top = this.lastTop = pos ? pos.top : this.lastTop;

      var size = this.getSize(node);

      var around = this.pm.wrapper.getBoundingClientRect();

      for (var child = this.dom.firstChild, next = undefined; child; child = next) {
        next = child.nextSibling;
        if (child != this.pointer) this.dom.removeChild(child);
      }
      this.dom.appendChild(node);

      this.dom.style.display = this.pointer.style.display = "block";

      if (this.pointerWidth == null) {
        this.pointerWidth = this.pointer.offsetWidth - 1;
        this.pointerHeight = this.pointer.offsetHeight - 1;
      }

      this.dom.style.width = size.width + "px";
      this.dom.style.height = size.height + "px";

      var margin = 5;
      if (this.dir == "above" || this.dir == "below") {
        var tipLeft = Math.max(0, Math.min(left - size.width / 2, window.innerWidth - size.width));
        this.dom.style.left = tipLeft - around.left + "px";
        this.pointer.style.left = left - around.left - this.pointerWidth / 2 + "px";
        if (this.dir == "above") {
          var tipTop = top - around.top - margin - this.pointerHeight - size.height;
          this.dom.style.top = tipTop + "px";
          this.pointer.style.top = tipTop + size.height + "px";
        } else {
          // below
          var tipTop = top - around.top + margin;
          this.pointer.style.top = tipTop + "px";
          this.dom.style.top = tipTop + this.pointerHeight + "px";
        }
      } else if (this.dir == "left" || this.dir == "right") {
        this.dom.style.top = top - around.top - size.height / 2 + "px";
        this.pointer.style.top = top - this.pointerHeight / 2 - around.top + "px";
        if (this.dir == "left") {
          var pointerLeft = left - around.left - margin - this.pointerWidth;
          this.dom.style.left = pointerLeft - size.width + "px";
          this.pointer.style.left = pointerLeft + "px";
        } else {
          // right
          var pointerLeft = left - around.left + margin;
          this.dom.style.left = pointerLeft + this.pointerWidth + "px";
          this.pointer.style.left = pointerLeft + "px";
        }
      } else if (this.dir == "center") {
        var _top = Math.max(around.top, 0),
            bottom = Math.min(around.bottom, window.innerHeight);
        var fromTop = (bottom - _top - size.height) / 2;
        this.dom.style.left = (around.width - size.width) / 2 + "px";
        this.dom.style.top = _top - around.top + fromTop + "px";
      }

      getComputedStyle(this.dom).opacity;
      getComputedStyle(this.pointer).opacity;
      this.dom.style.opacity = this.pointer.style.opacity = 1;
      this.isOpen = true;
    }
  }, {
    key: "close",
    value: function close() {
      if (this.isOpen) {
        this.isOpen = false;
        this.dom.style.opacity = this.pointer.style.opacity = 0;
      }
    }
  }]);

  return Tooltip;
})();

exports.Tooltip = Tooltip;

(0, _dom.insertCSS)("\n\n.ProseMirror-tooltip {\n  position: absolute;\n  display: none;\n  box-sizing: border-box;\n  -moz-box-sizing: border- box;\n  overflow: hidden;\n\n  -webkit-transition: width 0.4s ease-out, height 0.4s ease-out, left 0.4s ease-out, top 0.4s ease-out, opacity 0.2s;\n  -moz-transition: width 0.4s ease-out, height 0.4s ease-out, left 0.4s ease-out, top 0.4s ease-out, opacity 0.2s;\n  transition: width 0.4s ease-out, height 0.4s ease-out, left 0.4s ease-out, top 0.4s ease-out, opacity 0.2s;\n  opacity: 0;\n\n  border-radius: 5px;\n  padding: 3px 7px;\n  margin: 0;\n  background: #444;\n  border-color: #777;\n  color: white;\n\n  z-index: 5;\n}\n\n.ProseMirror-tooltip-pointer {\n  content: \"\";\n  position: absolute;\n  display: none;\n  width: 0; height: 0;\n\n  -webkit-transition: left 0.4s ease-out, top 0.4s ease-out, opacity 0.2s;\n  -moz-transition: left 0.4s ease-out, top 0.4s ease-out, opacity 0.2s;\n  transition: left 0.4s ease-out, top 0.4s ease-out, opacity 0.2s;\n  opacity: 0;\n\n  z-index: 5;\n}\n\n.ProseMirror-tooltip-pointer-above {\n  border-left: 6px solid transparent;\n  border-right: 6px solid transparent;\n  border-top: 6px solid #444;\n}\n\n.ProseMirror-tooltip-pointer-below {\n  border-left: 6px solid transparent;\n  border-right: 6px solid transparent;\n  border-bottom: 6px solid #444;\n}\n\n.ProseMirror-tooltip-pointer-right {\n  border-top: 6px solid transparent;\n  border-bottom: 6px solid transparent;\n  border-right: 6px solid #444;\n}\n\n.ProseMirror-tooltip-pointer-left {\n  border-top: 6px solid transparent;\n  border-bottom: 6px solid transparent;\n  border-left: 6px solid #444;\n}\n\n.ProseMirror-tooltip input[type=\"text\"],\n.ProseMirror-tooltip textarea {\n  background: #666;\n  color: white;\n  border: none;\n  outline: none;\n}\n\n.ProseMirror-tooltip input[type=\"text\"] {\n  padding: 0 4px;\n}\n\n");

},{"../dom":2}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _schema = require("./schema");

var Doc = (function (_Block) {
  _inherits(Doc, _Block);

  function Doc() {
    _classCallCheck(this, Doc);

    _get(Object.getPrototypeOf(Doc.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Doc, null, [{
    key: "kind",
    get: function get() {
      return ".";
    }
  }]);

  return Doc;
})(_schema.Block);

exports.Doc = Doc;

var BlockQuote = (function (_Block2) {
  _inherits(BlockQuote, _Block2);

  function BlockQuote() {
    _classCallCheck(this, BlockQuote);

    _get(Object.getPrototypeOf(BlockQuote.prototype), "constructor", this).apply(this, arguments);
  }

  return BlockQuote;
})(_schema.Block);

exports.BlockQuote = BlockQuote;

var OrderedList = (function (_Block3) {
  _inherits(OrderedList, _Block3);

  function OrderedList() {
    _classCallCheck(this, OrderedList);

    _get(Object.getPrototypeOf(OrderedList.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(OrderedList, null, [{
    key: "contains",
    get: function get() {
      return "list_item";
    }
  }]);

  return OrderedList;
})(_schema.Block);

exports.OrderedList = OrderedList;

OrderedList.attributes = { order: new _schema.Attribute({ "default": "1" }) };

var BulletList = (function (_Block4) {
  _inherits(BulletList, _Block4);

  function BulletList() {
    _classCallCheck(this, BulletList);

    _get(Object.getPrototypeOf(BulletList.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(BulletList, null, [{
    key: "contains",
    get: function get() {
      return "list_item";
    }
  }]);

  return BulletList;
})(_schema.Block);

exports.BulletList = BulletList;

var ListItem = (function (_Block5) {
  _inherits(ListItem, _Block5);

  function ListItem() {
    _classCallCheck(this, ListItem);

    _get(Object.getPrototypeOf(ListItem.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(ListItem, null, [{
    key: "kind",
    get: function get() {
      return ".";
    }
  }]);

  return ListItem;
})(_schema.Block);

exports.ListItem = ListItem;

var HorizontalRule = (function (_Block6) {
  _inherits(HorizontalRule, _Block6);

  function HorizontalRule() {
    _classCallCheck(this, HorizontalRule);

    _get(Object.getPrototypeOf(HorizontalRule.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(HorizontalRule, null, [{
    key: "contains",
    get: function get() {
      return null;
    }
  }]);

  return HorizontalRule;
})(_schema.Block);

exports.HorizontalRule = HorizontalRule;

var Heading = (function (_Textblock) {
  _inherits(Heading, _Textblock);

  function Heading() {
    _classCallCheck(this, Heading);

    _get(Object.getPrototypeOf(Heading.prototype), "constructor", this).apply(this, arguments);
  }

  return Heading;
})(_schema.Textblock);

exports.Heading = Heading;

Heading.attributes = { level: new _schema.Attribute({ "default": "1" }) };

var CodeBlock = (function (_Textblock2) {
  _inherits(CodeBlock, _Textblock2);

  function CodeBlock() {
    _classCallCheck(this, CodeBlock);

    _get(Object.getPrototypeOf(CodeBlock.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(CodeBlock, [{
    key: "containsStyles",
    get: function get() {
      return false;
    }
  }, {
    key: "isCode",
    get: function get() {
      return true;
    }
  }], [{
    key: "contains",
    get: function get() {
      return "text";
    }
  }]);

  return CodeBlock;
})(_schema.Textblock);

exports.CodeBlock = CodeBlock;

var Paragraph = (function (_Textblock3) {
  _inherits(Paragraph, _Textblock3);

  function Paragraph() {
    _classCallCheck(this, Paragraph);

    _get(Object.getPrototypeOf(Paragraph.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Paragraph, [{
    key: "defaultTextblock",
    get: function get() {
      return true;
    }
  }]);

  return Paragraph;
})(_schema.Textblock);

exports.Paragraph = Paragraph;

var Image = (function (_Inline) {
  _inherits(Image, _Inline);

  function Image() {
    _classCallCheck(this, Image);

    _get(Object.getPrototypeOf(Image.prototype), "constructor", this).apply(this, arguments);
  }

  return Image;
})(_schema.Inline);

exports.Image = Image;

Image.attributes = {
  src: new _schema.Attribute(),
  alt: new _schema.Attribute({ "default": "" }),
  title: new _schema.Attribute({ "default": "" })
};

var HardBreak = (function (_Inline2) {
  _inherits(HardBreak, _Inline2);

  function HardBreak() {
    _classCallCheck(this, HardBreak);

    _get(Object.getPrototypeOf(HardBreak.prototype), "constructor", this).apply(this, arguments);
  }

  // Style types

  _createClass(HardBreak, [{
    key: "selectable",
    get: function get() {
      return false;
    }
  }]);

  return HardBreak;
})(_schema.Inline);

exports.HardBreak = HardBreak;

var EmStyle = (function (_StyleType) {
  _inherits(EmStyle, _StyleType);

  function EmStyle() {
    _classCallCheck(this, EmStyle);

    _get(Object.getPrototypeOf(EmStyle.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(EmStyle, null, [{
    key: "rank",
    get: function get() {
      return 51;
    }
  }]);

  return EmStyle;
})(_schema.StyleType);

exports.EmStyle = EmStyle;

var StrongStyle = (function (_StyleType2) {
  _inherits(StrongStyle, _StyleType2);

  function StrongStyle() {
    _classCallCheck(this, StrongStyle);

    _get(Object.getPrototypeOf(StrongStyle.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(StrongStyle, null, [{
    key: "rank",
    get: function get() {
      return 52;
    }
  }]);

  return StrongStyle;
})(_schema.StyleType);

exports.StrongStyle = StrongStyle;

var LinkStyle = (function (_StyleType3) {
  _inherits(LinkStyle, _StyleType3);

  function LinkStyle() {
    _classCallCheck(this, LinkStyle);

    _get(Object.getPrototypeOf(LinkStyle.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(LinkStyle, null, [{
    key: "rank",
    get: function get() {
      return 53;
    }
  }]);

  return LinkStyle;
})(_schema.StyleType);

exports.LinkStyle = LinkStyle;

LinkStyle.attributes = {
  href: new _schema.Attribute(),
  title: new _schema.Attribute({ "default": "" })
};

var CodeStyle = (function (_StyleType4) {
  _inherits(CodeStyle, _StyleType4);

  function CodeStyle() {
    _classCallCheck(this, CodeStyle);

    _get(Object.getPrototypeOf(CodeStyle.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(CodeStyle, [{
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

  return CodeStyle;
})(_schema.StyleType);

exports.CodeStyle = CodeStyle;

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
  em: EmStyle,
  strong: StrongStyle,
  link: LinkStyle,
  code: CodeStyle
});

var defaultSchema = new _schema.Schema(defaultSpec);
exports.defaultSchema = defaultSchema;

},{"./schema":27}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findDiffStart = findDiffStart;
exports.findDiffEnd = findDiffEnd;

var _pos = require("./pos");

var _style = require("./style");

function findDiffStart(a, b) {
  var pathA = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
  var pathB = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];

  var offset = 0;
  for (var i = 0;; i++) {
    if (i == a.length || i == b.length) {
      if (a.length == b.length) return null;
      break;
    }
    var childA = a.child(i),
        childB = b.child(i);
    if (childA == childB) {
      offset += a.isTextblock ? childA.offset : 1;
      continue;
    }

    if (!childA.sameMarkup(childB)) break;

    if (a.isTextblock) {
      if (!(0, _style.sameStyles)(childA.styles, childB.styles)) break;
      if (childA.isText && childA.text != childB.text) {
        for (var j = 0; childA.text[j] == childB.text[j]; j++) {
          offset++;
        }break;
      }
      offset += childA.offset;
    } else {
      var inner = findDiffStart(childA, childB, pathA.concat(i), pathB.concat(i));
      if (inner) return inner;
      offset++;
    }
  }
  return { a: new _pos.Pos(pathA, offset), b: new _pos.Pos(pathB, offset) };
}

function findDiffEnd(a, b) {
  var pathA = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
  var pathB = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];

  var iA = a.length,
      iB = b.length;
  var offset = 0;

  for (;; iA--, iB--) {
    if (iA == 0 || iB == 0) {
      if (iA == iB) return null;
      break;
    }
    var childA = a.child(iA - 1),
        childB = b.child(iB - 1);
    if (childA == childB) {
      offset += a.isTextblock ? childA.offset : 1;
      continue;
    }

    if (!childA.sameMarkup(childB)) break;

    if (a.isTextblock) {
      if (!(0, _style.sameStyles)(childA.styles, childB.styles)) break;

      if (childA.isText && childA.text != childB.text) {
        var same = 0,
            minSize = Math.min(childA.text.length, childB.text.length);
        while (same < minSize && childA.text[childA.text.length - same - 1] == childB.text[childB.text.length - same - 1]) {
          same++;
          offset++;
        }
        break;
      }
      offset += childA.offset;
    } else {
      var inner = findDiffEnd(childA, childB, pathA.concat(iA - 1), pathB.concat(iB - 1));
      if (inner) return inner;
      offset++;
    }
  }
  return { a: new _pos.Pos(pathA, a.maxOffset - offset),
    b: new _pos.Pos(pathB, b.maxOffset - offset) };
}

},{"./pos":26,"./style":29}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
        value: true
});

var _node = require("./node");

Object.defineProperty(exports, "compareMarkup", {
        enumerable: true,
        get: function get() {
                return _node.compareMarkup;
        }
});

var _style = require("./style");

Object.defineProperty(exports, "removeStyle", {
        enumerable: true,
        get: function get() {
                return _style.removeStyle;
        }
});
Object.defineProperty(exports, "sameStyles", {
        enumerable: true,
        get: function get() {
                return _style.sameStyles;
        }
});
Object.defineProperty(exports, "containsStyle", {
        enumerable: true,
        get: function get() {
                return _style.containsStyle;
        }
});
Object.defineProperty(exports, "spanStylesAt", {
        enumerable: true,
        get: function get() {
                return _style.spanStylesAt;
        }
});
Object.defineProperty(exports, "rangeHasStyle", {
        enumerable: true,
        get: function get() {
                return _style.rangeHasStyle;
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
Object.defineProperty(exports, "StyleType", {
        enumerable: true,
        get: function get() {
                return _schema.StyleType;
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
Object.defineProperty(exports, "CodeStyle", {
        enumerable: true,
        get: function get() {
                return _defaultschema.CodeStyle;
        }
});
Object.defineProperty(exports, "EmStyle", {
        enumerable: true,
        get: function get() {
                return _defaultschema.EmStyle;
        }
});
Object.defineProperty(exports, "StrongStyle", {
        enumerable: true,
        get: function get() {
                return _defaultschema.StrongStyle;
        }
});
Object.defineProperty(exports, "LinkStyle", {
        enumerable: true,
        get: function get() {
                return _defaultschema.LinkStyle;
        }
});

var _pos = require("./pos");

Object.defineProperty(exports, "Pos", {
        enumerable: true,
        get: function get() {
                return _pos.Pos;
        }
});

var _slice = require("./slice");

Object.defineProperty(exports, "sliceBefore", {
        enumerable: true,
        get: function get() {
                return _slice.sliceBefore;
        }
});
Object.defineProperty(exports, "sliceAfter", {
        enumerable: true,
        get: function get() {
                return _slice.sliceAfter;
        }
});
Object.defineProperty(exports, "sliceBetween", {
        enumerable: true,
        get: function get() {
                return _slice.sliceBetween;
        }
});
Object.defineProperty(exports, "childrenBefore", {
        enumerable: true,
        get: function get() {
                return _slice.childrenBefore;
        }
});
Object.defineProperty(exports, "childrenAfter", {
        enumerable: true,
        get: function get() {
                return _slice.childrenAfter;
        }
});
Object.defineProperty(exports, "childrenBetween", {
        enumerable: true,
        get: function get() {
                return _slice.childrenBetween;
        }
});
Object.defineProperty(exports, "siblingRange", {
        enumerable: true,
        get: function get() {
                return _slice.siblingRange;
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

},{"./defaultschema":22,"./diff":23,"./node":25,"./pos":26,"./schema":27,"./slice":28,"./style":29}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x10, _x11, _x12) { var _again = true; _function: while (_again) { var object = _x10, property = _x11, receiver = _x12; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x10 = parent; _x11 = property; _x12 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.compareMarkup = compareMarkup;

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _style = require("./style");

var emptyArray = [];

/**
 * Document node class
 */

var Node = (function () {
  function Node(type, attrs) {
    _classCallCheck(this, Node);

    this.type = type;
    this.attrs = attrs;
  }

  _createClass(Node, [{
    key: "sameMarkup",
    value: function sameMarkup(other) {
      return compareMarkup(this.type, other.type, this.attrs, other.attrs);
    }
  }, {
    key: "child",
    value: function child(_) {
      throw new Error("Trying to index non-block node " + this);
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = { type: this.type.name };
      for (var _ in this.attrs) {
        obj.attrs = this.attrs;
        return obj;
      }
      return obj;
    }
  }, {
    key: "length",
    get: function get() {
      return 0;
    }
  }, {
    key: "isBlock",
    get: function get() {
      return false;
    }
  }, {
    key: "isTextblock",
    get: function get() {
      return false;
    }
  }, {
    key: "isInline",
    get: function get() {
      return false;
    }
  }, {
    key: "isText",
    get: function get() {
      return false;
    }
  }]);

  return Node;
})();

exports.Node = Node;

var BlockNode = (function (_Node) {
  _inherits(BlockNode, _Node);

  function BlockNode(type, attrs, content, styles) {
    _classCallCheck(this, BlockNode);

    if (styles) throw new Error("Constructing a block node with styles");
    _get(Object.getPrototypeOf(BlockNode.prototype), "constructor", this).call(this, type, attrs);
    this.content = content || emptyArray;
  }

  _createClass(BlockNode, [{
    key: "toString",
    value: function toString() {
      return this.type.name + "(" + this.content.join(", ") + ")";
    }
  }, {
    key: "copy",
    value: function copy() {
      var content = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

      return new this.constructor(this.type, this.attrs, content);
    }
  }, {
    key: "slice",
    value: function slice(from) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.length : arguments[1];

      return this.content.slice(from, to);
    }

    // FIXME maybe slice and splice returning different things is going to confuse
  }, {
    key: "splice",
    value: function splice(from, to, replace) {
      return new this.constructor(this.type, this.attrs, this.content.slice(0, from).concat(replace).concat(this.content.slice(to)));
    }
  }, {
    key: "replace",
    value: function replace(pos, node) {
      var content = this.content.slice();
      content[pos] = node;
      return this.copy(content);
    }
  }, {
    key: "replaceDeep",
    value: function replaceDeep(path, node) {
      var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      if (depth == path.length) return node;
      var pos = path[depth];
      return this.replace(pos, this.child(pos).replaceDeep(path, node, depth + 1));
    }
  }, {
    key: "append",
    value: function append(nodes) {
      var joinLeft = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
      var joinRight = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      if (!nodes.length) return this;
      if (!this.length) return this.copy(nodes);

      var last = this.length - 1,
          content = this.content.slice(0, last);
      var before = this.content[last],
          after = nodes[0];
      if (joinLeft > 0 && joinRight > 0 && before.sameMarkup(after)) content.push(before.append(after.content, joinLeft - 1, joinRight - 1));else content.push(before.close(joinLeft - 1, "end"), after.close(joinRight - 1, "start"));
      for (var i = 1; i < nodes.length; i++) {
        content.push(nodes[i]);
      }return this.copy(content);
    }
  }, {
    key: "close",
    value: function close(depth, side) {
      if (depth == 0 && this.length == 0 && !this.type.canBeEmpty) return this.copy(this.type.defaultContent());
      if (depth < 0) return this;
      var off = side == "start" ? 0 : this.maxOffset - 1,
          child = this.child(off);
      var closed = child.close(depth - 1, side);
      if (closed == child) return this;
      return this.replace(off, closed);
    }
  }, {
    key: "child",

    /**
     * Get the child node at a given index.
     */
    value: function child(i) {
      if (i < 0 || i >= this.length) throw new Error("Index " + i + " out of range in " + this);
      return this.content[i];
    }
  }, {
    key: "path",

    /**
     * Get a child node given a path.
     *
     * @param  {array} path
     * @return {Node}
     */
    value: function path(_path) {
      for (var i = 0, node = this; i < _path.length; node = node.content[_path[i]], i++) {}
      return node;
    }
  }, {
    key: "isValidPos",
    value: function isValidPos(pos, requireInBlock) {
      for (var i = 0, node = this;; i++) {
        if (i == pos.path.length) {
          if (requireInBlock && !node.isTextblock) return false;
          return pos.offset <= node.maxOffset;
        } else {
          var n = pos.path[i];
          if (n >= node.length || node.isTextblock) return false;
          node = node.child(n);
        }
      }
    }
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
  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = _get(Object.getPrototypeOf(BlockNode.prototype), "toJSON", this).call(this);
      obj.content = this.content.map(function (n) {
        return n.toJSON();
      });
      return obj;
    }
  }, {
    key: "nodesBetween",
    value: function nodesBetween(from, to, f) {
      var path = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];
      var parent = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

      if (f(this, path, from, to, parent) === false) return;

      var start = undefined,
          endPartial = to && to.depth > path.length;
      var end = endPartial ? to.path[path.length] : to ? to.offset : this.length;
      if (!from) {
        start = 0;
      } else if (from.depth == path.length) {
        start = from.offset;
      } else {
        start = from.path[path.length] + 1;
        var passTo = null;
        if (endPartial && end == start - 1) {
          passTo = to;
          endPartial = false;
        }
        this.enterNode(start - 1, from, passTo, path, f);
      }
      for (var i = start; i < end; i++) {
        this.enterNode(i, null, null, path, f);
      }if (endPartial) this.enterNode(end, null, to, path, f);
    }
  }, {
    key: "enterNode",
    value: function enterNode(index, from, to, path, f) {
      path.push(index);
      this.child(index).nodesBetween(from, to, f, path, this);
      path.pop();
    }
  }, {
    key: "inlineNodesBetween",
    value: function inlineNodesBetween(from, to, f) {
      this.nodesBetween(from, to, function (node, path, from, to, parent, offset) {
        if (node.isInline) f(node, from ? from.offset : offset, to ? to.offset : offset + node.offset, path, parent);
      });
    }
  }, {
    key: "maxOffset",
    get: function get() {
      return this.length;
    }
  }, {
    key: "textContent",
    get: function get() {
      var text = "";
      for (var i = 0; i < this.length; i++) {
        text += this.child(i).textContent;
      }return text;
    }
  }, {
    key: "firstChild",
    get: function get() {
      return this.content[0] || null;
    }
  }, {
    key: "lastChild",
    get: function get() {
      return this.content[this.length - 1] || null;
    }
  }, {
    key: "length",
    get: function get() {
      return this.content.length;
    }
  }, {
    key: "children",
    get: function get() {
      return this.content;
    }
  }, {
    key: "isBlock",
    get: function get() {
      return true;
    }
  }]);

  return BlockNode;
})(Node);

exports.BlockNode = BlockNode;

var TextblockNode = (function (_BlockNode) {
  _inherits(TextblockNode, _BlockNode);

  function TextblockNode(type, attrs, content) {
    _classCallCheck(this, TextblockNode);

    _get(Object.getPrototypeOf(TextblockNode.prototype), "constructor", this).call(this, type, attrs, content);
    var maxOffset = 0;
    for (var i = 0; i < this.content.length; i++) {
      maxOffset += this.content[i].offset;
    }this._maxOffset = maxOffset;
  }

  _createClass(TextblockNode, [{
    key: "slice",
    value: function slice(from) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.maxOffset : arguments[1];

      var result = [];
      if (from == to) return result;
      for (var i = 0, offset = 0;; i++) {
        var child = this.child(i),
            size = child.offset,
            end = offset + size;
        if (offset + size > from) result.push(offset >= from && end <= to ? child : child.slice(Math.max(0, from - offset), Math.min(size, to - offset)));
        if (end >= to) return result;
        offset = end;
      }
    }
  }, {
    key: "append",
    value: function append(nodes) {
      if (!nodes.length) return this;
      if (!this.length) return this.copy(nodes);

      var content = this.content.concat(nodes),
          last = this.length - 1,
          merged = undefined;
      if (merged = content[last].maybeMerge(content[last + 1])) content.splice(last, 2, merged);
      return this.copy(content);
    }
  }, {
    key: "close",
    value: function close() {
      return this;
    }
  }, {
    key: "nodesBetween",
    value: function nodesBetween(from, to, f, path, parent) {
      if (f(this, path, from, to, parent) === false) return;
      var start = from ? from.offset : 0,
          end = to ? to.offset : this.maxOffset;
      if (start == end) return;
      for (var offset = 0, i = 0; i < this.length; i++) {
        var child = this.child(i),
            endOffset = offset + child.offset;
        if (endOffset >= start) f(child, path, offset < start ? from : null, endOffset > end ? to : null, this, offset);
        if (endOffset >= end) break;
        offset = endOffset;
      }
    }
  }, {
    key: "childBefore",
    value: function childBefore(offset) {
      if (offset == 0) return { node: null, index: 0, innerOffset: 0 };
      for (var i = 0; i < this.length; i++) {
        var child = this.child(i);
        offset -= child.offset;
        if (offset <= 0) return { node: child, index: i, innerOffset: offset + child.offset };
      }
    }
  }, {
    key: "childAfter",
    value: function childAfter(offset) {
      for (var i = 0; i < this.length; i++) {
        var child = this.child(i),
            size = child.offset;
        if (offset < size) return { node: child, index: i, innerOffset: offset };
        offset -= size;
      }
      return { node: null, index: 0, innerOffset: 0 };
    }
  }, {
    key: "isTextblock",
    get: function get() {
      return true;
    }
  }, {
    key: "maxOffset",
    get: function get() {
      return this._maxOffset;
    }
  }]);

  return TextblockNode;
})(BlockNode);

exports.TextblockNode = TextblockNode;

var InlineNode = (function (_Node2) {
  _inherits(InlineNode, _Node2);

  function InlineNode(type, attrs, content, styles) {
    _classCallCheck(this, InlineNode);

    if (content) throw new Error("Can't create a span node with content");
    _get(Object.getPrototypeOf(InlineNode.prototype), "constructor", this).call(this, type, attrs);
    this.styles = styles || emptyArray;
  }

  _createClass(InlineNode, [{
    key: "styled",
    value: function styled(styles) {
      return new this.constructor(this.type, this.attrs, this.text, styles);
    }
  }, {
    key: "maybeMerge",
    value: function maybeMerge(_) {
      return null;
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = _get(Object.getPrototypeOf(InlineNode.prototype), "toJSON", this).call(this);
      if (this.styles.length) obj.styles = this.styles.map(function (s) {
        return s.toJSON();
      });
      return obj;
    }
  }, {
    key: "toString",
    value: function toString() {
      return this.type.name;
    }
  }, {
    key: "offset",
    get: function get() {
      return 1;
    }
  }, {
    key: "textContent",
    get: function get() {
      return "";
    }
  }, {
    key: "isInline",
    get: function get() {
      return true;
    }
  }]);

  return InlineNode;
})(Node);

exports.InlineNode = InlineNode;

var TextNode = (function (_InlineNode) {
  _inherits(TextNode, _InlineNode);

  function TextNode(type, attrs, content, styles) {
    _classCallCheck(this, TextNode);
console.log([type, attrs, content, styles])
    if (typeof content != "string" || !content) throw new Error("Text node content must be a non-empty string");
    _get(Object.getPrototypeOf(TextNode.prototype), "constructor", this).call(this, type, attrs, null, styles);
    this.text = content;
  }

  _createClass(TextNode, [{
    key: "maybeMerge",
    value: function maybeMerge(other) {
      if (other.type == this.type && (0, _style.sameStyles)(this.styles, other.styles)) return new TextNode(this.type, this.attrs, this.text + other.text, this.styles);
    }
  }, {
    key: "slice",
    value: function slice(from) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.offset : arguments[1];

      return new TextNode(this.type, this.attrs, this.text.slice(from, to), this.styles);
    }
  }, {
    key: "toString",
    value: function toString() {
      var text = JSON.stringify(this.text);
      for (var i = 0; i < this.styles.length; i++) {
        text = this.styles[i].type.name + "(" + text + ")";
      }return text;
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = _get(Object.getPrototypeOf(TextNode.prototype), "toJSON", this).call(this);
      obj.text = this.text;
      return obj;
    }
  }, {
    key: "offset",
    get: function get() {
      return this.text.length;
    }
  }, {
    key: "textContent",
    get: function get() {
      return this.text;
    }
  }, {
    key: "isText",
    get: function get() {
      return true;
    }
  }]);

  return TextNode;
})(InlineNode);

exports.TextNode = TextNode;

function compareMarkup(typeA, typeB, attrsA, attrsB) {
  if (typeA != typeB) return false;
  for (var prop in attrsA) if (attrsB[prop] !== attrsA[prop]) return false;
  return true;
}

},{"./style":29}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Pos = (function () {
  function Pos(path, offset) {
    _classCallCheck(this, Pos);

    this.path = path;
    this.offset = offset;
  }

  _createClass(Pos, [{
    key: "toString",
    value: function toString() {
      return this.path.join("/") + ":" + this.offset;
    }
  }, {
    key: "cmp",
    value: function cmp(other) {
      if (other == this) return 0;
      return Pos.cmp(this.path, this.offset, other.path, other.offset);
    }
  }, {
    key: "shorten",
    value: function shorten() {
      var to = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
      var offset = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      if (to >= this.depth) return this;
      return Pos.shorten(this.path, to, offset);
    }
  }, {
    key: "move",
    value: function move(by) {
      return new Pos(this.path, this.offset + by);
    }
  }, {
    key: "toPath",
    value: function toPath() {
      var offset = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

      return this.path.concat(this.offset + offset);
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
  }, {
    key: "toJSON",
    value: function toJSON() {
      return this;
    }
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
      var extraOffset = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      if (!array.length) throw new Error("Can't create a pos from an empty array");
      return new Pos(array.slice(0, array.length - 1), array[array.length - 1] + extraOffset);
    }
  }, {
    key: "fromJSON",
    value: function fromJSON(json) {
      return new Pos(json.path, json.offset);
    }
  }]);

  return Pos;
})();

exports.Pos = Pos;

},{}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _node = require("./node");

var _style = require("./style");

var _utilError = require("../util/error");

var SchemaError = (function (_ProseMirrorError) {
  _inherits(SchemaError, _ProseMirrorError);

  function SchemaError() {
    _classCallCheck(this, SchemaError);

    _get(Object.getPrototypeOf(SchemaError.prototype), "constructor", this).apply(this, arguments);
  }

  return SchemaError;
})(_utilError.ProseMirrorError);

exports.SchemaError = SchemaError;

function findKinds(type, name, schema, override) {
  function set(sub, sup) {
    if (sub in schema.kinds) {
      if (schema.kinds[sub] == sup) return;
      SchemaError.raise("Inconsistent superkinds for kind " + sub + ": " + sup + " and " + schema.kinds[sub]);
    }
    if (schema.subKind(sub, sup)) SchemaError.raise("Conflicting kind hierarchy through " + sub + " and " + sup);
    schema.kinds[sub] = sup;
  }

  for (var cur = type;; cur = Object.getPrototypeOf(cur)) {
    var curKind = override != null && cur == type ? override : cur.kind;
    if (curKind != null) {
      var _$$exec = /^(.*?)(\.)?$/.exec(curKind);

      var _$$exec2 = _slicedToArray(_$$exec, 3);

      var _ = _$$exec2[0];
      var kind = _$$exec2[1];
      var end = _$$exec2[2];

      if (kind) {
        set(name, kind);
        name = kind;
      }
      if (end) {
        set(name, null);
        return;
      }
    }
  }
}

var NodeType = (function () {
  function NodeType(name, contains, attrs, schema) {
    _classCallCheck(this, NodeType);

    this.name = name;
    this.contains = contains;
    this.attrs = attrs;
    this.schema = schema;
    this.defaultAttrs = null;
  }

  _createClass(NodeType, [{
    key: "canContain",
    value: function canContain(node) {
      return this.canContainType(node.type);
    }
  }, {
    key: "canContainType",
    value: function canContainType(type) {
      return this.schema.subKind(type.name, this.contains);
    }
  }, {
    key: "canContainChildren",
    value: function canContainChildren(node, liberal) {
      if (!liberal && !this.schema.subKind(node.type.contains, this.contains)) return false;
      for (var i = 0; i < node.length; i++) {
        if (!this.canContain(node.child(i))) return false;
      }return true;
    }
  }, {
    key: "findConnection",
    value: function findConnection(other) {
      if (this.canContainType(other)) return [];

      var seen = Object.create(null);
      var active = [{ from: this, via: [] }];
      while (active.length) {
        var current = active.shift();
        for (var _name in this.schema.nodes) {
          var type = this.schema.nodeType(_name);
          if (!(type.contains in seen) && current.from.canContainType(type)) {
            var via = current.via.concat(type);
            if (type.canContainType(other)) return via;
            active.push({ from: type, via: via });
            seen[type.contains] = true;
          }
        }
      }
    }
  }, {
    key: "buildAttrs",
    value: function buildAttrs(attrs, content) {
      if (!attrs && this.defaultAttrs) return this.defaultAttrs;else return _buildAttrs(this.attrs, attrs, this, content);
    }
  }, {
    key: "create",
    value: function create(attrs, content, styles) {
      return new this.instance(this, this.buildAttrs(attrs, content), content, styles);
    }
  }, {
    key: "createAutoFill",
    value: function createAutoFill(attrs, content, styles) {
      if ((!content || content.length == 0) && !this.canBeEmpty) content = this.defaultContent();
      return this.create(attrs, content, styles);
    }
  }, {
    key: "locked",
    get: function get() {
      return false;
    }
  }, {
    key: "isTextblock",
    get: function get() {
      return false;
    }
  }, {
    key: "selectable",
    get: function get() {
      return true;
    }
  }, {
    key: "canBeEmpty",
    get: function get() {
      return true;
    }
  }], [{
    key: "compile",
    value: function compile(types, schema) {
      var result = Object.create(null);
      for (var _name2 in types) {
        var info = types[_name2];
        var type = info.type || SchemaError.raise("Missing node type for " + _name2);
        findKinds(type, _name2, schema, info.kind);
        var contains = "contains" in info ? info.contains : type.contains;
        result[_name2] = new type(_name2, contains, info.attributes || type.attributes, schema);
      }
      for (var _name3 in result) {
        var contains = result[_name3].contains;
        if (contains && !(contains in schema.kinds)) SchemaError.raise("Node type " + _name3 + " is specified to contain non-existing kind " + contains);
      }
      if (!result.doc) SchemaError.raise("Every schema needs a 'doc' type");
      if (!result.text) SchemaError.raise("Every schema needs a 'text' type");

      for (var _name4 in types) {
        types[_name4].defaultAttrs = getDefaultAttrs(types[_name4].attrs);
      }return result;
    }
  }, {
    key: "register",
    value: function register(prop, value) {
      ;(this.prototype[prop] || (this.prototype[prop] = [])).push(value);
    }
  }, {
    key: "kind",
    get: function get() {
      return ".";
    }
  }]);

  return NodeType;
})();

exports.NodeType = NodeType;

NodeType.attributes = {};

var Block = (function (_NodeType) {
  _inherits(Block, _NodeType);

  function Block() {
    _classCallCheck(this, Block);

    _get(Object.getPrototypeOf(Block.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Block, [{
    key: "defaultContent",
    value: function defaultContent() {
      var inner = this.schema.defaultTextblockType().create();
      var conn = this.findConnection(inner.type);
      if (!conn) SchemaError.raise("Can't create default content for " + this.name);
      for (var i = conn.length - 1; i >= 0; i--) {
        inner = conn[i].create(null, [inner]);
      }return [inner];
    }
  }, {
    key: "instance",
    get: function get() {
      return _node.BlockNode;
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
    key: "contains",
    get: function get() {
      return "block";
    }
  }, {
    key: "kind",
    get: function get() {
      return "block.";
    }
  }]);

  return Block;
})(NodeType);

exports.Block = Block;

var Textblock = (function (_Block) {
  _inherits(Textblock, _Block);

  function Textblock() {
    _classCallCheck(this, Textblock);

    _get(Object.getPrototypeOf(Textblock.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Textblock, [{
    key: "canContain",
    value: function canContain(node) {
      var _this = this;

      return _get(Object.getPrototypeOf(Textblock.prototype), "canContain", this).call(this, node) && node.styles.every(function (s) {
        return _this.canContainStyle(s);
      });
    }
  }, {
    key: "canContainStyle",
    value: function canContainStyle(type) {
      var contains = this.containsStyles;
      if (contains === true) return true;
      if (contains) for (var i = 0; i < contains.length; i++) {
        if (contains[i] == type.name) return true;
      }return false;
    }
  }, {
    key: "instance",
    get: function get() {
      return _node.TextblockNode;
    }
  }, {
    key: "containsStyles",
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
  }], [{
    key: "contains",
    get: function get() {
      return "inline";
    }
  }]);

  return Textblock;
})(Block);

exports.Textblock = Textblock;

var Inline = (function (_NodeType2) {
  _inherits(Inline, _NodeType2);

  function Inline() {
    _classCallCheck(this, Inline);

    _get(Object.getPrototypeOf(Inline.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Inline, [{
    key: "instance",
    get: function get() {
      return _node.InlineNode;
    }
  }], [{
    key: "contains",
    get: function get() {
      return null;
    }
  }, {
    key: "kind",
    get: function get() {
      return "inline.";
    }
  }]);

  return Inline;
})(NodeType);

exports.Inline = Inline;

var Text = (function (_Inline) {
  _inherits(Text, _Inline);

  function Text() {
    _classCallCheck(this, Text);

    _get(Object.getPrototypeOf(Text.prototype), "constructor", this).apply(this, arguments);
  }

  // Attribute descriptors

  _createClass(Text, [{
    key: "instance",
    get: function get() {
      return _node.TextNode;
    }
  }, {
    key: "selectable",
    get: function get() {
      return false;
    }
  }]);

  return Text;
})(Inline);

exports.Text = Text;

var Attribute = function Attribute() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  _classCallCheck(this, Attribute);

  this["default"] = options["default"];
  this.compute = options.compute;
}

// Styles

;

exports.Attribute = Attribute;

var StyleType = (function () {
  function StyleType(name, attrs, rank, schema) {
    _classCallCheck(this, StyleType);

    this.name = name;
    this.attrs = attrs;
    this.rank = rank;
    this.schema = schema;
    var defaults = getDefaultAttrs(this.attrs);
    this.instance = defaults && new _style.StyleMarker(this, defaults);
  }

  _createClass(StyleType, [{
    key: "create",
    value: function create(attrs) {
      if (!attrs && this.instance) return this.instance;
      return new _style.StyleMarker(this, _buildAttrs(this.attrs, attrs, this));
    }
  }], [{
    key: "getOrder",
    value: function getOrder(styles) {
      var sorted = [];
      for (var _name5 in styles) {
        sorted.push({ name: _name5, rank: styles[_name5].type.rank });
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
    value: function compile(styles, schema) {
      var order = this.getOrder(styles);
      var result = Object.create(null);
      for (var _name6 in styles) {
        var info = styles[_name6];
        var attrs = info.attributes || info.type.attributes;
        result[_name6] = new info.type(_name6, attrs, order[_name6], schema);
      }
      return result;
    }
  }, {
    key: "register",
    value: function register(prop, value) {
      ;(this.prototype[prop] || (this.prototype[prop] = [])).push(value);
    }
  }, {
    key: "rank",
    get: function get() {
      return 50;
    }
  }]);

  return StyleType;
})();

exports.StyleType = StyleType;

StyleType.attributes = {};

// Schema specifications are data structures that specify a schema --
// a set of node types, their names, attributes, and nesting behavior.

function copyObj(obj, f) {
  var result = Object.create(null);
  for (var prop in obj) {
    result[prop] = f ? f(obj[prop]) : obj[prop];
  }return result;
}

function ensureWrapped(obj) {
  return obj instanceof Function ? { type: obj } : obj;
}

function overlayObj(obj, overlay) {
  var copy = copyObj(obj);
  for (var _name7 in overlay) {
    var info = ensureWrapped(overlay[_name7]);
    if (info == null) {
      delete copy[_name7];
    } else if (info.type) {
      copy[_name7] = info;
    } else {
      var existing = copy[_name7] = copyObj(copy[_name7]);
      for (var prop in info) {
        existing[prop] = info[prop];
      }
    }
  }
  return copy;
}

var SchemaSpec = (function () {
  function SchemaSpec(nodes, styles) {
    _classCallCheck(this, SchemaSpec);

    this.nodes = nodes ? copyObj(nodes, ensureWrapped) : Object.create(null);
    this.styles = styles ? copyObj(styles, ensureWrapped) : Object.create(null);
  }

  // For node types where all attrs have a default value (or which don't
  // have any attributes), build up a single reusable default attribute
  // object, and use it for all nodes that don't specify specific
  // attributes.

  _createClass(SchemaSpec, [{
    key: "updateNodes",
    value: function updateNodes(nodes) {
      return new SchemaSpec(overlayObj(this.nodes, nodes), this.styles);
    }
  }, {
    key: "addAttribute",
    value: function addAttribute(filter, attrName, attrInfo) {
      var copy = copyObj(this.nodes);
      for (var _name8 in copy) {
        if (typeof filter == "string" ? filter == _name8 : typeof filter == "function" ? filter(_name8, copy[_name8]) : filter ? filter == copy[_name8] : true) {
          var info = copy[_name8] = copyObj(copy[_name8]);
          if (!info.attributes) info.attributes = copyObj(info.type.attributes);
          info.attributes[attrName] = attrInfo;
        }
      }
      return new SchemaSpec(copy, this.styles);
    }
  }, {
    key: "updateStyles",
    value: function updateStyles(styles) {
      return new SchemaSpec(this.nodes, overlayObj(this.styles, styles));
    }
  }]);

  return SchemaSpec;
})();

exports.SchemaSpec = SchemaSpec;
function getDefaultAttrs(attrs) {
  var defaults = Object.create(null);
  for (var attrName in attrs) {
    var attr = attrs[attrName];
    if (attr["default"] == null) return null;
    defaults[attrName] = attr["default"];
  }
  return defaults;
}

function _buildAttrs(attrSpec, attrs, arg1, arg2) {
  var built = Object.create(null);
  for (var _name9 in attrSpec) {
    var value = attrs && attrs[_name9];
    if (value == null) {
      var attr = attrSpec[_name9];
      if (attr["default"] != null) value = attr["default"];else if (attr.compute) value = attr.compute(arg1, arg2);else SchemaError.raise("No value supplied for attribute " + _name9);
    }
    built[_name9] = value;
  }
  return built;
}

/**
 * Document schema class.
 */

var Schema = (function () {
  function Schema(spec, styles) {
    _classCallCheck(this, Schema);

    if (!(spec instanceof SchemaSpec)) spec = new SchemaSpec(spec, styles);
    this.spec = spec;
    this.kinds = Object.create(null);
    this.nodes = NodeType.compile(spec.nodes, this);
    this.styles = StyleType.compile(spec.styles, this);
    this.cached = Object.create(null);

    this.node = this.node.bind(this);
    this.text = this.text.bind(this);
    this.nodeFromJSON = this.nodeFromJSON.bind(this);
    this.styleFromJSON = this.styleFromJSON.bind(this);
  }

  _createClass(Schema, [{
    key: "node",
    value: function node(type, attrs, content, styles) {
      if (typeof type == "string") type = this.nodeType(type);else if (!(type instanceof NodeType)) SchemaError.raise("Invalid node type: " + type);else if (type.schema != this) SchemaError.raise("Node type from different schema used (" + type.name + ")");

      return type.create(attrs, content, styles);
    }
  }, {
    key: "text",
    value: function text(_text, styles) {
      return this.nodes.text.create(null, _text, styles);
    }
  }, {
    key: "defaultTextblockType",
    value: function defaultTextblockType() {
      var cached = this.cached.defaultTextblockType;
      if (cached !== undefined) return cached;
      for (var _name10 in this.nodes) {
        if (this.nodes[_name10].defaultTextblock) return this.cached.defaultTextblockType = this.nodes[_name10];
      }
      return this.cached.defaultTextblockType = null;
    }
  }, {
    key: "style",
    value: function style(name, attrs) {
      var spec = this.styles[name] || SchemaError.raise("No style named " + name);
      return spec.create(attrs);
    }
  }, {
    key: "nodeFromJSON",
    value: function nodeFromJSON(json) {
      var type = this.nodeType(json.type);
      return type.create(json.attrs, json.text || json.content && json.content.map(this.nodeFromJSON), json.styles && json.styles.map(this.styleFromJSON));
    }
  }, {
    key: "styleFromJSON",
    value: function styleFromJSON(json) {
      if (typeof json == "string") return this.style(json);
      return this.style(json._, json);
    }
  }, {
    key: "nodeType",
    value: function nodeType(name) {
      return this.nodes[name] || SchemaError.raise("Unknown node type: " + name);
    }
  }, {
    key: "subKind",
    value: function subKind(sub, sup) {
      for (;;) {
        if (sub == sup) return true;
        sub = this.kinds[sub];
        if (!sub) return false;
      }
    }
  }]);

  return Schema;
})();

exports.Schema = Schema;

},{"../util/error":47,"./node":25,"./style":29}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.childrenBefore = childrenBefore;
exports.sliceBefore = sliceBefore;
exports.childrenAfter = childrenAfter;
exports.sliceAfter = sliceAfter;
exports.childrenBetween = childrenBetween;
exports.sliceBetween = sliceBetween;
exports.siblingRange = siblingRange;

var _pos = require("./pos");

// FIXME move to node methods

function childrenBefore(node, pos) {
  var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

  if (depth == pos.depth) return node.slice(0, pos.offset);

  var n = pos.path[depth];
  return node.slice(0, n).concat(sliceBefore(node.child(n), pos, depth + 1));
}

function sliceBefore(node, pos) {
  var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

  return node.copy(childrenBefore(node, pos, depth));
}

function childrenAfter(node, pos) {
  var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

  if (depth == pos.depth) return node.slice(pos.offset);
  var n = pos.path[depth];
  var content = node.slice(n + 1);
  content.unshift(sliceAfter(node.child(n), pos, depth + 1));
  return content;
}

function sliceAfter(node, pos) {
  var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

  return node.copy(childrenAfter(node, pos, depth));
}

function childrenBetween(node, from, to) {
  var depth = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

  var fromEnd = depth == from.depth,
      toEnd = depth == to.depth;
  if (fromEnd && toEnd) return node.slice(from.offset, to.offset);
  if (!fromEnd && !toEnd && from.path[depth] == to.path[depth]) return [sliceBetween(node.child(from.path[depth]), from, to, false, depth + 1)];

  var content = [],
      start = undefined;
  if (!fromEnd) {
    start = from.path[depth] + 1;
    content.push(sliceAfter(node.child(start - 1), from, depth + 1));
  } else {
    start = from.offset;
  }
  var end = toEnd ? to.offset : to.path[depth];
  var between = node.slice(start, end);
  for (var i = 0; i < between.length; i++) {
    content.push(between[i]);
  }if (!toEnd) content.push(sliceBefore(node.child(end), to, depth + 1));
  return content;
}

function sliceBetween(node, from, to) {
  var collapse = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];
  var depth = arguments.length <= 4 || arguments[4] === undefined ? 0 : arguments[4];

  if (depth < from.depth && depth < to.depth && from.path[depth] == to.path[depth]) {
    var inner = sliceBetween(node.child(from.path[depth]), from, to, collapse, depth + 1);
    if (!collapse) return node.copy([inner]);
    if (node.type.name != "doc") return inner;
    var conn = node.type.findConnection(inner.type);
    for (var i = conn.length - 1; i >= 0; i--) {
      inner = node.type.schema.node(conn[i], null, [inner]);
    }return node.copy([inner]);
  } else {
    return node.copy(childrenBetween(node, from, to, depth));
  }
}

function siblingRange(doc, from, to) {
  for (var i = 0, node = doc;; i++) {
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

},{"./pos":26}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.removeStyle = removeStyle;
exports.sameStyles = sameStyles;
exports.containsStyle = containsStyle;
exports.spanStylesAt = spanStylesAt;
exports.rangeHasStyle = rangeHasStyle;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StyleMarker = (function () {
  function StyleMarker(type, attrs) {
    _classCallCheck(this, StyleMarker);

    this.type = type;
    this.attrs = attrs;
  }

  _createClass(StyleMarker, [{
    key: "toJSON",
    value: function toJSON() {
      if (this.type.instance) return this.type.name;
      var obj = { _: this.type.name };
      for (var attr in this.attrs) {
        obj[attr] = this.attrs[attr];
      }return obj;
    }
  }, {
    key: "addToSet",
    value: function addToSet(set) {
      for (var i = 0; i < set.length; i++) {
        var other = set[i];
        if (other.type == this.type) {
          if (this.eq(other)) return set;else return [].concat(_toConsumableArray(set.slice(0, i)), [this], _toConsumableArray(set.slice(i + 1)));
        }
        if (other.type.rank > this.type.rank) return [].concat(_toConsumableArray(set.slice(0, i)), [this], _toConsumableArray(set.slice(i)));
      }
      return set.concat(this);
    }
  }, {
    key: "removeFromSet",
    value: function removeFromSet(set) {
      for (var i = 0; i < set.length; i++) if (this.eq(set[i])) return [].concat(_toConsumableArray(set.slice(0, i)), _toConsumableArray(set.slice(i + 1)));
      return set;
    }
  }, {
    key: "isInSet",
    value: function isInSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (this.eq(set[i])) return true;
      }return false;
    }
  }, {
    key: "eq",
    value: function eq(other) {
      if (this.type != other.type) return false;
      for (var attr in this.attrs) {
        if (other.attrs[attr] != this.attrs[attr]) return false;
      }return true;
    }
  }]);

  return StyleMarker;
})();

exports.StyleMarker = StyleMarker;

function removeStyle(set, type) {
  for (var i = 0; i < set.length; i++) if (set[i].type == type) return [].concat(_toConsumableArray(set.slice(0, i)), _toConsumableArray(set.slice(i + 1)));
  return set;
}

function sameStyles(a, b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (!a[i].eq(b[i])) return false;
  }return true;
}

function containsStyle(set, type) {
  for (var i = 0; i < set.length; i++) {
    if (set[i].type == type) return set[i];
  }return false;
}

var empty = [];

function spanStylesAt(doc, pos) {
  var parent = doc.path(pos.path);
  if (!parent.isTextblock) return empty;
  var node = parent.childBefore(pos.offset).node || parent.firstChild;
  return node ? node.styles : empty;
}

function rangeHasStyle(doc, from, to, type) {
  var found = false;
  doc.inlineNodesBetween(from, to, function (node) {
    if (containsStyle(node.styles, type)) found = true;
  });
  return found;
}

},{}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.fromDOM = fromDOM;
exports.fromHTML = fromHTML;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _index = require("./index");

function fromDOM(schema, dom, options) {
  if (!options) options = {};
  var context = new Context(schema, options.topNode || schema.node("doc"));
  var start = options.from ? dom.childNodes[options.from] : dom.firstChild;
  var end = options.to != null && dom.childNodes[options.to] || null;
  context.addAll(start, end, true);
  var doc = undefined;
  while (context.stack.length) doc = context.leave();
  return doc;
}

(0, _index.defineSource)("dom", fromDOM);

function fromHTML(schema, html, options) {
  var wrap = (options && options.document || window.document).createElement("div");
  wrap.innerHTML = html;
  return fromDOM(schema, wrap, options);
}

(0, _index.defineSource)("html", fromHTML);

var blockElements = {
  address: true, article: true, aside: true, blockquote: true, canvas: true,
  dd: true, div: true, dl: true, fieldset: true, figcaption: true, figure: true,
  footer: true, form: true, h1: true, h2: true, h3: true, h4: true, h5: true,
  h6: true, header: true, hgroup: true, hr: true, li: true, noscript: true, ol: true,
  output: true, p: true, pre: true, section: true, table: true, tfoot: true, ul: true
};

var Context = (function () {
  function Context(schema, topNode) {
    _classCallCheck(this, Context);

    this.schema = schema;
    this.stack = [];
    this.styles = [];
    this.closing = false;
    this.enter(topNode.type, topNode.attrs);
    this.nodeInfo = nodeInfo(schema);
  }

  _createClass(Context, [{
    key: "addDOM",
    value: function addDOM(dom) {
      if (dom.nodeType == 3) {
        var value = dom.nodeValue;
        var _top = this.top,
            last = undefined;
        if (/\S/.test(value) || _top.type.isTextblock) {
          value = value.replace(/\s+/g, " ");
          if (/^\s/.test(value) && (last = _top.content[_top.content.length - 1]) && last.type.name == "text" && /\s$/.test(last.text)) value = value.slice(1);
          this.insert(this.schema.text(value, this.styles));
        }
      } else if (dom.nodeType != 1) {
        // Ignore non-text non-element nodes
      } else if (!this.parseNodeType(dom)) {
          this.addAll(dom.firstChild, null);
          var _name = dom.nodeName.toLowerCase();
          if (blockElements.hasOwnProperty(_name) && this.top.type == this.schema.defaultTextblockType()) this.closing = true;
        }
    }
  }, {
    key: "tryParsers",
    value: function tryParsers(parsers, dom) {
      if (parsers) for (var i = 0; i < parsers.length; i++) {
        var parser = parsers[i];
        if (parser.parse(dom, this, parser.type) !== false) return true;
      }
    }
  }, {
    key: "parseNodeType",
    value: function parseNodeType(dom) {
      return this.tryParsers(this.nodeInfo[dom.nodeName.toLowerCase()], dom) || this.tryParsers(this.nodeInfo._, dom);
    }
  }, {
    key: "addAll",
    value: function addAll(from, to, sync) {
      var stack = sync && this.stack.slice();
      for (var dom = from; dom != to; dom = dom.nextSibling) {
        this.addDOM(dom);
        if (sync && blockElements.hasOwnProperty(dom.nodeName.toLowerCase())) this.sync(stack);
      }
    }
  }, {
    key: "doClose",
    value: function doClose() {
      if (!this.closing || this.stack.length < 2) return;
      var left = this.leave();
      this.enter(left.type, left.attrs);
      this.closing = false;
    }
  }, {
    key: "insert",
    value: function insert(node) {
      if (this.top.type.canContain(node)) {
        this.doClose();
      } else {
        for (var i = this.stack.length - 1; i >= 0; i--) {
          var route = this.stack[i].type.findConnection(node.type);
          if (!route) continue;
          if (i == this.stack.length - 1) {
            this.doClose();
          } else {
            while (this.stack.length > i + 1) this.leave();
          }
          for (var j = 0; j < route.length; j++) {
            this.enter(route[j]);
          }if (this.styles.length) this.styles = [];
          break;
        }
      }
      this.top.content.push(node);
      return node;
    }
  }, {
    key: "insertFrom",
    value: function insertFrom(dom, type, attrs, content, styles) {
      return this.insert(type.createAutoFill(this.parseAttrs(dom, type, attrs), content, styles));
    }
  }, {
    key: "enter",
    value: function enter(type, attrs) {
      if (this.styles.length) this.styles = [];
      this.stack.push({ type: type, attrs: attrs, content: [] });
    }
  }, {
    key: "leave",
    value: function leave() {
      var top = this.stack.pop();
      var node = top.type.createAutoFill(top.attrs, top.content);
      if (this.stack.length) this.insert(node);
      return node;
    }
  }, {
    key: "sync",
    value: function sync(stack) {
      while (this.stack.length > stack.length) this.leave();
      for (;;) {
        var n = this.stack.length - 1,
            one = this.stack[n],
            two = stack[n];
        if ((0, _model.compareMarkup)(one.type, two.type, one.attrs, two.attrs)) break;
        this.leave();
      }
      while (stack.length > this.stack.length) {
        var add = stack[this.stack.length];
        this.enter(add.type, add.attrs);
      }
      if (this.styles.length) this.styles = [];
      this.closing = false;
    }
  }, {
    key: "top",
    get: function get() {
      return this.stack[this.stack.length - 1];
    }
  }]);

  return Context;
})();

function nodeInfo(schema) {
  return schema.cached.parseDOMNodes || (schema.cached.parseDOMNodes = summarizeNodeInfo(schema));
}

function summarizeNodeInfo(schema) {
  var tags = Object.create(null);
  tags._ = [];
  function read(value) {
    var info = value.parseDOM;
    if (!info) return;
    info.forEach(function (info) {
      var tag = info.tag || "_";(tags[tag] || (tags[tag] = [])).push({
        type: value,
        rank: info.rank == null ? 50 : info.rank,
        parse: info.parse
      });
    });
  }

  for (var _name2 in schema.nodes) {
    read(schema.nodes[_name2]);
  }for (var _name3 in schema.styles) {
    read(schema.styles[_name3]);
  }for (var tag in tags) {
    tags[tag].sort(function (a, b) {
      return a.rank - b.rank;
    });
  }return tags;
}

function wrap(dom, context, type, attrs) {
  context.enter(type, attrs);
  context.addAll(dom.firstChild, null, true);
  context.leave();
}

_model.Paragraph.register("parseDOM", { tag: "p", parse: wrap });

_model.BlockQuote.register("parseDOM", { tag: "blockquote", parse: wrap });

var _loop = function (i) {
  _model.Heading.register("parseDOM", {
    tag: "h" + i,
    parse: function parse(dom, context, type) {
      return wrap(dom, context, type, { level: i });
    }
  });
};

for (var i = 1; i <= 6; i++) {
  _loop(i);
}_model.HorizontalRule.register("parseDOM", { tag: "hr", parse: wrap });

_model.CodeBlock.register("parseDOM", { tag: "pre", parse: function parse(dom, context, type) {
    var params = dom.firstChild && /^code$/i.test(dom.firstChild.nodeName) && dom.firstChild.getAttribute("class");
    if (params && /fence/.test(params)) {
      var found = [],
          re = /(?:^|\s)lang-(\S+)/g,
          m = undefined;
      while (m = re.test(params)) found.push(m[1]);
      params = found.join(" ");
    } else {
      params = null;
    }
    context.insert(type.create({ params: params }, [context.schema.text(dom.textContent)]));
  } });

_model.BulletList.register("parseDOM", { tag: "ul", parse: wrap });

_model.OrderedList.register("parseDOM", { tag: "ol", parse: function parse(dom, context, type) {
    var attrs = { order: dom.getAttribute("start") || 1 };
    wrap(dom, context, type, attrs);
  } });

_model.ListItem.register("parseDOM", { tag: "li", parse: wrap });

_model.HardBreak.register("parseDOM", { tag: "br", parse: function parse(dom, context, type) {
    if (!dom.hasAttribute("pm-force-br")) context.insert(type.create(null, null, context.styles));
  } });

_model.Image.register("parseDOM", { tag: "img", parse: function parse(dom, context, type) {
    context.insert(type.create({
      src: dom.getAttribute("src"),
      title: dom.getAttribute("title") || null,
      alt: dom.getAttribute("alt") || null
    }));
  } });

// Inline style tokens

function inline(dom, context, style) {
  var old = context.styles;
  context.styles = (style.instance || style).addToSet(old);
  context.addAll(dom.firstChild, null);
  context.styles = old;
}

_model.LinkStyle.register("parseDOM", { tag: "a", parse: function parse(dom, context, style) {
    var href = dom.getAttribute("href");
    if (!href) return false;
    inline(dom, context, style.create({ href: href, title: dom.getAttribute("title") }));
  } });

_model.EmStyle.register("parseDOM", { tag: "i", parse: inline });
_model.EmStyle.register("parseDOM", { tag: "em", parse: inline });

_model.StrongStyle.register("parseDOM", { tag: "b", parse: inline });
_model.StrongStyle.register("parseDOM", { tag: "strong", parse: inline });

_model.CodeStyle.register("parseDOM", { tag: "code", parse: inline });

},{"../model":24,"./index":31}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertFrom = convertFrom;
exports.knownSource = knownSource;
exports.defineSource = defineSource;
var parsers = Object.create(null);

function convertFrom(schema, value, format, arg) {
  var converter = parsers[format];
  if (!converter) throw new Error("Source format " + format + " not defined");
  return converter(schema, value, arg);
}

function knownSource(format) {
  return !!parsers[format];
}

function defineSource(format, func) {
  parsers[format] = func;
}

defineSource("json", function (schema, json) {
  return schema.nodeFromJSON(json);
});

},{}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromText = fromText;

var _index = require("./index");

// FIXME is it meaningful to try and attach text-parsing information
// to node types?

function fromText(schema, text) {
  var blocks = text.trim().split(/\n{2,}/);
  var nodes = [];
  for (var i = 0; i < blocks.length; i++) {
    var spans = [];
    var parts = blocks[i].split("\n");
    for (var j = 0; j < parts.length; j++) {
      if (j) spans.push(schema.node("hard_break"));
      if (parts[j]) spans.push(schema.text(parts[j]));
    }
    nodes.push(schema.node("paragraph", null, spans));
  }
  if (!nodes.length) nodes.push(schema.node("paragraph"));
  return schema.node("doc", null, nodes);
}

(0, _index.defineSource)("text", fromText);

},{"./index":31}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toDOM = toDOM;
exports.toHTML = toHTML;
exports.renderNodeToDOM = renderNodeToDOM;

var _model = require("../model");

var _index = require("./index");

var doc = null;

// declare_global: window

function toDOM(node) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  doc = options.document || window.document;
  return renderNodes(node.children, options);
}

(0, _index.defineTarget)("dom", toDOM);

function toHTML(node, options) {
  var wrap = (options && options.document || window.document).createElement("div");
  wrap.appendChild(toDOM(node, options));
  return wrap.innerHTML;
}

(0, _index.defineTarget)("html", toHTML);

function renderNodeToDOM(node, options, offset) {
  var dom = renderNode(node, options, offset);
  if (options.renderInlineFlat && node.isInline) {
    dom = wrapInlineFlat(node, dom);
    dom = options.renderInlineFlat(node, dom, offset) || dom;
  }
  return dom;
}

function elt(name) {
  var dom = doc.createElement(name);

  for (var _len = arguments.length, children = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    children[_key - 1] = arguments[_key];
  }

  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    dom.appendChild(typeof child == "string" ? doc.createTextNode(child) : child);
  }
  return dom;
}

function wrap(node, options, type) {
  var dom = elt(type || node.type.name);
  if (!node.isTextblock) renderNodesInto(node.children, dom, options);else if (options.renderInlineFlat) renderInlineContentFlat(node.children, dom, options);else renderInlineContent(node.children, dom, options);
  return dom;
}

function wrapIn(type) {
  return function (node, options) {
    return wrap(node, options, type);
  };
}

function renderNodes(nodes, options) {
  var frag = doc.createDocumentFragment();
  renderNodesInto(nodes, frag, options);
  return frag;
}

function renderNode(node, options, offset) {
  var dom = node.type.serializeDOM(node, options);
  if (options.onRender && node.isBlock) dom = options.onRender(node, dom, offset) || dom;
  return dom;
}

function renderNodesInto(nodes, where, options) {
  for (var i = 0; i < nodes.length; i++) {
    if (options.path) options.path.push(i);
    where.appendChild(renderNode(nodes[i], options, i));
    if (options.path) options.path.pop();
  }
}

function renderInlineContent(nodes, where, options) {
  var top = where;
  var active = [];
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i],
        styles = node.styles;
    var keep = 0;
    for (; keep < Math.min(active.length, styles.length); ++keep) if (!styles[keep].eq(active[keep])) break;
    while (keep < active.length) {
      active.pop();
      top = top.parentNode;
    }
    while (active.length < styles.length) {
      var add = styles[active.length];
      active.push(add);
      top = top.appendChild(add.type.serializeDOM(add));
    }
    top.appendChild(renderNode(node, options, i));
  }
}

function wrapInlineFlat(node, dom) {
  var styles = node.styles;
  for (var i = styles.length - 1; i >= 0; i--) {
    var _wrap = styles[i].type.serializeDOM(styles[i]);
    _wrap.appendChild(dom);
    dom = _wrap;
  }
  return dom;
}

function renderInlineContentFlat(nodes, where, options) {
  var offset = 0;
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var dom = wrapInlineFlat(node, renderNode(node, options, i));
    dom = options.renderInlineFlat(node, dom, offset) || dom;
    where.appendChild(dom);
    offset += node.offset;
  }

  if (!nodes.length || nodes[nodes.length - 1].type.name == "hard_break") where.appendChild(elt("br")).setAttribute("pm-force-br", "true");else if (where.lastChild.contentEditable == "false") where.appendChild(doc.createTextNode(""));
}

// Block nodes

function def(cls, method) {
  cls.prototype.serializeDOM = method;
}

def(_model.BlockQuote, wrapIn("blockquote"));

_model.BlockQuote.prototype.clicked = function (_, path, dom, coords) {
  var childBox = dom.firstChild.getBoundingClientRect();
  if (coords.left < childBox.left - 2) return _model.Pos.from(path);
};

def(_model.BulletList, wrapIn("ul"));

def(_model.OrderedList, function (node, options) {
  var dom = wrap(node, options, "ol");
  if (node.attrs.order > 1) dom.setAttribute("start", node.attrs.order);
  return dom;
});

_model.OrderedList.prototype.clicked = _model.BulletList.prototype.clicked = function (_, path, dom, coords) {
  for (var i = 0; i < dom.childNodes.length; i++) {
    var child = dom.childNodes[i];
    if (!child.hasAttribute("pm-path")) continue;
    var childBox = child.getBoundingClientRect();
    if (coords.left > childBox.left - 2) return null;
    if (childBox.top <= coords.top && childBox.bottom >= coords.top) return new _model.Pos(path, i);
  }
};

def(_model.ListItem, wrapIn("li"));

def(_model.HorizontalRule, function () {
  return elt("hr");
});

def(_model.Paragraph, wrapIn("p"));

def(_model.Heading, function (node, options) {
  return wrap(node, options, "h" + node.attrs.level);
});

def(_model.CodeBlock, function (node, options) {
  var code = wrap(node, options, "code");
  if (node.attrs.params != null) code.className = "fence " + node.attrs.params.replace(/(^|\s+)/g, "$&lang-");
  return elt("pre", code);
});

// Inline content

def(_model.Text, function (node) {
  return doc.createTextNode(node.text);
});

def(_model.Image, function (node) {
  var dom = elt("img");
  dom.setAttribute("src", node.attrs.src);
  if (node.attrs.title) dom.setAttribute("title", node.attrs.title);
  if (node.attrs.alt) dom.setAttribute("alt", node.attrs.alt);
  return dom;
});

def(_model.HardBreak, function () {
  return elt("br");
});

// Inline styles

def(_model.EmStyle, function () {
  return elt("em");
});

def(_model.StrongStyle, function () {
  return elt("strong");
});

def(_model.CodeStyle, function () {
  return elt("code");
});

def(_model.LinkStyle, function (style) {
  var dom = elt("a");
  dom.setAttribute("href", style.attrs.href);
  if (style.attrs.title) dom.setAttribute("title", style.attrs.title);
  return dom;
});

},{"../model":24,"./index":34}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertTo = convertTo;
exports.knownTarget = knownTarget;
exports.defineTarget = defineTarget;
var serializers = Object.create(null);

function convertTo(doc, format, arg) {
  var converter = serializers[format];
  if (!converter) throw new Error("Target format " + format + " not defined");
  return converter(doc, arg);
}

function knownTarget(format) {
  return !!serializers[format];
}

function defineTarget(format, func) {
  serializers[format] = func;
}

defineTarget("json", function (doc) {
  return doc.toJSON();
});

},{}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toText = toText;

var _model = require("../model");

var _index = require("./index");

_model.Block.prototype.serializeText = function (node) {
  var accum = "";
  for (var i = 0; i < node.length; i++) {
    var child = node.child(i);
    accum += child.type.serializeText(child);
  }
  return accum;
};

_model.Textblock.prototype.serializeText = function (node) {
  var text = _model.Block.prototype.serializeText(node);
  return text && text + "\n\n";
};

_model.Inline.prototype.serializeText = function () {
  return "";
};

_model.HardBreak.prototype.serializeText = function () {
  return "\n";
};

_model.Text.prototype.serializeText = function (node) {
  return node.text;
};

function toText(doc) {
  return doc.type.serializeText(doc).trim();
}

(0, _index.defineTarget)("text", toText);

},{"../model":24,"./index":34}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.canLift = canLift;
exports.canWrap = canWrap;
exports.alreadyHasBlockType = alreadyHasBlockType;

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _tree = require("./tree");

var _map = require("./map");

(0, _step.defineStep)("ancestor", {
  apply: function apply(doc, step) {
    var from = step.from,
        to = step.to;
    if (!(0, _tree.isFlatRange)(from, to)) return null;
    var toParent = from.path,
        start = from.offset,
        end = to.offset;
    var depth = step.param.depth || 0,
        wrappers = step.param.wrappers || [];
    var inner = doc.path(from.path);
    for (var i = 0; i < depth; i++) {
      if (start > 0 || end < doc.path(toParent).maxOffset || toParent.length == 0) return null;
      start = toParent[toParent.length - 1];
      end = start + 1;
      toParent = toParent.slice(0, toParent.length - 1);
    }
    if (depth == 0 && wrappers.length == 0) return null;

    var parent = doc.path(toParent),
        parentSize = parent.length,
        newParent = undefined;
    if (parent.type.locked) return null;
    if (wrappers.length) {
      var _ret = (function () {
        var lastWrapper = wrappers[wrappers.length - 1];
        var content = inner.slice(from.offset, to.offset);
        if (!parent.type.canContain(wrappers[0]) || !content.every(function (n) {
          return lastWrapper.type.canContain(n);
        }) || !inner.length && !lastWrapper.type.canBeEmpty || lastWrapper.type.locked) return {
            v: null
          };
        var node = null;
        for (var i = wrappers.length - 1; i >= 0; i--) {
          node = wrappers[i].copy(node ? [node] : content);
        }newParent = parent.splice(start, end, [node]);
      })();

      if (typeof _ret === "object") return _ret.v;
    } else {
      if (!parent.type.canContainChildren(inner, true) || !inner.length && start == 0 && end == parent.length && !parent.type.canBeEmpty) return null;
      newParent = parent.splice(start, end, inner.children);
    }
    var copy = doc.replaceDeep(toParent, newParent);

    var toInner = toParent.slice();
    for (var i = 0; i < wrappers.length; i++) {
      toInner.push(i ? 0 : start);
    }var startOfInner = new _model.Pos(toInner, wrappers.length ? 0 : start);
    var replaced = null;
    var insertedSize = wrappers.length ? 1 : to.offset - from.offset;
    if (depth != wrappers.length || depth > 1 || wrappers.length > 1) {
      var posBefore = new _model.Pos(toParent, start);
      var posAfter1 = new _model.Pos(toParent, end),
          posAfter2 = new _model.Pos(toParent, start + insertedSize);
      var endOfInner = new _model.Pos(toInner, startOfInner.offset + (to.offset - from.offset));
      replaced = [new _map.ReplacedRange(posBefore, from, posBefore, startOfInner), new _map.ReplacedRange(to, posAfter1, endOfInner, posAfter2, posAfter1, posAfter2)];
    }
    var moved = [new _map.MovedRange(from, to.offset - from.offset, startOfInner)];
    if (end - start != insertedSize) moved.push(new _map.MovedRange(new _model.Pos(toParent, end), parentSize - end, new _model.Pos(toParent, start + insertedSize)));
    return new _transform.TransformResult(copy, new _map.PosMap(moved, replaced));
  },
  invert: function invert(step, oldDoc, map) {
    var wrappers = [];
    if (step.param.depth) for (var i = 0; i < step.param.depth; i++) {
      var _parent = oldDoc.path(step.from.path.slice(0, step.from.path.length - i));
      wrappers.unshift(_parent.copy());
    }
    var newFrom = map.map(step.from).pos;
    var newTo = step.from.cmp(step.to) ? map.map(step.to, -1).pos : newFrom;
    return new _step.Step("ancestor", newFrom, newTo, null, { depth: step.param.wrappers ? step.param.wrappers.length : 0,
      wrappers: wrappers });
  },
  paramToJSON: function paramToJSON(param) {
    return { depth: param.depth,
      wrappers: param.wrappers && param.wrappers.map(function (n) {
        return n.toJSON();
      }) };
  },
  paramFromJSON: function paramFromJSON(schema, json) {
    return { depth: json.depth,
      wrappers: json.wrappers && json.wrappers.map(schema.nodeFromJSON) };
  }
});

function canBeLifted(doc, range) {
  var content = [doc.path(range.from.path)],
      unwrap = false;
  for (;;) {
    var parentDepth = -1;

    var _loop = function (_node, i) {
      if (content.every(function (inner) {
        return _node.type.canContainChildren(inner);
      })) parentDepth = i;
      _node = _node.child(range.from.path[i]);
      exports.node = node = _node;
    };

    for (var node = doc, i = 0; i < range.from.path.length; i++) {
      _loop(node, i);
    }
    if (parentDepth > -1) return { path: range.from.path.slice(0, parentDepth), unwrap: unwrap };
    if (unwrap || !content[0].isBlock) return null;
    content = content[0].slice(range.from.offset, range.to.offset);
    unwrap = true;
  }
}

function canLift(doc, from, to) {
  var range = (0, _model.siblingRange)(doc, from, to || from);
  var found = canBeLifted(doc, range);
  if (found) return { found: found, range: range };
}

_transform.Transform.prototype.lift = function (from) {
  var to = arguments.length <= 1 || arguments[1] === undefined ? from : arguments[1];
  return (function () {
    var can = canLift(this.doc, from, to);
    if (!can) return this;
    var found = can.found;
    var range = can.range;

    var depth = range.from.path.length - found.path.length;
    var rangeNode = found.unwrap && this.doc.path(range.from.path);

    for (var d = 0, pos = range.to;; d++) {
      if (pos.offset < this.doc.path(pos.path).length) {
        this.split(pos, depth);
        break;
      }
      if (d == depth - 1) break;
      pos = pos.shorten(null, 1);
    }
    for (var d = 0, pos = range.from;; d++) {
      if (pos.offset > 0) {
        this.split(pos, depth - d);
        var cut = range.from.path.length - depth,
            path = pos.path.slice(0, cut).concat(pos.path[cut] + 1);
        while (path.length < range.from.path.length) path.push(0);
        range = { from: new _model.Pos(path, 0), to: new _model.Pos(path, range.to.offset - range.from.offset) };
        break;
      }
      if (d == depth - 1) break;
      pos = pos.shorten();
    }
    if (found.unwrap) {
      for (var i = range.to.offset - 1; i > range.from.offset; i--) {
        this.join(new _model.Pos(range.from.path, i));
      }var size = 0;
      for (var i = range.from.offset; i < range.to.offset; i++) {
        size += rangeNode.child(i).length;
      }var path = range.from.path.concat(range.from.offset);
      range = { from: new _model.Pos(path, 0), to: new _model.Pos(path, size) };
      ++depth;
    }
    this.step("ancestor", range.from, range.to, null, { depth: depth });
    return this;
  }).apply(this, arguments);
};

function canWrap(doc, from, to, node) {
  var range = (0, _model.siblingRange)(doc, from, to || from);
  if (range.from.offset == range.to.offset) return null;
  var parent = doc.path(range.from.path);
  var around = parent.type.findConnection(node.type);
  var inside = node.type.findConnection(parent.child(range.from.offset).type);
  if (around && inside) return { range: range, around: around, inside: inside };
}

_transform.Transform.prototype.wrap = function (from, to, node) {
  var can = canWrap(this.doc, from, to, node);
  if (!can) return this;
  var range = can.range;
  var around = can.around;
  var inside = can.inside;

  var wrappers = around.map(function (t) {
    return node.type.schema.node(t);
  }).concat(node).concat(inside.map(function (t) {
    return node.type.schema.node(t);
  }));
  this.step("ancestor", range.from, range.to, null, { wrappers: wrappers });
  if (inside.length) {
    var toInner = range.from.path.slice();
    for (var i = 0; i < around.length + inside.length + 1; i++) {
      toInner.push(i ? 0 : range.from.offset);
    }for (var i = range.to.offset - 1 - range.from.offset; i > 0; i--) {
      this.split(new _model.Pos(toInner, i), inside.length);
    }
  }
  return this;
};

function alreadyHasBlockType(doc, from, to, type, attrs) {
  var found = false;
  if (!attrs) attrs = {};
  doc.nodesBetween(from, to || from, function (node) {
    if (node.isTextblock) {
      if (!(0, _model.compareMarkup)(node.type, type, node.attrs, attrs)) found = true;
      return false;
    }
  });
  return found;
}

_transform.Transform.prototype.setBlockType = function (from, to, wrapNode) {
  var _this = this;

  this.doc.nodesBetween(from, to || from, function (node, path) {
    if (node.isTextblock && !node.sameMarkup(wrapNode)) {
      path = path.slice();
      // Ensure all markup that isn't allowed in the new node type is cleared
      _this.clearMarkup(new _model.Pos(path, 0), new _model.Pos(path, node.maxOffset), wrapNode.type);
      _this.step("ancestor", new _model.Pos(path, 0), new _model.Pos(path, _this.doc.path(path).maxOffset), null, { depth: 1, wrappers: [wrapNode] });
      return false;
    }
  });
  return this;
};

},{"../model":24,"./map":39,"./step":42,"./transform":44,"./tree":45}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

require("./style");

require("./split");

require("./replace");

var _transform = require("./transform");

Object.defineProperty(exports, "TransformResult", {
  enumerable: true,
  get: function get() {
    return _transform.TransformResult;
  }
});
Object.defineProperty(exports, "Transform", {
  enumerable: true,
  get: function get() {
    return _transform.Transform;
  }
});

var _step = require("./step");

Object.defineProperty(exports, "Step", {
  enumerable: true,
  get: function get() {
    return _step.Step;
  }
});

var _ancestor = require("./ancestor");

Object.defineProperty(exports, "canLift", {
  enumerable: true,
  get: function get() {
    return _ancestor.canLift;
  }
});
Object.defineProperty(exports, "canWrap", {
  enumerable: true,
  get: function get() {
    return _ancestor.canWrap;
  }
});
Object.defineProperty(exports, "alreadyHasBlockType", {
  enumerable: true,
  get: function get() {
    return _ancestor.alreadyHasBlockType;
  }
});

var _join = require("./join");

Object.defineProperty(exports, "joinPoint", {
  enumerable: true,
  get: function get() {
    return _join.joinPoint;
  }
});
Object.defineProperty(exports, "joinableBlocks", {
  enumerable: true,
  get: function get() {
    return _join.joinableBlocks;
  }
});

var _map = require("./map");

Object.defineProperty(exports, "PosMap", {
  enumerable: true,
  get: function get() {
    return _map.PosMap;
  }
});
Object.defineProperty(exports, "MapResult", {
  enumerable: true,
  get: function get() {
    return _map.MapResult;
  }
});
Object.defineProperty(exports, "mapStep", {
  enumerable: true,
  get: function get() {
    return _map.mapStep;
  }
});
Object.defineProperty(exports, "Remapping", {
  enumerable: true,
  get: function get() {
    return _map.Remapping;
  }
});

},{"./ancestor":36,"./join":38,"./map":39,"./replace":40,"./split":41,"./step":42,"./style":43,"./transform":44}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.joinableBlocks = joinableBlocks;
exports.joinPoint = joinPoint;

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _map = require("./map");

(0, _step.defineStep)("join", {
  apply: function apply(doc, step) {
    var before = doc.path(step.from.path);
    var after = doc.path(step.to.path);
    if (step.from.offset < before.maxOffset || step.to.offset > 0 || !before.type.canContainChildren(after, true)) return null;
    var pFrom = step.from.path,
        pTo = step.to.path;
    var last = pFrom.length - 1,
        offset = pFrom[last] + 1;
    if (pFrom.length != pTo.length || pFrom.length == 0 || offset != pTo[last]) return null;
    for (var i = 0; i < last; i++) {
      if (pFrom[i] != pTo[i]) return null;
    }var targetPath = pFrom.slice(0, last);
    var target = doc.path(targetPath),
        oldSize = target.length;
    if (target.type.locked) return null;
    var joined = before.append(after.children);
    var copy = doc.replaceDeep(targetPath, target.splice(offset - 1, offset + 1, [joined]));

    var map = new _map.PosMap([new _map.MovedRange(step.to, after.maxOffset, step.from), new _map.MovedRange(new _model.Pos(targetPath, offset + 1), oldSize - offset - 1, new _model.Pos(targetPath, offset))], [new _map.ReplacedRange(step.from, step.to, step.from, step.from, step.to.shorten())]);
    return new _transform.TransformResult(copy, map);
  },
  invert: function invert(step, oldDoc) {
    return new _step.Step("split", null, null, step.from, oldDoc.path(step.to.path).copy());
  }
});

function joinableBlocks(doc, pos) {
  if (pos.offset == 0) return false;
  var parent = doc.path(pos.path);
  if (parent.isTextblock || pos.offset == parent.length) return false;
  var type = parent.child(pos.offset - 1).type;
  return !type.isTextblock && type.contains && type == parent.child(pos.offset).type;
}

function joinPoint(doc, pos) {
  var dir = arguments.length <= 2 || arguments[2] === undefined ? -1 : arguments[2];

  for (;;) {
    if (joinableBlocks(doc, pos)) return pos;
    if (pos.depth == 0) return null;
    pos = pos.shorten(null, dir < 0 ? 0 : 1);
  }
}

_transform.Transform.prototype.join = function (at) {
  var parent = this.doc.path(at.path);
  if (at.offset == 0 || at.offset == parent.length || parent.isTextblock) return this;
  this.step("join", new _model.Pos(at.path.concat(at.offset - 1), parent.child(at.offset - 1).maxOffset), new _model.Pos(at.path.concat(at.offset), 0));
  return this;
};

},{"../model":24,"./map":39,"./step":42,"./transform":44}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.mapStep = mapStep;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _step = require("./step");

var MovedRange = (function () {
  function MovedRange(start, size) {
    var dest = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    _classCallCheck(this, MovedRange);

    this.start = start;
    this.size = size;
    this.dest = dest;
  }

  _createClass(MovedRange, [{
    key: "toString",
    value: function toString() {
      return "[moved " + this.start + "+" + this.size + " to " + this.dest + "]";
    }
  }, {
    key: "end",
    get: function get() {
      return new _model.Pos(this.start.path, this.start.offset + this.size);
    }
  }]);

  return MovedRange;
})();

exports.MovedRange = MovedRange;

var Side = function Side(from, to, ref) {
  _classCallCheck(this, Side);

  this.from = from;
  this.to = to;
  this.ref = ref;
};

var ReplacedRange = (function () {
  function ReplacedRange(from, to, newFrom, newTo) {
    var ref = arguments.length <= 4 || arguments[4] === undefined ? from : arguments[4];
    var newRef = arguments.length <= 5 || arguments[5] === undefined ? newFrom : arguments[5];
    return (function () {
      _classCallCheck(this, ReplacedRange);

      this.before = new Side(from, to, ref);
      this.after = new Side(newFrom, newTo, newRef);
    }).apply(this, arguments);
  }

  _createClass(ReplacedRange, [{
    key: "toString",
    value: function toString() {
      return "[replaced " + this.before.from + "-" + this.before.to + " with " + this.after.from + "-" + this.after.to + "]";
    }
  }]);

  return ReplacedRange;
})();

exports.ReplacedRange = ReplacedRange;

var empty = [];

var MapResult = function MapResult(pos) {
  var deleted = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
  var recover = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  _classCallCheck(this, MapResult);

  this.pos = pos;
  this.deleted = deleted;
  this.recover = recover;
};

exports.MapResult = MapResult;

function offsetFrom(base, pos) {
  if (pos.path.length > base.path.length) {
    var path = [pos.path[base.path.length] - base.offset];
    for (var i = base.path.length + 1; i < pos.path.length; i++) {
      path.push(pos.path[i]);
    }return new _model.Pos(path, pos.offset);
  } else {
    return new _model.Pos([], pos.offset - base.offset);
  }
}

function mapThrough(map, pos, bias, back) {
  if (bias === undefined) bias = 1;

  for (var i = 0; i < map.replaced.length; i++) {
    var range = map.replaced[i],
        side = back ? range.after : range.before;
    var left = undefined,
        right = undefined;
    if ((left = pos.cmp(side.from)) >= 0 && (right = pos.cmp(side.to)) <= 0) {
      var other = back ? range.before : range.after;
      return new MapResult(bias < 0 ? other.from : other.to, !!(left && right), { rangeID: i, offset: offsetFrom(side.ref, pos) });
    }
  }

  for (var i = 0; i < map.moved.length; i++) {
    var range = map.moved[i];
    var start = back ? range.dest : range.start;
    if (pos.cmp(start) >= 0 && _model.Pos.cmp(pos.path, pos.offset, start.path, start.offset + range.size) <= 0) {
      var dest = back ? range.start : range.dest;
      var depth = start.depth;
      if (pos.depth > depth) {
        var offset = dest.offset + (pos.path[depth] - start.offset);
        return new MapResult(new _model.Pos(dest.path.concat(offset).concat(pos.path.slice(depth + 1)), pos.offset));
      } else {
        return new MapResult(new _model.Pos(dest.path, dest.offset + (pos.offset - start.offset)));
      }
    }
  }

  return new MapResult(pos);
}

var PosMap = (function () {
  function PosMap(moved, replaced) {
    _classCallCheck(this, PosMap);

    this.moved = moved || empty;
    this.replaced = replaced || empty;
  }

  _createClass(PosMap, [{
    key: "recover",
    value: function recover(offset) {
      return this.replaced[offset.rangeID].after.ref.extend(offset.offset);
    }
  }, {
    key: "map",
    value: function map(pos, bias) {
      return mapThrough(this, pos, bias, false);
    }
  }, {
    key: "invert",
    value: function invert() {
      return new InvertedPosMap(this);
    }
  }, {
    key: "toString",
    value: function toString() {
      return this.moved.concat(this.replaced).join(" ");
    }
  }]);

  return PosMap;
})();

exports.PosMap = PosMap;

var InvertedPosMap = (function () {
  function InvertedPosMap(map) {
    _classCallCheck(this, InvertedPosMap);

    this.inner = map;
  }

  _createClass(InvertedPosMap, [{
    key: "recover",
    value: function recover(offset) {
      return this.inner.replaced[offset.rangeID].before.ref.extend(offset.offset);
    }
  }, {
    key: "map",
    value: function map(pos, bias) {
      return mapThrough(this.inner, pos, bias, true);
    }
  }, {
    key: "invert",
    value: function invert() {
      return this.inner;
    }
  }, {
    key: "toString",
    value: function toString() {
      return "-" + this.inner;
    }
  }]);

  return InvertedPosMap;
})();

var nullMap = new PosMap();

exports.nullMap = nullMap;

var Remapping = (function () {
  function Remapping() {
    var head = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
    var tail = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
    var mirror = arguments.length <= 2 || arguments[2] === undefined ? Object.create(null) : arguments[2];

    _classCallCheck(this, Remapping);

    this.head = head;
    this.tail = tail;
    this.mirror = mirror;
  }

  _createClass(Remapping, [{
    key: "addToFront",
    value: function addToFront(map, corr) {
      this.head.push(map);
      var id = -this.head.length;
      if (corr != null) this.mirror[id] = corr;
      return id;
    }
  }, {
    key: "addToBack",
    value: function addToBack(map, corr) {
      this.tail.push(map);
      var id = this.tail.length - 1;
      if (corr != null) this.mirror[corr] = id;
      return id;
    }
  }, {
    key: "get",
    value: function get(id) {
      return id < 0 ? this.head[-id - 1] : this.tail[id];
    }
  }, {
    key: "map",
    value: function map(pos, bias) {
      var deleted = false;

      for (var i = -this.head.length; i < this.tail.length; i++) {
        var map = this.get(i);
        var result = map.map(pos, bias);
        if (result.recover) {
          var corr = this.mirror[i];
          if (corr != null) {
            i = corr;
            pos = this.get(corr).recover(result.recover);
            continue;
          }
        }
        if (result.deleted) deleted = true;
        pos = result.pos;
      }

      return new MapResult(pos, deleted);
    }
  }]);

  return Remapping;
})();

exports.Remapping = Remapping;

function maxPos(a, b) {
  return a.cmp(b) > 0 ? a : b;
}

function mapStep(step, remapping) {
  var allDeleted = true;
  var from = null,
      to = null,
      pos = null;

  if (step.from) {
    var result = remapping.map(step.from, 1);
    from = result.pos;
    if (!result.deleted) allDeleted = false;
  }
  if (step.to) {
    if (step.to.cmp(step.from) == 0) {
      to = from;
    } else {
      var result = remapping.map(step.to, -1);
      to = maxPos(result.pos, from);
      if (!result.deleted) allDeleted = false;
    }
  }
  if (step.pos) {
    if (from && step.pos.cmp(step.from) == 0) {
      pos = from;
    } else if (to && step.pos.cmp(step.to) == 0) {
      pos = to;
    } else {
      var result = remapping.map(step.pos, 1);
      pos = result.pos;
      if (!result.deleted) allDeleted = false;
    }
  }
  if (!allDeleted) return new _step.Step(step.name, from, to, pos, step.param);
}

},{"../model":24,"./step":42}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.replace = replace;

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _map = require("./map");

var _tree = require("./tree");

function findMovedChunks(oldNode, oldPath, newNode, startDepth) {
  var moved = [];
  var newPath = oldPath.path.slice(0, startDepth);

  for (var depth = startDepth;; depth++) {
    var joined = depth == oldPath.depth ? 0 : 1;
    var cut = depth == oldPath.depth ? oldPath.offset : oldPath.path[depth];
    var afterCut = oldNode.maxOffset - cut;
    var newOffset = newNode.maxOffset - afterCut;

    var from = oldPath.shorten(depth, joined);
    var to = new _model.Pos(newPath, newOffset + joined);
    if (from.cmp(to)) moved.push(new _map.MovedRange(from, afterCut - joined, to));

    if (!joined) return moved;

    oldNode = oldNode.child(cut);
    newNode = newNode.child(newOffset);
    newPath = newPath.concat(newOffset);
  }
}

function replace(node, from, to, root, repl) {
  var depth = arguments.length <= 5 || arguments[5] === undefined ? 0 : arguments[5];

  if (depth == root.length) {
    var _ret = (function () {
      var before = (0, _model.sliceBefore)(node, from, depth);
      var after = (0, _model.sliceAfter)(node, to, depth),
          result = undefined;
      if (!repl.nodes.every(function (n) {
        return before.type.canContain(n);
      })) return {
          v: null
        };
      if (repl.nodes.length) result = before.append(repl.nodes, from.depth - depth, repl.openLeft).append(after.children, repl.openRight, to.depth - depth);else result = before.append(after.children, from.depth - depth, to.depth - depth);
      if (!result.length && !result.type.canBeEmpty) result = result.copy(result.type.defaultContent());
      return {
        v: { doc: result, moved: findMovedChunks(node, to, result, depth) }
      };
    })();

    if (typeof _ret === "object") return _ret.v;
  } else {
    var pos = root[depth];
    var result = replace(node.child(pos), from, to, root, repl, depth + 1);
    if (!result) return null;
    return { doc: node.replace(pos, result.doc), moved: result.moved };
  }
}

var nullRepl = { nodes: [], openLeft: 0, openRight: 0 };

(0, _step.defineStep)("replace", {
  apply: function apply(doc, step) {
    var rootPos = step.pos,
        root = rootPos.path;
    if (step.from.depth < root.length || step.to.depth < root.length) return null;
    for (var i = 0; i < root.length; i++) {
      if (step.from.path[i] != root[i] || step.to.path[i] != root[i]) return null;
    }var result = replace(doc, step.from, step.to, rootPos.path, step.param || nullRepl);
    if (!result) return null;
    var out = result.doc;
    var moved = result.moved;

    var end = moved.length ? moved[moved.length - 1].dest : step.to;
    var replaced = new _map.ReplacedRange(step.from, step.to, step.from, end, rootPos, rootPos);
    return new _transform.TransformResult(out, new _map.PosMap(moved, [replaced]));
  },
  invert: function invert(step, oldDoc, map) {
    var depth = step.pos.depth;
    return new _step.Step("replace", step.from, map.map(step.to).pos, step.from.shorten(depth), {
      nodes: (0, _model.childrenBetween)(oldDoc.path(step.pos.path), step.from, step.to, depth),
      openLeft: step.from.depth - depth,
      openRight: step.to.depth - depth
    });
  },
  paramToJSON: function paramToJSON(param) {
    return param && { nodes: param.nodes && param.nodes.map(function (n) {
        return n.toJSON();
      }),
      openLeft: param.openLeft, openRight: param.openRight };
  },
  paramFromJSON: function paramFromJSON(schema, json) {
    return json && { nodes: json.nodes && json.nodes.map(schema.nodeFromJSON),
      openLeft: json.openLeft, openRight: json.openRight };
  }
});

function shiftFromStack(stack, depth) {
  var shifted = stack[depth] = stack[depth].splice(0, 1, []);
  for (var i = depth - 1; i >= 0; i--) {
    shifted = stack[i] = stack[i].replace(0, shifted);
  }
}

// FIXME find a not so horribly confusing way to express this
function buildInserted(nodesLeft, source, start, end) {
  var sliced = (0, _model.sliceBetween)(source, start, end, false);
  var nodesRight = [];
  for (var node = sliced, i = 0; i <= start.path.length; i++, node = node.firstChild) {
    nodesRight.push(node);
  }var same = (0, _tree.samePathDepth)(start, end);
  var searchLeft = nodesLeft.length - 1,
      searchRight = nodesRight.length - 1;
  var result = null;

  var inner = nodesRight[searchRight];
  if (inner.isTextblock && inner.length && nodesLeft[searchLeft].isTextblock) {
    result = nodesLeft[searchLeft--].copy(inner.children);
    --searchRight;
    shiftFromStack(nodesRight, searchRight);
  }

  for (;;) {
    var node = nodesRight[searchRight],
        type = node.type,
        matched = null;
    var outside = searchRight <= same;
    for (var i = searchLeft; i >= 0; i--) {
      var left = nodesLeft[i];
      if (outside ? left.type.canContainChildren(node) : left.type == type) {
        matched = i;
        break;
      }
    }
    if (matched != null) {
      if (!result) {
        result = nodesLeft[matched].copy(node.children);
        searchLeft = matched - 1;
      } else {
        while (searchLeft >= matched) {
          result = nodesLeft[searchLeft].copy(searchLeft == matched ? [result].concat(node.children) : [result]);
          searchLeft--;
        }
      }
    }
    if (matched != null || node.length == 0) {
      if (outside) break;
      if (searchRight) shiftFromStack(nodesRight, searchRight - 1);
    }
    searchRight--;
  }

  var repl = { nodes: result ? result.children : [],
    openLeft: start.depth - searchRight,
    openRight: end.depth - searchRight };
  return { repl: repl, depth: searchLeft + 1 };
}

function moveText(tr, doc, before, after) {
  var root = (0, _tree.samePathDepth)(before, after);
  var cutAt = after.shorten(null, 1);
  while (cutAt.path.length > root && doc.path(cutAt.path).length == 1) cutAt = cutAt.shorten(null, 1);
  tr.split(cutAt, cutAt.path.length - root);
  var start = after,
      end = new _model.Pos(start.path, doc.path(start.path).maxOffset);
  var parent = doc.path(start.path.slice(0, root));
  var wanted = parent.pathNodes(before.path.slice(root));
  var existing = parent.pathNodes(start.path.slice(root));
  while (wanted.length && existing.length && wanted[0].sameMarkup(existing[0])) {
    wanted.shift();
    existing.shift();
  }
  if (existing.length || wanted.length) tr.step("ancestor", start, end, null, {
    depth: existing.length,
    wrappers: wanted.map(function (n) {
      return n.copy();
    })
  });
  for (var i = root; i < before.path.length; i++) {
    tr.join(before.shorten(i, 1));
  }
}

/**
 * Delete content between two positions.
 *
 * @param  {Pos} from
 * @param  {Pos} to
 * @return this
 */
_transform.Transform.prototype["delete"] = function (from, to) {
  if (from.cmp(to)) this.replace(from, to);
  return this;
};

/**
 * Replace the content between two positions.
 */
_transform.Transform.prototype.replace = function (from, to, source, start, end) {
  var repl = undefined,
      depth = undefined,
      doc = this.doc,
      maxDepth = (0, _tree.samePathDepth)(from, to);
  if (source) {
    ;
    var _buildInserted = buildInserted(doc.pathNodes(from.path), source, start, end);

    repl = _buildInserted.repl;
    depth = _buildInserted.depth;

    while (depth > maxDepth) {
      if (repl.nodes.length) repl = { nodes: [doc.path(from.path.slice(0, depth)).copy(repl.nodes)],
        openLeft: repl.openLeft + 1, openRight: repl.openRight + 1 };
      depth--;
    }
  } else {
    repl = nullRepl;
    depth = maxDepth;
  }
  var root = from.shorten(depth),
      docAfter = doc,
      after = to;
  if (repl.nodes.length || (0, _tree.replaceHasEffect)(doc, from, to)) {
    var result = this.step("replace", from, to, root, repl);
    docAfter = result.doc;
    after = result.map.map(to).pos;
  }

  // If no text nodes before or after end of replacement, don't glue text
  if (!doc.path(to.path).isTextblock) return this;
  if (!(repl.nodes.length ? source.path(end.path).isTextblock : doc.path(from.path).isTextblock)) return this;

  var nodesAfter = doc.path(root.path).pathNodes(to.path.slice(depth)).slice(1);
  var nodesBefore = undefined;
  if (repl.nodes.length) {
    var inserted = repl.nodes;
    nodesBefore = [];
    for (var i = 0; i < repl.openRight; i++) {
      var last = inserted[inserted.length - 1];
      nodesBefore.push(last);
      inserted = last.children;
    }
  } else {
    nodesBefore = doc.path(root.path).pathNodes(from.path.slice(depth)).slice(1);
  }

  if (nodesBefore.length && (nodesAfter.length != nodesBefore.length || !nodesAfter.every(function (n, i) {
    return n.sameMarkup(nodesBefore[i]);
  }))) {
    var _after$shorten = after.shorten(root.depth);

    var path = _after$shorten.path;
    var offset = _after$shorten.offset;var before = undefined;
    for (var node = docAfter.path(path), i = 0;; i++) {
      if (i == nodesBefore.length) {
        before = new _model.Pos(path, offset);
        break;
      }
      path.push(offset - 1);
      node = node.child(offset - 1);
      offset = node.maxOffset;
    }
    moveText(this, docAfter, before, after);
  }
  return this;
};

_transform.Transform.prototype.replaceWith = function (from, to, nodes) {
  if (!Array.isArray(nodes)) nodes = [nodes];
  if (!_model.Pos.samePath(from.path, to.path)) return this;
  this.step("replace", from, to, from, { nodes: nodes, openLeft: 0, openRight: 0 });
  return this;
};

/**
 * Insert a node at a given position.
 *
 * @param  {Pos}   pos
 * @param  {mixed} nodes
 * @return {this}
 */
_transform.Transform.prototype.insert = function (pos, nodes) {
  return this.replaceWith(pos, pos, nodes);
};

_transform.Transform.prototype.insertInline = function (pos, nodes) {
  if (!Array.isArray(nodes)) nodes = [nodes];
  var styles = (0, _model.spanStylesAt)(this.doc, pos);
  nodes = nodes.map(function (n) {
    return n.styled(styles);
  });
  return this.insert(pos, nodes);
};

_transform.Transform.prototype.insertText = function (pos, text) {
  return this.insertInline(pos, this.doc.type.schema.text(text));
};

},{"../model":24,"./map":39,"./step":42,"./transform":44,"./tree":45}],41:[function(require,module,exports){
"use strict";

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _map = require("./map");

(0, _step.defineStep)("split", {
  apply: function apply(doc, step) {
    var pos = step.pos;
    if (pos.depth == 0) return null;

    var _pos$shorten = pos.shorten();

    var parentPath = _pos$shorten.path;
    var offset = _pos$shorten.offset;

    var parent = doc.path(parentPath);
    var target = parent.child(offset),
        targetSize = target.maxOffset;

    var splitAt = pos.offset;
    if (splitAt == 0 && !target.type.canBeEmpty || target.type.locked || splitAt == target.maxOffset && !(step.param || target).type.canBeEmpty) return null;
    var newParent = parent.splice(offset, offset + 1, [target.copy(target.slice(0, splitAt)), (step.param || target).copy(target.slice(splitAt))]);
    var copy = doc.replaceDeep(parentPath, newParent);

    var dest = new _model.Pos(parentPath.concat(offset + 1), 0);
    var map = new _map.PosMap([new _map.MovedRange(pos, targetSize - pos.offset, dest), new _map.MovedRange(new _model.Pos(parentPath, offset + 1), newParent.length - 2 - offset, new _model.Pos(parentPath, offset + 2))], [new _map.ReplacedRange(pos, pos, pos, dest, pos, pos.shorten(null, 1))]);
    return new _transform.TransformResult(copy, map);
  },
  invert: function invert(step, _oldDoc, map) {
    return new _step.Step("join", step.pos, map.map(step.pos).pos);
  },
  paramToJSON: function paramToJSON(param) {
    return param && param.toJSON();
  },
  paramFromJSON: function paramFromJSON(schema, json) {
    return json && schema.nodeFromJSON(json);
  }
});

_transform.Transform.prototype.split = function (pos) {
  var depth = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
  var nodeAfter = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  if (depth == 0) return this;
  for (var i = 0;; i++) {
    this.step("split", null, null, pos, nodeAfter);
    if (i == depth - 1) return this;
    nodeAfter = null;
    pos = pos.shorten(null, 1);
  }
};

_transform.Transform.prototype.splitIfNeeded = function (pos) {
  var depth = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

  for (var off = 0; off < depth; off++) {
    var here = pos.shorten(pos.depth - off);
    if (here.offset && here.offset < this.doc.path(here.path).maxOffset) this.step("split", null, null, here);
  }
  return this;
};

},{"../model":24,"./map":39,"./step":42,"./transform":44}],42:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.defineStep = defineStep;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var Step = (function () {
  function Step(name, from, to, pos) {
    var param = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

    _classCallCheck(this, Step);

    if (!(name in steps)) throw new Error("Unknown step type: " + name);
    this.name = name;
    this.from = from;
    this.to = to;
    this.pos = pos;
    this.param = param;
  }

  _createClass(Step, [{
    key: "apply",
    value: function apply(doc) {
      return steps[this.name].apply(doc, this);
    }
  }, {
    key: "invert",
    value: function invert(oldDoc, map) {
      return steps[this.name].invert(this, oldDoc, map);
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var impl = steps[this.name];
      return {
        name: this.name,
        from: this.from,
        to: this.to,
        pos: this.pos,
        param: impl.paramToJSON ? impl.paramToJSON(this.param) : this.param
      };
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      var impl = steps[json.name];
      return new Step(json.name, json.from && _model.Pos.fromJSON(json.from), json.to && _model.Pos.fromJSON(json.to), json.pos && _model.Pos.fromJSON(json.pos), impl.paramFromJSON ? impl.paramFromJSON(schema, json.param) : json.param);
    }
  }]);

  return Step;
})();

exports.Step = Step;

var steps = Object.create(null);

function defineStep(name, impl) {
  steps[name] = impl;
}

},{"../model":24}],43:[function(require,module,exports){
"use strict";

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _tree = require("./tree");

(0, _step.defineStep)("addStyle", {
  apply: function apply(doc, step) {
    return new _transform.TransformResult((0, _tree.copyStructure)(doc, step.from, step.to, function (node, from, to) {
      if (!node.type.canContainStyle(step.param)) return node;
      return (0, _tree.copyInline)(node, from, to, function (node) {
        return node.styled(step.param.addToSet(node.styles));
      });
    }));
  },
  invert: function invert(step, _oldDoc, map) {
    return new _step.Step("removeStyle", step.from, map.map(step.to).pos, null, step.param);
  },
  paramToJSON: function paramToJSON(param) {
    return param.toJSON();
  },
  paramFromJSON: function paramFromJSON(schema, json) {
    return schema.styleFromJSON(json);
  }
});

_transform.Transform.prototype.addStyle = function (from, to, st) {
  var _this = this;

  var removed = [],
      added = [],
      removing = null,
      adding = null;
  this.doc.inlineNodesBetween(from, to, function (span, start, end, path, parent) {
    if (st.isInSet(span.styles) || !parent.type.canContainStyle(st.type)) {
      adding = removing = null;
    } else {
      path = path.slice();
      var rm = (0, _model.containsStyle)(span.styles, st.type);
      if (rm) {
        if (removing && removing.param.eq(rm)) {
          removing.to = new _model.Pos(path, end);
        } else {
          removing = new _step.Step("removeStyle", new _model.Pos(path, start), new _model.Pos(path, end), null, rm);
          removed.push(removing);
        }
      } else if (removing) {
        removing = null;
      }
      if (adding) {
        adding.to = new _model.Pos(path, end);
      } else {
        adding = new _step.Step("addStyle", new _model.Pos(path, start), new _model.Pos(path, end), null, st);
        added.push(adding);
      }
    }
  });
  removed.forEach(function (s) {
    return _this.step(s);
  });
  added.forEach(function (s) {
    return _this.step(s);
  });
  return this;
};

(0, _step.defineStep)("removeStyle", {
  apply: function apply(doc, step) {
    return new _transform.TransformResult((0, _tree.copyStructure)(doc, step.from, step.to, function (node, from, to) {
      return (0, _tree.copyInline)(node, from, to, function (node) {
        return node.styled(step.param.removeFromSet(node.styles));
      });
    }));
  },
  invert: function invert(step, _oldDoc, map) {
    return new _step.Step("addStyle", step.from, map.map(step.to).pos, null, step.param);
  },
  paramToJSON: function paramToJSON(param) {
    return param.toJSON();
  },
  paramFromJSON: function paramFromJSON(schema, json) {
    return schema.styleFromJSON(json);
  }
});

_transform.Transform.prototype.removeStyle = function (from, to) {
  var _this2 = this;

  var st = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  var matched = [],
      step = 0;
  this.doc.inlineNodesBetween(from, to, function (span, start, end, path) {
    step++;
    var toRemove = null;
    if (st instanceof _model.StyleType) {
      var found = (0, _model.containsStyle)(span.styles, st);
      if (found) toRemove = [found];
    } else if (st) {
      if (st.isInSet(span.styles)) toRemove = [st];
    } else {
      toRemove = span.styles;
    }
    if (toRemove && toRemove.length) {
      path = path.slice();
      for (var i = 0; i < toRemove.length; i++) {
        var rm = toRemove[i],
            found = undefined;
        for (var j = 0; j < matched.length; j++) {
          var m = matched[j];
          if (m.step == step - 1 && rm.eq(matched[j].style)) found = m;
        }
        if (found) {
          found.to = new _model.Pos(path, end);
          found.step = step;
        } else {
          matched.push({ style: rm, from: new _model.Pos(path, start), to: new _model.Pos(path, end), step: step });
        }
      }
    }
  });
  matched.forEach(function (m) {
    return _this2.step("removeStyle", m.from, m.to, null, m.style);
  });
  return this;
};

_transform.Transform.prototype.clearMarkup = function (from, to, newParent) {
  var _this3 = this;

  var delSteps = []; // Must be accumulated and applied in inverse order
  this.doc.inlineNodesBetween(from, to, function (span, start, end, path) {
    if (newParent ? !newParent.canContainType(span.type) : !span.isText) {
      path = path.slice();
      var _from = new _model.Pos(path, start);
      delSteps.push(new _step.Step("replace", _from, new _model.Pos(path, end), _from));
      return;
    }
    for (var i = 0; i < span.styles.length; i++) {
      var st = span.styles[i];
      if (!newParent || !newParent.canContainStyle(st.type)) {
        path = path.slice();
        _this3.step("removeStyle", new _model.Pos(path, start), new _model.Pos(path, end), null, st);
      }
    }
  });
  for (var i = delSteps.length - 1; i >= 0; i--) {
    this.step(delSteps[i]);
  }return this;
};

},{"../model":24,"./step":42,"./transform":44,"./tree":45}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _step2 = require("./step");

var _map = require("./map");

var TransformResult = function TransformResult(doc) {
  var map = arguments.length <= 1 || arguments[1] === undefined ? _map.nullMap : arguments[1];

  _classCallCheck(this, TransformResult);

  this.doc = doc;
  this.map = map;
};

exports.TransformResult = TransformResult;

var Transform = (function () {
  function Transform(doc) {
    _classCallCheck(this, Transform);

    this.docs = [doc];
    this.steps = [];
    this.maps = [];
  }

  _createClass(Transform, [{
    key: "step",
    value: function step(_step, from, to, pos, param) {
      if (typeof _step == "string") _step = new _step2.Step(_step, from, to, pos, param);
      var result = _step.apply(this.doc);
      if (result) {
        this.steps.push(_step);
        this.maps.push(result.map);
        this.docs.push(result.doc);
      }
      return result;
    }
  }, {
    key: "map",
    value: function map(pos, bias) {
      var deleted = false;
      for (var i = 0; i < this.maps.length; i++) {
        var result = this.maps[i].map(pos, bias);
        pos = result.pos;
        if (result.deleted) deleted = true;
      }
      return new _map.MapResult(pos, deleted);
    }
  }, {
    key: "doc",
    get: function get() {
      return this.docs[this.docs.length - 1];
    }
  }, {
    key: "before",
    get: function get() {
      return this.docs[0];
    }
  }]);

  return Transform;
})();

exports.Transform = Transform;

},{"./map":39,"./step":42}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyStructure = copyStructure;
exports.copyInline = copyInline;
exports.isFlatRange = isFlatRange;
exports.replaceHasEffect = replaceHasEffect;
exports.samePathDepth = samePathDepth;

function copyStructure(node, from, to, f) {
  var depth = arguments.length <= 4 || arguments[4] === undefined ? 0 : arguments[4];

  if (node.isTextblock) {
    return f(node, from, to);
  } else {
    if (!node.length) return node;
    var start = from ? from.path[depth] : 0;
    var end = to ? to.path[depth] : node.length - 1;
    var content = node.slice(0, start);
    if (start == end) {
      content.push(copyStructure(node.child(start), from, to, f, depth + 1));
    } else {
      content.push(copyStructure(node.child(start), from, null, f, depth + 1));
      for (var i = start + 1; i < end; i++) {
        content.push(copyStructure(node.child(i), null, null, f, depth + 1));
      }content.push(copyStructure(node.child(end), null, to, f, depth + 1));
    }
    for (var i = end + 1; i < node.length; i++) {
      content.push(node.child(i));
    }return node.copy(content);
  }
}

function copyInline(node, from, to, f) {
  var start = from ? from.offset : 0;
  var end = to ? to.offset : node.maxOffset;
  var copied = node.slice(0, start).concat(node.slice(start, end).map(f)).concat(node.slice(end));
  for (var i = copied.length - 2; i >= 0; i--) {
    var merged = copied[i].maybeMerge(copied[i + 1]);
    if (merged) copied.splice(i, 2, merged);
  }
  return node.copy(copied);
}

function isFlatRange(from, to) {
  if (from.path.length != to.path.length) return false;
  for (var i = 0; i < from.path.length; i++) {
    if (from.path[i] != to.path[i]) return false;
  }return from.offset <= to.offset;
}

function canBeJoined(node, offset, depth) {
  if (!depth || offset == 0 || offset == node.length) return false;
  var left = node.child(offset - 1),
      right = node.child(offset);
  return left.sameMarkup(right);
}

function replaceHasEffect(doc, from, to) {
  for (var depth = 0, node = doc;; depth++) {
    var fromEnd = depth == from.depth,
        toEnd = depth == to.depth;
    if (fromEnd || toEnd || from.path[depth] != to.path[depth]) {
      var gapStart = undefined,
          gapEnd = undefined;
      if (fromEnd) {
        gapStart = from.offset;
      } else {
        gapStart = from.path[depth] + 1;
        for (var i = depth + 1, n = node.child(gapStart - 1); i <= from.path.length; i++) {
          if (i == from.path.length) {
            if (from.offset < n.maxOffset) return true;
          } else {
            if (from.path[i] + 1 < n.maxOffset) return true;
            n = n.child(from.path[i]);
          }
        }
      }
      if (toEnd) {
        gapEnd = to.offset;
      } else {
        gapEnd = to.path[depth];
        for (var i = depth + 1; i <= to.path.length; i++) {
          if ((i == to.path.length ? to.offset : to.path[i]) > 0) return true;
        }
      }
      if (gapStart != gapEnd) return true;
      return canBeJoined(node, gapStart, Math.min(from.depth, to.depth) - depth);
    } else {
      node = node.child(from.path[depth]);
    }
  }
}

function samePathDepth(a, b) {
  for (var i = 0;; i++) {
    if (i == a.path.length || i == b.path.length || a.path[i] != b.path[i]) return i;
  }
}

},{}],46:[function(require,module,exports){
// FIXME move this into core

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Debounced = (function () {
  function Debounced(pm, delay, f) {
    _classCallCheck(this, Debounced);

    this.pm = pm;
    this.delay = delay;
    this.scheduled = null;
    this.f = f;
    this.pending = null;
  }

  _createClass(Debounced, [{
    key: "trigger",
    value: function trigger() {
      var _this = this;

      window.clearTimeout(this.scheduled);
      this.scheduled = window.setTimeout(function () {
        return _this.fire();
      }, this.delay);
    }
  }, {
    key: "fire",
    value: function fire() {
      var _this2 = this;

      if (!this.pending) {
        if (this.pm.operation) this.pm.on("flush", this.pending = function () {
          _this2.pm.off("flush", _this2.pending);
          _this2.pending = null;
          _this2.f();
        });else this.f();
      }
    }
  }, {
    key: "clear",
    value: function clear() {
      window.clearTimeout(this.scheduled);
    }
  }]);

  return Debounced;
})();

exports.Debounced = Debounced;

},{}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ProseMirrorError = (function (_Error) {
  _inherits(ProseMirrorError, _Error);

  function ProseMirrorError(message) {
    _classCallCheck(this, ProseMirrorError);

    _get(Object.getPrototypeOf(ProseMirrorError.prototype), "constructor", this).call(this, message);
    if (this.message != message) {
      this.message = message;
      if (Error.captureStackTrace) Error.captureStackTrace(this, this.name);else this.stack = new Error(message).stack;
    }
  }

  _createClass(ProseMirrorError, [{
    key: "name",
    get: function get() {
      return this.constructor.name || functionName(this.constructor) || "ProseMirrorError";
    }
  }], [{
    key: "raise",
    value: function raise(message) {
      throw new this(message);
    }
  }]);

  return ProseMirrorError;
})(Error);

exports.ProseMirrorError = ProseMirrorError;

function functionName(f) {
  var match = /^function (\w+)/.exec(f.toString());
  return match && match[1];
}

},{}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Map = window.Map || (function () {
  function _class() {
    _classCallCheck(this, _class);

    this.content = [];
  }

  _createClass(_class, [{
    key: "set",
    value: function set(key, value) {
      var found = this.find(key);
      if (found > -1) this.content[found + 1] = value;else this.content.push(key, value);
    }
  }, {
    key: "get",
    value: function get(key) {
      var found = this.find(key);
      return found == -1 ? undefined : this.content[found + 1];
    }
  }, {
    key: "has",
    value: function has(key) {
      return this.find(key) > -1;
    }
  }, {
    key: "find",
    value: function find(key) {
      for (var i = 0; i < this.content.length; i += 2) {
        if (this.content[i] === key) return i;
      }
    }
  }, {
    key: "clear",
    value: function clear() {
      this.content.length = 0;
    }
  }, {
    key: "size",
    get: function get() {
      return this.content.length / 2;
    }
  }]);

  return _class;
})();
exports.Map = Map;

},{}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = sortedInsert;

function sortedInsert(array, elt, compare) {
  var i = 0;
  for (; i < array.length; i++) if (compare(array[i], elt) > 0) break;
  array.splice(i, 0, elt);
}

module.exports = exports["default"];

},{}]},{},[1]);
