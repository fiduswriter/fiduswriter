/**
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
// blockstyle paragraph, h1 - h3, lists
jQuery(document).on('mousedown', '.toolbarheadings label', function (event) {

    var selection = rangy.getSelection(),
        range = selection.getRangeAt(0),
        currentBlockElement = jQuery(range.startContainer).closest('p, li, h1, h2, h3, code, blockquote')[0];

    event.preventDefault();

    if (dom.switchBlockElementWhileSavingCaretPosition(currentBlockElement, this.id.split('_')[0])) {
        jQuery(document).trigger('updateBlockFormat');
        editorHelpers.documentHasChanged();
    }

});

jQuery(document).on('mousedown', '#button-ol', function (event) {
    jQuery('#ol_button').mousedown();
});

jQuery(document).on('mousedown', '#button-ul', function (event) {
    jQuery('#ul_button').mousedown();
});

jQuery(document).bind('updateBlockFormat', function (event) {
    var selection = rangy.getSelection(),
        range = selection.getRangeAt(0),
        format = jQuery(range.startContainer).closest('p, ul, ol, h1, h2, h3, code, blockquote');
    if (format.length === 0) {
        return;
    } else {
        format = format[0].nodeName.toLowerCase();
    }

    document.getElementById('block-style-label').textContent = document.getElementById(format + "_button").textContent;

    // In case of lists, also highlight these
    if (format === 'ul') {
        jQuery('#button-ul').addClass('ui-state-active');
        jQuery('#button-ol').removeClass('ui-state-active');
    } else if (format === 'ol') {
        jQuery('#button-ol').addClass('ui-state-active');
        jQuery('#button-ul').removeClass('ui-state-active');
    } else {
        jQuery('#button-ul,#button-ol').removeClass('ui-state-active');
    }
});