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
// toolbar link
jQuery(document).on('mousedown', '#button-link', function(event) {
    event.preventDefault();
    var range = insertElement.findRange(),
        dialogButtons = [],
        dialog,
        link = 'http://',
        linkText = '',
        defaultLink = 'http://',
        submitButtonText = 'Insert',
        linkElement = jQuery(range.startContainer).closest('a')[0];

    if (!range) {
        return false;
    }

    if (linkElement) {
        submitButtonText = 'Update';
        linkText = linkElement.textContent;
        link = linkElement.href;
    }

    dialogButtons.push({
        text: gettext(submitButtonText),
        class: 'fw-button fw-dark',
        click: function() {

            var newLink = dialog.find('input.link').val(),
                linkText = dialog.find('input.linktext').val(),
                linkNode, selection;

            if ((new RegExp(/^\s*$/)).test(newLink) || newLink === defaultLink) {
                // The link input is empty or hasn't been changed from the default value. Just close the dialog.
                dialog.dialog('close');
                return;
            }

            if ((new RegExp(/^\s*$/)).test(linkText)) {
                // The link text is empty. Make it the same as the link itself.
                linkText = link;
            }
            dialog.dialog('close');
            selection = rangy.getSelection();
            selection.setSingleRange(range);
            insertElement.link(newLink, linkText);

        }
    });

    dialogButtons.push({
        text: gettext('Cancel'),
        class: 'fw-button fw-orange',
        click: function() {
            dialog.dialog('close');
        }
    });

    dialog = jQuery(toolbarTemplates.linkDialog({
        linkText: linkText,
        link: link
    }));

    dialog.dialog({
        buttons: dialogButtons,
        modal: true,
        close: function() {
            jQuery(this).dialog('destroy').remove();
        }
    });


});
