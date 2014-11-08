/**
 * @file Functions related to the chat system.
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
    * Functions to insert or update specific elements in the current position of the caret.
    * @namespace chatHelpers
    */
         insertElement = {};

    insertElement.findRange = function () {
        var selection = rangy.getSelection(),
            range;

        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            if (jQuery(range.startContainer).closest('#document-editable').length===0) {
                return false;
            }

        } else {
            return false;
        }
        return range;
    };


    insertElement.link = function (link, linkText) {
        var range = insertElement.findRange(), oldLinkElement = jQuery(range.startContainer).closest('a')[0];
        if(!range) {
            return false;
        }
        if (oldLinkElement) {
            // If a link element exists already, it needs to be removed first. it cannot be directly updated due to possible tracking.
            manualEdits.remove(oldLinkElement, range, false);
            // Range may have been invalidated.
            range = insertElement.findRange();
        }
        linkElement = document.createElement('a');
        linkElement.setAttribute('href', link);
        linkElement.textContent = linkText;
        // Make sure to get out of any track changes node if tracking is disabled.
        range = dom.noTrackIfDisabled(range);
        // Make sure to get out of any citation node.
        range = dom.noCitationOrLinkNode(range);
        // Insert the new link node
        manualEdits.insert(linkElement, range);

    };



    exports.insertElement = insertElement;

}).call(this);
