/**
 * @file Handles the pressing of keys on the editor page. Needs to work around bugs in Chrome/Safari.
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm.
 *
 * @license This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <a href='http://www.gnu.org/licenses'>http://www.gnu.org/licenses</a>.
 *
 */
(function () {
    var exports = this,
        /** Handles key press events on the editor page. TODO 
         * @namespace keyEventsFirefox
         */
        keyEventsFirefox = {};
    var ARROW_DOWN = 40;
    var LASTS_OF_ALL_EDITABLE_BLOCKS = [
      '#document-contents > p:eq(-1)',
      '#document-contents > ol:eq(-1)',
      '#document-contents > ul:eq(-1)',
    ].join(',');
    var LASTS_OF_ALL_EDITABLE_INLINES = [
      // !!! what about text nodes?
      '> a:eq(-1)',
      '> b:eq(-1)',
      '> i:eq(-1)',
      // !!! what about comments?
    ].join(',');


    keyEventsFirefox.bindEvents = function () {
        // Send keydown events while editing by testKeyPressEditing.
        jQuery('.editable').bind('keydown', function (evt) {
            if (theDocumentValues.disableInput) {
                evt.preventDefault();
                return true;
            }
            return keyEventsFirefox.testKeyPressEditing(evt, this);
        });
        jQuery('.editable').bind('keyup', function (evt) {
            if (theDocumentValues.disableInput) {
                evt.preventDefault();
                return true;
            }
            return keyEventsFirefox.testKeyPressAfterEditing(evt, this);
        });

    };

    keyEventsFirefox.testKeyPressEditor = function (evt) {
        return true;
    };


  keyEventsFirefox.testKeyPressEditing = function (evt, editorContainer) {
    // !!!
    // untested
    var caret = getCaret();
    var newCaret;

    switch (evt.which) {
    case ARROW_DOWN:
      newCaret = keyEventsFirefox.arrowDown(evt, caret);
      break;
    }

    if (newCaret && newCaret !== caret) {
      setCaret(newCaret);
    }
  };


  keyEventsFirefox.testKeyPressAfterEditing = function (evt, editorContainer) {
    return;
  };


  /**
   * Prevents the caret from leaving the text node if there is no editable line
   * below.
   * @function arrowDown
   * @memberof keyEventsFirefox
   * @param {...} ...
   * @returns {...}
   */
  keyEventsFirefox.arrowDown = function arrowDownHandler(evt, caret) {
    // !!!
    // untested
    if (!atLastDocumentLine(caret)) {
      return null;
    }
      
    evt.preventDefault();
    return setCaret({
      node: caret.node,
      offset: caret.node.length,
    });
  };

  function atLastDocumentLine(caret) {
    // !!!
    // untested
    // that is a lot of querying for a navigation key
    return getLastDocumentTextNode().is(caret.node);
  }

  function getLastDocumentTextNode() {
    // !!!
    // untested
    return $(LASTS_OF_ALL_EDITABLE_BLOCKS).last()
          .find(LASTS_OF_ALL_EDITABLE_INLINES).last()
          .contents().last(); // text node
  }

  function getCaret() {
    // !!!
    // untested
    // global dependency
    // assumes collapsed caret
    var caret;
    var range = rangy.getSelection().getRangeAt(0);
    var node = range.startContainer;
    var offset = range.startOffset;

    caret = {
      node: node,
      offset: offset,
    };
    return caret;
  }

  function setCaret(caret) {
    // !!!
    // untested
    // global dependency
    var selection = rangy.getSelection();
    var r = rangy.createRange();
    var toStart = true;

    r.collapse(toStart);
    r.setStart(
      caret.node,
      caret.offset
    );

    selection.removeAllRanges();
    selection.addRange(r);
  }


  exports.keyEventsFirefox = keyEventsFirefox;

}).call(this);