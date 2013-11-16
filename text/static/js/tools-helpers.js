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
        toolsHelpers = {};

    toolsHelpers.wordCounter = function() {
        var text_content = document.getElementById('document-editable').innerText,
            bibliography_content = document.getElementById('document-bibliography').innerText,
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

        console.log(num_pages, num_words, num_chars, num_no_space);
    }

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