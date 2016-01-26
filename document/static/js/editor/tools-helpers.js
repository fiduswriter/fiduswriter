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


  /** Calculates words and characters of document and displays a dialog with the results.
   * @function wordCounter
  * @memberof toolsHelpers
  */
    toolsHelpers.wordCounter = function() {
        var text_content = document.getElementById('document-editable').textContent,
            bibliography_content = document.getElementById('document-bibliography').textContent,
            whole_content = text_content + ' ' + bibliography_content,
            num_pages = jQuery('#pagination-layout .pagination-page').size(),
            num_words,
            num_chars = text_content.length + bibliography_content.length,
            num_no_space;

        whole_content = whole_content.replace(/(^\s*)|(\s*$)/gi,"");
        whole_content = whole_content.replace(/[ ]{2,}/gi," ");
        whole_content = whole_content.replace(/\n /,"\n");
        whole_content = whole_content.split(' ');

        num_words = whole_content.length;
        num_no_space = whole_content.join('').length;

        var diaButtons = {'Close': function() {
            jQuery('#word-counter-dialog').dialog('close');
        }};

        jQuery('body').append(tmp_tools_word_counter({
            'dialogHeader': gettext('Word counter'),
            'pages': num_pages,
            'words': num_words,
            'chars_no_space': num_no_space,
            'chars': num_chars
        }));

        jQuery('#word-counter-dialog').dialog({
            draggable : false,
            resizable : false,
            modal : true,
            buttons : diaButtons,
            create : function () {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-dialog-buttonset .ui-button:eq(0)").addClass("fw-button fw-orange");
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
