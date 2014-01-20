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

// inlinestyles bold
jQuery(document).on('mousedown', '#button-bold', function () {
    
    var selection = rangy.getSelection(),
                    range;
    event.preventDefault();
    
    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        if (jQuery(range.startContainer).closest('#document-editable').length===0) {
            return false;
        }
        
    } else {
        return false;
    }
    
    if (range.collapsed) {
        jQuery(this).toggleClass('ui-state-active');
    } else {
        document.execCommand("bold", false, null);
        editorHelpers.documentHasChanged();
        jQuery(this).toggleClass('ui-state-active');
    }
});