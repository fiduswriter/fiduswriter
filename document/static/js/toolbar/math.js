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
(function (jQuery) {
    return jQuery.widget("IKS.toolbarmath", {
        options: {
            editable: null,
            uuid: "math",
            link: true,
            image: true,
            defaultMath: 'x=2*y',
            dialogOpts: {
                autoOpen: false,
                width: 'auto',
                height: 'auto',
                title: gettext("Enter Latex math"),
                modal: true,
                resizable: false,
                draggable: false,
                dialogClass: 'hallomath-dialog'
            },
            butonCssClass: null
        },
        populateToolbar: function (toolbar) {
            var buttonize, buttonset, dialog, dialogId, dialogSubmitCb, mathInput, insideMath, mathNode, noChange, widget, range, selection, _this = this;
            widget = this;
            dialogId = "" + this.options.uuid + "-dialog";
            dialog = jQuery('<div id="' + dialogId + '">\
                <form action="#" method="post" class="mathForm">\
                    <input style="width: 250px;" class="math" type="text" name="math" value="' + this.options.defaultMath + '" />\
                    <div class="dialogSubmit">\
                        <input type="submit" id="addmathButton" class="fw-button fw-dark" value="' + gettext("Insert") + '" />\
                    </div>\
                </form></div>');
            mathInput = jQuery('input[name=math]', dialog).focus(function (e) {
                return this.select();
            });
            dialogSubmitCb = function (event) {
                var math, emptySpaceNode;
                noChange = false;
                event.preventDefault();
                math = mathInput.val();

                if (((new RegExp(/^\s*$/)).test(math))) {
                    // The math input is empty. Delete a math node if it exist. Then close the dialog.
                    if (insideMath) {
                        manualEdits.remove(insideMath, false);
                    }
                    dialog.dialog('close');
                    return false;
                }
                if (insideMath) {

                    if (math === insideMath.getAttribute('data-equation')) {
                        // the equation has not been changed, just close the dialog
                        dialog.dialog('close');
                        return false;
                    } else {

                        mathNode = document.createElement('span');
                        mathNode.classList.add('equation');
                        mathNode.setAttribute('data-equation', math);
                        mathNode.innerHTML = ' ';
                        insideMath.parentNode.insertBefore(mathNode, insideMath.nextSibling);

                        manualEdits.remove(insideMath, false);

                    }
                } else {
                    mathNode = document.createElement('span');
                    mathNode.classList.add('equation');
                    mathNode.setAttribute('data-equation', math);
                    mathNode.innerHTML = ' ';
                    // Make sure to get out of any track changes node if tracking is disabled.
                    range = dom.noTrackIfDisabled(range);
                    // Make sure to get out of any citation node.
                    range = dom.noCitationOrLinkNode(range);
                    // Insert the new math node
                    manualEdits.insert(mathNode, range);
                    emptySpaceNode = document.createTextNode('\u180e');
                    mathNode.parentNode.insertBefore(emptySpaceNode, mathNode.nextSibling);
                }

                //widget.options.editable.element.trigger('change');
                widget.options.editable.removeAllSelections();
                dialog.dialog('close');
                return false;
            };
            dialog.find("form").submit(dialogSubmitCb);
            buttonset = $.Fidus.buttonset.prototype.createButtonset.call(this, widget.widgetName, 1);
            buttonize = function (type) {
                var button, id, openDialog;
                id = "" + _this.options.uuid + "-" + type;
                button = jQuery('<button></button>');
                button.makebutton({
                    label: 'Math',
                    icon: 'icon-math',
                    editable: _this.options.editable,
                    queryState: false,
                    uuid: _this.options.uuid,
                    cssClass: _this.options.buttonCssClass
                });
                button.attr('class', 'fw-button fw-light fw-large fw-square');
                buttonset.append(button);
                dialog.bind('dialogclose', function () {
                    jQuery('label', button).removeClass('ui-state-active');
                    if (mathNode && mathNode.nextSibling) {
                        range.selectNode(mathNode.nextSibling);
                        range.collapse();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        mathHelpers.layoutMathNode(mathNode);
                    } else if (insideMath) {
                        range.selectNode(insideMath);
                        range.collapse();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }

                    widget.options.editable.element.focus();
                    return widget.options.editable.keepActivated(false);
                });
                openDialog = function(clickedFormula) {
                    insideMath = clickedFormula;
                    selection = rangy.getSelection();
                    range = selection.getRangeAt(0);

                    mathInput = jQuery('input[name=math]', dialog);

                    if (insideMath) {
                        mathInput.val(insideMath.getAttribute('data-equation'));
                        jQuery(mathInput[0].form).find('input[type=submit]').val('update');
                    } else {
                        mathInput.val(widget.options.defaultMath);
                    }

                    noChange = true;
                    widget.options.editable.keepActivated(true);
                    dialog.dialog('open');

                    return false;
                }
                button.bind("click", function (event) {
                    openDialog();
                });
                mathHelpers.bindEvents(openDialog);

                return _this.element.bind("keyup paste change mouseup", function (event) {
                    var insideMath, start;
                    start = jQuery(widget.options.editable.getSelection().startContainer);
                    insideMath = jQuery(start).closest('.equation')[0];
                    if (insideMath) {
                        jQuery('.math_button').addClass('ui-state-active');
                    } else {
                        jQuery('.math_button').removeClass('ui-state-active');
                        if (commentHelpers.deactivateAll()) commentHelpers.layoutComments();
                    }
                });
            };
            if (this.options.link) {
                buttonize("A");
            }
            if (this.options.link) {
                buttonset.buttonset();
                toolbar.append(buttonset);
                return dialog.dialog(this.options.dialogOpts);
            }
        },
        _init: function () {}
    });
})(jQuery);