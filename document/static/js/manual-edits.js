/**
 * @ Connects the editor with ICE tracking.
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
   /**
  * Functions to call to insert/delete items in the editable area of the editor. It communictaes with ICE to find out if item removal/insertion should be tracked. TODO
  * @namespace manualEdits
  */
        manualEdits = {};

        var topBlockElements = {
            'P': true,
            'H1': true,
            'H2': true,
            'H3': true,
            'UL': true,
            'OL': true,
            'FIGURE': true,
            'BLOCKQUOTE': true,
            'CODE': true,
        };

  /** Insert an item
   * @function insert
  * @memberof manualEdits
  * @param node Node to be inserted
  * @param range Current selection range
  */
    manualEdits.insert = function(node, range) {
        var tmpNextBlockNode = false, thisBlockNode, selection;

        if (node.nodeName in topBlockElements && (range.startContainer.nodeName === '#text' || !range.startContainer.classList.contains('editable'))) {
            thisBlockNode = jQuery(range.startContainer).closest('div, p, h1, h2, h3, ul, ol, figure, blockquote, code')[0];
            range.selectNode(thisBlockNode);
            range.collapse();

        }
        if (theDocument.settings.tracking) {
            var returnValue = tracker.insert(node, range);
            editorHelpers.documentHasChanged();
            return returnValue;
        } else {
            range.insertNode(node);
            range.selectNode(node);
            range.collapse();
            editorHelpers.documentHasChanged();
        }
        selection = rangy.getSelection();
        selection.setSingleRange(range);
        if (node.nextSibling) {
            node.nextSibling.scrollIntoView();
        } else {
            node.scrollIntoView();
        }

    };
  /** Remove an item
   * @function remove
  * @memberof manualEdits
  * @param node Node to be removed
  * @param range Current selection range
  * @param moveLeft Whether to move to the left of the deleted item after deletion has taken place (only interesting if changes are tracked).
  */
    manualEdits.remove = function(node, range, moveLeft) {

        if (theDocument.settings.tracking) {
            returnValue = tracker._addNodeTracking(node, range, moveLeft);
            editorHelpers.documentHasChanged();
            return returnValue;
        } else {
            returnValue = jQuery(node).remove();
            editorHelpers.documentHasChanged();
            return returnValue;
        }
    };


    exports.manualEdits = manualEdits;

}).call(this);
