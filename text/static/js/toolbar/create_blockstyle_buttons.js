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

// create buttons for blockstyles
(function (jQuery) {
    return jQuery.widget("Fidus.blockstylebutton", {
        options: {},
        addTools: function (toolbar) {
            var button, buttonize, buttonset, id, label, widget, updateFormatButton, _ref, _this = this;
            widget = this;
            buttonset = $.Fidus.buttonset.prototype.createButtonset.call(this, widget.widgetName, 4);
            buttonize = function (blockLabel, blockId, blockName, blockTooltip) {

                label = blockLabel;
                label_text = blockName;
                id = "" + _this.options.uuid + "-" + blockId;
                pulldown_items_html = '<li>\
                    <input id="'+id+'" type="radio" name="'+widget.options.uuid+'-headings" />\
                    <label for="'+id+'" class="'+label.toLowerCase()+'_button fw-pulldown-item">'+label_text+'</label>\
                </li>';
                buttonset.find('.fw-pulldown ul').append(jQuery(pulldown_items_html).button());
                button = jQuery("#" + id, buttonset);

                button.parent().attr("title", blockTooltip);

                changeBlockFormat = function() {
                    var selection, range, currentBlockElement;

                    selection = rangy.getSelection();
                    range = selection.getRangeAt(0);

                    currentBlockElement = jQuery(range.startContainer).closest('p, li, h1, h2, h3, figure, code, blockquote')[0];
                    if (dom.switchBlockElementWhileSavingCaretPosition(currentBlockElement, blockLabel)) {
                        updateFormatButton();
                        editorHelpers.documentHasChanged();
                    }
                }

                return button.bind("change", changeBlockFormat);

            };
            _ref = this.options.blocks;
            var x = 0;
            for (_i in _ref) {
                if (0 == x) {
                    buttonset.find('.multibuttonsCover').text(_ref[_i][1]);
                    buttonset.find('.multibuttonsCover').attr('title',_ref[_i][2]);
                }
                buttonize(_i, _ref[_i][0], _ref[_i][1], _ref[_i][2]);
                x++;
            }
            buttonset.buttonset();
            updateFormatButton = function () {
                var format, range, selection, labelParent, matches, selectedButton;
                selection = rangy.getSelection();
                range = selection.getRangeAt(0);

                format = jQuery(range.startContainer).closest('p, ul, ol, h1, h2, h3, figure, code, blockquote');
                         
                if (format.length === 0) {
                    return;
                } else {
                    format = format[0].nodeName.toLowerCase();
                }

                selectedButton = jQuery("#" + widget.options.uuid + "-" + format);
                labelParent = jQuery(buttonset);
                labelParent.children("input").attr("checked", false);
                labelParent.children("label").removeClass("ui-state-clicked");
                labelParent.children("input").button("widget").button("refresh");
                if (selectedButton) {
                    selectedButton.parent().parent().parent().parent().siblings('.multibuttonsCover').text(selectedButton.siblings('label').text());
                    selectedButton.parent().parent().parent().parent().siblings('.multibuttonsCover').attr('title',selectedButton.parent().attr('title'));
                    selectedButton.attr("checked", true);
                    selectedButton.next("label").addClass("ui-state-clicked");
                    //return selectedButton.button("refresh");
                }
                // In case of lists, also highlight these
                if (format==='ul') {
                    jQuery('button.ul').addClass('ui-state-active');
                    jQuery('button.ol').removeClass('ui-state-active');
                } else if (format==='ol') {
                    jQuery('button.ol').addClass('ui-state-active');
                    jQuery('button.ul').removeClass('ui-state-active');
                } else {
                    jQuery('button.ul,button.ol').removeClass('ui-state-active');
                }
            }

            this.element.bind("keyup paste change mouseup", updateFormatButton);
            return toolbar.append(buttonset);
        },
        _init: function () {}
    });
})(jQuery);