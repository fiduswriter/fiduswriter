/**
 * This file is part of Fidus Writer <http://www.fiduswriter.org>
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
        paste = {};

    paste.removeExtraFormatting = function (elem, pasteElement) {
        
        if (elem.classList.contains('editable')) {

            cleanHTML.init(pasteElement); // Clean the html for the body text
        } else {
            pasteElement.innerHTML = pasteElement.innerText; // Remove all html tags in the title
        }
        return true;

    };

    paste.addPasteContents = function (pasteElement) { // Webkit
        var selection = rangy.getSelection();
        var range = selection.getRangeAt(0);
        while (pasteElement.firstChild) {
            manualEdits.insert(pasteElement.firstChild, range);
        }
        if (cleanHTML.footnoteInOutput) {
            document.getElementById('flow').dispatchEvent(pagination.events.redoEscapes);
            cleanHTML.footnoteInOutput = false;
        }
        return true;
    };

    paste.waitForPaste = function (elem, oldLength) { // IE/Firefox
        if (oldLength != elem.innerHTML.length) {
            paste.removeExtraFormatting(elem, elem);
        } else {

            var that = {
                e: elem,
                o: oldLength,
            }
            that.callself = function () {
                paste.waitForPaste(that.e, that.o)
            }
            setTimeout(that.callself, 20);
        }
    };

    paste.notRecentlyPasted = true; // prevent double pasting by checking whether paste has been done recently

    paste.handlePaste = function (e) {
        if (e && e.clipboardData && e.clipboardData.getData) { // Webkit: we cancel the paste event, copy clipboard data, clean it, insert it
            e.stopPropagation();
            e.preventDefault();
            if (paste.notRecentlyPasted) {
                paste.notRecentlyPasted = false;
                setTimeout(function () {
                    paste.notRecentlyPasted = true;
                }, 1)
                var pasteElement = document.createElement('div');

                if (/text\/html/.test(e.clipboardData.types)) {
                    pasteElement.innerHTML = e.clipboardData.getData(
                        'text/html');
                    paste.removeExtraFormatting(this, pasteElement);

                } else if (/text\/plain/.test(e.clipboardData.types)) {
                    pasteElement.innerText = e.clipboardData.getData(
                        'text/plain');
                }

                paste.addPasteContents(pasteElement);
                return false;
            }
        } else { // IE/Firefox - we wait for the paste to happen, then clean up the entire element
            var oldLength = this.innerHTML.length;
            paste.waitForPaste(this, oldLength);
            return true;
        }
        
    };


    exports.paste = paste;

}).call(this);

(function () {
    var exports = this,
        cut = {};

    cut.waitForCut = function (elem, oldString) { //IE/Firefox/Webkit
        if (oldString != elem.innerHTML) {

        } else {

            var that = {
                e: elem,
                o: oldString,
            }
            that.callself = function () {
                cut.waitForCut(that.e, that.o)
            }
            setTimeout(that.callself, 20);
        }

    };

    cut.notRecentlyCut = true; // prevent double cutting by checking whether cut has been done recently

    cut.handleCut = function (e) {
        if (cut.notRecentlyCut) {
            cut.notRecentlyCut = false;
            var oldString = this.innerHTML;
            cut.waitForCut(this, oldString);
            setTimeout(function () {
                cut.notRecentlyCut = true;
            }, 1000)
        }
        return false;
    };

    exports.cut = cut;

}).call(this);