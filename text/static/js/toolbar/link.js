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

// toolbar link
(function (jQuery) {
    return jQuery.widget("IKS.toolbarlink", {
        options: {
            editable: null,
            uuid: "",
            link: true,
            image: true,
            defaultUrl: 'http://',
            dialogOpts: {
                autoOpen: false,
                width: 'auto',
                height: 'auto',
                title: "Enter Link",
                modal: true,
                resizable: false,
                draggable: false,
                dialogClass: 'hallolink-dialog'
            },
            butonCssClass: null
        },
        populateToolbar: function (toolbar) {
            var buttonize, buttonset, dialog, dialogId, dialogSubmitCb, urlInput, noChange, widget, range, selection, _this = this;
            widget = this;
            dialogId = "" + this.options.uuid + "-dialog";
            dialog = jQuery('<div id="' + dialogId + '">\
                <form action="#" method="post" class="linkForm">\
                    <input style="width: 250px;" class="url" type="text" name="url" value="' + this.options.defaultUrl + '" />\
                    <div class="dialogSubmit">\
                        <input type="submit" id="addlinkButton" class="fw-button fw-dark" value="' + gettext("Insert") + '" />\
                    </div>\
                </form></div>');
            urlInput = jQuery('input[name=url]', dialog).focus(function (e) {
                return this.select();
            });
            dialogSubmitCb = function (event) {
                var link, insideLink, linkNode, emptySpaceNode;
                noChange = false;
                event.preventDefault();
                link = urlInput.val();
                insideLink = jQuery(range.startContainer).closest('a')[0];

                if (((new RegExp(/^\s*$/)).test(link)) || link === widget.options.defaultUrl) {
                    // The link url is empty or the default one. DElete a link if it exist. Then close the dialog.
                    if (insideLink) {
                        manualEdits.remove(insideLink, false);
                    }
                    dialog.dialog('close');
                    return false;
                }

                // We create the linkNode before we actually use it, because the browser may modify the url (adding trailing slahses, etc.).
                // So to see whether it is the same as one that already exists, we need to do create it here already.
                linkNode = document.createElement('a');
                linkNode.setAttribute('href', link);

                if (insideLink) {
                    if (linkNode.href === insideLink.href) {
                        // the link has not been changed, just close the dialog
                        dialog.dialog('close');
                        return false;
                    } else {
                        emptySpaceNode = document.createTextNode('\u180e');
                        insideLink.parentNode.insertBefore(emptySpaceNode, insideLink.nextSibling);
                        range.selectNode(emptySpaceNode);
                        range.collapse(true);
                        manualEdits.remove(insideLink, false);
                    }
                }

                linkNode.innerHTML = link;
                // Make sure to get out of any track changes node if tracking is disabled.
                range = dom.noTrackIfDisabled(range);
                // Make sure to get out of any citation node.
                range = dom.noCitationOrLinkNode(range);
                // Insert the new link node
                manualEdits.insert(linkNode, range);
                //widget.options.editable.element.trigger('change');
                widget.options.editable.removeAllSelections();
                dialog.dialog('close');
                return false;
            };
            dialog.find("form").submit(dialogSubmitCb);
            buttonset = $.Fidus.buttonset.prototype.createButtonset.call(this, widget.widgetName, 1);
            buttonize = function (type) {
                var button, id;
                id = "" + _this.options.uuid + "-" + type;
                button = jQuery('<button></button>');
                button.makebutton({
                    label: 'Link',
                    icon: 'icon-link',
                    editable: _this.options.editable,
                    //command: 'link',
                    queryState: false,
                    uuid: _this.options.uuid,
                    cssClass: _this.options.buttonCssClass
                });
                button.attr('class', 'fw-button fw-light fw-large fw-square');
                buttonset.append(button);
                dialog.bind('dialogclose', function () {
                    jQuery('label', button).removeClass('ui-state-active');
                    range.collapse();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    widget.options.editable.element.focus();
                    return widget.options.editable.keepActivated(false);
                });
                button.bind("click", function (event) {

                    selection = rangy.getSelection();
                    range = selection.getRangeAt(0);

                    urlInput = jQuery('input[name=url]', dialog);
                    if (range.startContainer.parentNode.href === void 0) {
                        urlInput.val(widget.options.defaultUrl);
                    } else {
                        urlInput.val(jQuery(range.startContainer.parentNode).attr('href'));
                        jQuery(urlInput[0].form).find('input[type=submit]').val('Update');
                    }
                    noChange = true;
                    widget.options.editable.keepActivated(true);

                    dialog.dialog('open');

                    return false;
                });
                return _this.element.bind("keyup paste change mouseup", function (event) {
                    var nodeName, start;
                    start = jQuery(widget.options.editable.getSelection().startContainer);
                    nodeName = start.prop('nodeName') ? start.prop('nodeName') : start.parent().prop('nodeName');
                    if (nodeName && nodeName.toUpperCase() === "A") {
                        jQuery('.link_button').addClass('ui-state-active');
                        return;
                    } else {
                        jQuery('.link_button').removeClass('ui-state-active');
                    }
                    return jQuery('label', button).removeClass('ui-state-active');
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