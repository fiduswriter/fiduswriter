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

(function () {
    var exports = this,
  /**
  * Functions related to pasting in the editor. TODO
  * @namespace paste
  */
        paste = {};

    paste.addPasteContents = function (pasteElement, footnotes) {
        var selection = rangy.getSelection();
        var range = selection.getRangeAt(0);
        while (pasteElement.firstChild) {
            manualEdits.insert(pasteElement.firstChild, range);
        }
        if (footnotes) {
            editorEscapes.reset();
        }
        return true;
    };

    paste.recentlyPasted = false; // prevent double pasting by checking whether paste has been done recently

    paste.handlePaste = function (event) {
        var footnotes = false, pasteElement, htmlCleaner;
        // We cancel the paste event, copy clipboard data, clean it, insert it

            event.stopPropagation();
            event.preventDefault();
            if (!paste.recentlyPasted) {
                paste.recentlyPasted = true;
                setTimeout(function () {
                    paste.recentlyPasted = false;
                }, 1)
                pasteElement = document.createElement('div');

                if (/text\/html/.test(event.clipboardData.types)) {
                    pasteElement.innerHTML = event.clipboardData.getData(
                        'text/html');
                    htmlCleaner = new cleanHTML(pasteElement);
                    footnotes = htmlCleaner.footnotes;

                } else if (/text\/plain/.test(event.clipboardData.types)) {
                    pasteElement.textContent = event.clipboardData.getData(
                        'text/plain');
                }

                paste.addPasteContents(pasteElement, footnotes);
                return false;
            }
    };

    exports.paste = paste;

}).call(this);
