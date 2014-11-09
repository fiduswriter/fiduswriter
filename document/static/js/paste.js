/**
 * @file Functions to deal with copy and paste.
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
(function() {
    var exports = this,
        /**
         * Functions related to pasting in the editor. TODO
         * @namespace paste
         */
        paste = {};

    paste.addPasteContents = function(pasteElement, footnotes) {
        var selection = rangy.getSelection(),
            range = selection.getRangeAt(0),
            startFigure = false, // A figure at the start of the paste.
            endFigure = false, // A figure at the end of the paste.
            newNode;
        if (editorHelpers.TEXT_ELEMENTS.indexOf(jQuery(range.startContainer).closest('.editable')[0].id)!=-1) {
            // We are inside an element that does not allow complex HTML.
            // Paste therefore only text contents and forget about footnotes.
            pasteElement.textContent = pasteElement.textContent;
            footnotes = false;
        }
        if (pasteElement.firstChild.nodeName==='FIGURE') {
            startFigure = pasteElement.firstChild;
        }
        if (pasteElement.lastChild.nodeName==='FIGURE') {
            endFigure = pasteElement.lastChild;
        }
        while (pasteElement.firstChild) {
            manualEdits.insert(pasteElement.firstChild, range);
        }
        // If there is no text block node before a figure at the start of the paste, add it now.
        if (startFigure && ((!startFigure.previousSibling) || editorHelpers.TEXT_BLOCK_ELEMENTS.indexOf(startFigure.previousSibling.nodeName) === -1)) {
            newNode = document.createElement('p');
            newNode.innerHTML = '<br/>';
            startFigure.parentNode.insertBefore(newNode, startFigure);
        }
        // If there is no text block node after a figure at the end of the paste, add it now.
        if (endFigure && ((!endFigure.nextSibling) || editorHelpers.TEXT_BLOCK_ELEMENTS.indexOf(endFigure.nextSibling.nodeName) === -1)) {
            newNode = document.createElement('p');
            newNode.innerHTML = '<br/>';
            endFigure.parentNode.insertBefore(newNode, endFigure.nextSibling);
        }
        if (footnotes) {
            editorEscapes.reset();
        }
        return true;
    };

    paste.insertText = function (textString) {
        var pasteElement = document.createElement('div');
            pasteElement.textcontent = textString;
        paste.addPasteContents(pasteElement, false);
    };


    paste.insertHTML = function (htmlString) {
        var pasteElement = document.createElement('div'),
            htmlCleaner;
            pasteElement.innerHTML = htmlString;
            htmlCleaner = new cleanHTML(pasteElement);
        paste.addPasteContents(pasteElement, htmlCleaner.footnotes);
    };

    paste.recentlyPasted = false; // prevent double pasting by checking whether paste has been done recently

    paste.handlePaste = function(event) {
        // We cancel the paste event, copy clipboard data, clean it, insert it
        var htmlString;
        event.stopPropagation();
        event.preventDefault();
        if (!paste.recentlyPasted) {
            paste.recentlyPasted = true;
            setTimeout(function() {
                paste.recentlyPasted = false;
            }, 1)

            if (/text\/html/.test(event.clipboardData.types)) {
                paste.insertHTML(event.clipboardData.getData(
                    'text/html'));
            } else if (/text\/plain/.test(event.clipboardData.types)) {
                paste.insertText(event.clipboardData.getData(
                    'text/plain'));
            }
        }
    };

    exports.paste = paste;

}).call(this);
