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

// blockstyle lists
(function (jQuery) {
    return jQuery.widget("IKS.toolbarlists", {
        options: {
            editable: null,
            toolbar: null,
            uuid: '',
            lists: {
                ordered: true,
                unordered: true
            },
            buttonCssClass: null
        },
        populateToolbar: function (toolbar) {
            var buttonize, buttonset, _this = this;
            buttonize = function (type, icon, toolTip) {
                var createList, buttonElement;
                buttonset = $.Fidus.buttonset.prototype.createButtonset.call(this, 'toolbar' + type, 1);
                buttonElement = jQuery('<button></button>');
                buttonElement.makebutton({
                    uuid: _this.options.uuid,
                    editable: _this.options.editable,
                    label: toolTip,
                    //command: "insert" + type + "List",
                    icon: "icon-list-" + icon,
                    cssClass: _this.options.buttonCssClass
                });

                buttonElement.attr('class', 'fw-button fw-light fw-large fw-square');
                buttonElement.addClass(type);
                buttonset.append(buttonElement);
                buttonset.hallobuttonset();
                toolbar.append(buttonset);

                changeToList = function() {
                    var selection, range;

                    selection = rangy.getSelection();
                    range = selection.getRangeAt(0);

                    if (jQuery(range.startContainer).closest(type)[0]) {
                        // We are in a list of this type already. Change to a paragraph.
                        jQuery('.p_button').click();
                    } else {
                        jQuery('.' + type + '_button').click();
                    }
                }

                buttonElement.bind("click", changeToList);

                return true;
            };
            if (this.options.lists.ordered) {
                buttonize("ol", 'numbered', 'Numbered list');
            }
            if (this.options.lists.unordered) {
                buttonize("ul", 'bullet', 'Bulleted list');
            }
        }
    });
})(jQuery);