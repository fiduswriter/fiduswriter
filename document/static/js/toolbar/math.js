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
// toolbar math
jQuery(document).on('mousedown', '#button-math, .equation', function (event) {
    event.preventDefault();
    var selection = rangy.getSelection(),
        range,
        dialog, dialogButtons = [],
        submitMessage = gettext('Insert'),
        insideMath = false,
        formula = 'x=2*y';

        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            if (jQuery(range.startContainer).closest('#document-editable').length===0) {
                range = rangy.createRange();
            }

        } else {
            range = rangy.createRange();
        }


    if (jQuery(this).is('.equation')) {
        insideMath = this;
        range.selectNode(this);
        range.collapse();
        formula = jQuery(this).attr('data-equation');
        submitMessage = gettext('Update');
        dialogButtons.push({
            text: gettext('Remove'),
            class: 'fw-button fw-orange',
            click: function () {
                manualEdits.remove(insideMath, range);
                insideMath = false;
                dialog.dialog('close');
            }
        });
    }

    dialogButtons.push({
        text: submitMessage,
        class: 'fw-button fw-dark',
        click: function () {

            var math = dialog.find('input').val(), mathNode;

            if ((new RegExp(/^\s*$/)).test(math)) {
                // The math input is empty. Delete a math node if it exist. Then close the dialog.
                if (insideMath) {
                    manualEdits.remove(insideMath, false);
                }
                dialog.dialog('close');
                return;
            } else if (insideMath && math === insideMath.getAttribute('data-equation')) {
                dialog.dialog('close');
                return;
            }
            mathNode = nodeConverter.createMathView();
            mathNode.setAttribute('data-equation', math);
            // Make sure to get out of any track changes node if tracking is disabled.
            range = dom.noTrackIfDisabled(range);
            // Make sure to get out of any citation node.
            range = dom.noCitationOrLinkNode(range);
            // Insert the new math node
            manualEdits.insert(mathNode, range);
            if (insideMath) {
                manualEdits.remove(insideMath, false);
            } else {
                mathNode.parentNode.insertBefore(nodeConverter.afterNode(), mathNode.nextSibling);
            }

            mathHelpers.layoutMathNode(mathNode);

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

    dialog = jQuery(toolbarTemplates.mathDialog({formula:formula}));


    dialog.dialog({
        buttons: dialogButtons,
        title: gettext('Latex equation'),
        modal: true,
        close: function () {
            jQuery(this).dialog('destroy').remove();
        }
    });


});
