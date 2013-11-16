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


(function (jQuery) {
    return jQuery.widget("IKS.toolbarheadings", $.Fidus.blockstylebutton, {
        options: {
            editable: null,
            toolbar: null,
            uuid: "",
            blocks: {
                p: ['p', gettext('Normal Text'), gettext('Text that is part of a standard paragraph.')],
                h1: ['h1', gettext('1st Headline'), gettext('A headline of the highest level (under title).')],
                h2: ['h2', gettext('2nd Headline'), gettext('A headline of the 2nd highest level.')],
                h3: ['h3', gettext('3rd Headline'), gettext('A headline of the 3rd highest level.')],
                blockquote: ['blockquote', gettext('Block quote'), gettext('A longer quotation set as an indented block.')],                          
                code: ['code', gettext('Code'), gettext('Computer Code.')],
                ol: ['ol', gettext('Numbered List'), gettext('An item in an ordered list.')],
                ul: ['ul', gettext('Bulleted List'), gettext('An item in an unordered list.')],
            }
        },
        populateToolbar: function (toolbar) {
            return $.Fidus.blockstylebutton.prototype.addTools.call(this, toolbar);
        }
    });
})(jQuery);
