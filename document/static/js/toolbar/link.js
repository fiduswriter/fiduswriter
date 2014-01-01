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
jQuery(document).on('mousedown', '#button-link', function (event) {
    event.preventDefault();    
    var selection = rangy.getSelection(),
        range,
        dialog, dialogButtons = [],
        defaultLink = 'http://';

        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            if (jQuery(range.startContainer).closest('#document-editable').length===0) {
                return false;
            }
            
        } else {
            return false;
        }       
            
            
    if (jQuery(range.startContainer).closest('a').length > 0) {
        // We are inside of a link. Exit.
        return;
    }
            
    dialogButtons.push({
        text: gettext('Insert'),
        class: 'fw-button fw-dark',
        click: function () {

            var link = dialog.find('input.link').val(), linktext = dialog.find('input.linktext').val(), linkNode;

            if ((new RegExp(/^\s*$/)).test(link) || link === defaultLink) {
                // The link input is empty or hasn't been changed from the default value. Just close the dialog.
                dialog.dialog('close');
                return;
            }
            
            if ((new RegExp(/^\s*$/)).test(linktext)) {
                linktext = link;
            }
            
            linkNode = document.createElement('a');
            linkNode.setAttribute('href', link);
            linkNode.textContent = linktext;
            // Make sure to get out of any track changes node if tracking is disabled.
            range = dom.noTrackIfDisabled(range);
            // Make sure to get out of any citation node.
            range = dom.noCitationOrLinkNode(range);
            // Insert the new link node
            manualEdits.insert(linkNode, range);

        //    linkNode.parentNode.insertBefore(nodeConverter.afterNode(), linkNode.nextSibling);

            dialog.dialog('close');
        }
    });


    dialogButtons.push({
        text: gettext('Cancel'),
        class: 'fw-button fw-orange',
        click: function () {
            dialog.dialog('close');
        }
    });

    dialog = jQuery('<div title="' + gettext('Link') + '">\
                        <p><input class="linktext" type="text" value="" placeholder="' + gettext('Link text (optional)') + '"/></p>\
                        <p><input class="link" type="text" value="' + defaultLink + '" /></p>\
                    </div>');


    dialog.dialog({
        buttons: dialogButtons,
        modal: true,
        close: function () {
            jQuery(this).dialog('destroy').remove();
        }
    });


});