/**
 * @license This file is part of Fidus Writer <http://www.fiduswriter.org>
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm
 *
 * This program is free software: you can redistribute it and/or modify
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

(function () {
    var exports = this,
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
        
        
    manualEdits.insert = function(node, range) {
        var tmpNextBlockNode = false, thisBlockNode;
        if (node.nodeName in topBlockElements && (range.startContainer.nodeName === '#text' || !range.startContainer.classList.contains('editable'))) {
            thisBlockNode = jQuery(range.startContainer).closest('p, h1, h2, h3, ul, ol, figure, blockquote, code')[0];
            range.selectNode(thisBlockNode);
            range.collapse();
            return;
        }
        if (theDocument.settings.tracking) {

            return tracker.insert(node, range);
        } else {
            range.insertNode(node);
            range.selectNode(node);
            range.collapse();
            // check if there is a Mongolian vowel space behind the node we just inserted. If so, remove it.
             if (node.nextSibling && node.nextSibling.nodeType === 3 && node.nextSibling.data === '\u180e') {
                jQuery(node.nextSibling).remove();
            } 
        }
   
    };
    
    manualEdits.remove = function(node, range, moveLeft) {
        if (theDocument.settings.tracking) {
            return tracker._addNodeTracking(node, range, moveLeft);
        } else {
            return jQuery(node).remove();
        }
    };    

    
    exports.manualEdits = manualEdits;

}).call(this);
