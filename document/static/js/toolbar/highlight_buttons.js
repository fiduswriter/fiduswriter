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

// Highlight buttons

jQuery(document).on('keyup paste change mouseup', '#document-editable', function () {
    var selection = rangy.getSelection(),
        range = selection.getRangeAt(0), bold, italic, link;

    bold = jQuery(range.startContainer).closest('b');

    if (bold.length > 0) {
        jQuery('#button-bold').addClass('ui-state-active');
    } else {
        jQuery('#button-bold').removeClass('ui-state-active');
    }

    italic = jQuery(range.startContainer).closest('i');

    if (italic.length > 0) {
        jQuery('#button-italic').addClass('ui-state-active');
    } else {
        jQuery('#button-italic').removeClass('ui-state-active');
    }

    link = jQuery(range.startContainer).closest('a');

    if (link.length > 0) {
        jQuery('#button-link').addClass('ui-state-active');
    } else {
        jQuery('#button-link').removeClass('ui-state-active');
    }

    jQuery(document).trigger('updateBlockFormat');


});
