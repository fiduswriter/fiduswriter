/**
 * @file Handles the tools menu of the editor
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
  * Helper functions for the the items in the tools menu of the editor.
  * @namespace toolsHelpers
  */
        toolsHelpers = {};


    toolsHelpers.countWords = function () {
        var textContent = theEditor.pm.doc.textContent,
            footnoteContent = theEditor.mod.footnotes.fnPm.doc.textContent
            bibliographyContent = document.getElementById('document-bibliography').textContent,
            wholeContent = textContent + ' ' + footnoteContent + ' ' + bibliographyContent,
            numChars = wholeContent.length - 2; // Subtract two for added spaces

        wholeContent = wholeContent.replace(/(^\s*)|(\s*$)/gi,"");
        wholeContent = wholeContent.replace(/[ ]{2,}/gi," ");
        wholeContent = wholeContent.replace(/\n /,"\n");
        wholeContent = wholeContent.split(' ');

        var numWords = wholeContent.length;
        var numNoSpace = wholeContent.join('').length;

        return {
            numWords: numWords,
            numNoSpace: numNoSpace,
            numChars: numChars
        }
    }

  /** Calculates words and characters of document and displays a dialog with the results.
   * @function wordCounter
  * @memberof toolsHelpers
  */
    toolsHelpers.wordCounter = function() {


        var stats = toolsHelpers.countWords()

        diaButtons = {'Close': function() {
            jQuery('#word-counter-dialog').dialog('close');
        }};

        jQuery('body').append(tmp_tools_word_counter({
            'dialogHeader': gettext('Word counter'),
            'words': stats.numWords,
            'chars_no_space': stats.numNoSpace,
            'chars': stats.numChars
        }));

        jQuery('#word-counter-dialog').dialog({
            draggable : false,
            resizable : false,
            modal : true,
            buttons : diaButtons,
            create : function () {
                var theDialog = $(this).closest(".ui-dialog");
                theDialog.find(".ui-dialog-buttonset .ui-button:eq(0)").addClass("fw-button fw-orange");
            },

            close : function() {
                $(this).dialog('destroy').remove();
            }
        });

    }
  /** Handles the clicking of an item in the tools menu
   * @function toolsEventHandler
  * @memberof toolsHelpers
  * @param function_name Name of the data-function attribute of the clicked item.
  */
    toolsHelpers.toolsEventHandler = function(function_name) {
        switch(function_name) {
            case 'wordcounter':
                this.wordCounter();
                break;
            case 'showshortcuts':
                $().showShortcuts();
                break;
        };

    }

    exports.toolsHelpers = toolsHelpers;
}).call(this);
