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
// toolbar figure
(function (jQuery) {
    return jQuery.widget("IKS.toolbarfigure", {
        options: {
            editable: null,
            uuid: "figure",
            link: true,
            image: true,
            dialogOpts: {
                autoOpen: false,
                width: 'auto',
                height: 'auto',
                title: gettext("Enter latex math or insert an image"),
                modal: true,
                resizable: false,
                draggable: false,
                dialogClass: 'hallofigure-dialog'
            },
            imageDialogOpts: {
                autoOpen: false,
                width: 'auto',
                height: 'auto',
                title: gettext("Images"),
                modal: true,
                resizable: false,
                draggable: false,
                dialogClass: 'hallofigureimage-dialog'
            },
            butonCssClass: null
        },
        populateToolbar: function (toolbar) {
            var buttonize, buttonset, dialog, imageDialog, dialogId,
                dialogSubmitCb,
                mathInput, captionInput, figTypeInput, insideFigure,
                figureNode, contentNode, captionNode, widget, range,
                    selection,
                useImage = false,
                _this = this;
            widget = this;
            dialogId = "" + this.options.uuid + "-dialog";
            dialog = jQuery(tmp_configure_figure({
                'dialogId': dialogId,
            }));
            imageDialog = jQuery(tmp_figure_image());
            mathInput = jQuery('input[name=figure-math]', dialog).focus(
                function (
                    e) {
                    return this.select();
                });
            captionInput = jQuery('input[name=figure-caption]', dialog)
                .focus(function (
                    e) {
                    return this.select();
                });
            dialogSubmitCb = function (event) {
                var math, caption, emptySpaceNode, figCat;
                event.preventDefault();
                math = mathInput.val();
                caption = captionInput.val();

                if ((new RegExp(/^\s*$/)).test(math) && (!useImage)) {
                    // The math input is empty. Delete a math node if it exist. Then close the dialog.
                    if (insideFigure) {
                        manualEdits.remove(insideFigure, false);
                    }
                    dialog.dialog('close');
                    return false;
                }
                figCat = figTypeInput.val();
                if (insideFigure) {
                    if (math === insideFigure.getAttribute(
                            'data-equation') &&
                        (useImage.pk === insideFigure.getAttribute(
                            'data-image')) &&
                        caption === insideFigure.getAttribute(
                            'data-caption') &&
                        figCat === insideFigure.getAttribute(
                            'data-figure-category')) {
                        // the figure has not been changed, just close the dialog
                        dialog.dialog('close');
                        return false;
                    }
                    else {

                        figureNode = document.createElement('figure');
                        figureNode.setAttribute('data-equation', math);
                        if (useImage) {
                            figureNode.setAttribute('data-image',
                                useImage['pk']);
                        }
                        else {
                            figureNode.setAttribute('data-image', '');
                        }
                        figureNode.setAttribute('data-caption', caption);
                        figureNode.setAttribute('data-figure-category',
                            figCat);
                        figureNode.setAttribute('contenteditable',
                            false);

                        contentNode = document.createElement('div');
                        if (useImage) {
                            contentNode.innerHTML = '<img src="' +
                                useImage.image +
                                '">';
                        }
                        else {
                            contentNode.classList.add('figure-equation');
                            contentNode.setAttribute('data-equation',
                                math);
                            contentNode.innerHTML = ' ';
                        }


                        figureCatNode = document.createElement('span');
                        figureCatNode.setAttribute(
                            'data-figure-category',
                            figCat);
                        figureCatNode.classList.add('figure-cat-' +
                            figCat);

                        figureCatNode.innerHTML = jQuery(
                            '#figure-category-list span[data-category=' +
                            figCat + ']')[0].innerText;

                        captionTextNode = document.createElement('span');
                        captionTextNode.setAttribute('data-caption',
                            caption);
                        captionTextNode.innerHTML = caption;

                        captionNode = document.createElement(
                            'figcaption');
                        captionNode.appendChild(figureCatNode);
                        captionNode.appendChild(captionTextNode);

                        figureNode.appendChild(contentNode);
                        figureNode.appendChild(captionNode);
                        insideFigure.parentNode.insertBefore(figureNode,
                            insideFigure.nextSibling);
                        range.selectNode(figureNode);
                        range.collapse();
                        manualEdits.remove(insideFigure, false);

                    }
                }
                else {
                    figureNode = document.createElement('figure');
                    figureNode.setAttribute('data-equation', math);
                    if (useImage) {
                        figureNode.setAttribute('data-image', useImage[
                            'pk']);
                    }
                    else {
                        figureNode.setAttribute('data-image', '');
                    }
                    figureNode.setAttribute('data-caption', caption);
                    figureNode.setAttribute('data-figure-category',
                        figCat);
                    figureNode.setAttribute('contenteditable', false);

                    contentNode = document.createElement('div');
                    if (useImage) {
                        contentNode.innerHTML = '<img src="' + useImage
                            .image +
                            '">';
                    }
                    else {
                        contentNode.classList.add('figure-equation');
                        contentNode.setAttribute('data-equation', math);
                        contentNode.innerHTML = ' ';
                    }

                    figureCatNode = document.createElement('span');
                    figureCatNode.setAttribute('data-figure-category',
                        figCat);
                    figureCatNode.classList.add('figure-cat-' + figCat);
                    figureCatNode.innerHTML = jQuery(
                        '#figure-category-list span[data-category=' +
                        figCat +
                        ']')[0].innerText;

                    captionTextNode = document.createElement('span');
                    captionTextNode.setAttribute('data-caption',
                        caption);
                    captionTextNode.innerHTML = caption;

                    captionNode = document.createElement('figcaption');
                    captionNode.appendChild(figureCatNode);
                    captionNode.appendChild(captionTextNode);

                    figureNode.appendChild(contentNode);
                    figureNode.appendChild(captionNode);
                    thisBlock = jQuery(range.startContainer).closest(
                        'p, ul, ol, h1, h2, h3, code, blockquote')[0];
                    thisBlock.parentNode.insertBefore(figureNode,
                        thisBlock.nextSibling);

                }

                paragraphNode = document.createElement('p');
                paragraphNode.innerHTML = '<br>';
                figureNode.parentNode.appendChild(paragraphNode);

                editorHelpers.documentHasChanged();
                range.selectNode(figureNode.nextSibling);
                range.collapse(true);

                widget.options.editable.removeAllSelections();
                dialog.dialog('close');
                return false;
            };
            dialog.find("form").submit(dialogSubmitCb);
            buttonset = $.Fidus.buttonset.prototype.createButtonset.call(
                this,
                widget.widgetName, 1);
            buttonize = function (type) {
                var button, id, openDialog;
                id = "" + _this.options.uuid + "-" + type;
                button = jQuery('<button></button>');
                button.makebutton({
                    label: 'Figure',
                    icon: 'icon-figure',
                    editable: _this.options.editable,
                    queryState: false,
                    uuid: _this.options.uuid,
                    cssClass: _this.options.buttonCssClass
                });
                button.attr('class',
                    'fw-button fw-light fw-large fw-square');
                buttonset.append(button);
                dialog.bind('dialogclose', function () {
                    jQuery('label', button).removeClass(
                        'ui-state-active');
                    if (figureNode && figureNode.parentNode) {
                        range.selectNode(figureNode);
                        range.collapse();
                        if (!useImage) {
                            mathHelpers.layoutDisplayMathNode(
                                contentNode);
                        }
                    }
                    else if (insideFigure && insideFigure.parentNode &&
                        typeof (range) !== 'undefined') {
                        range.selectNode(insideFigure);
                        range.collapse();
                    }
                    if (range) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    widget.options.editable.element.focus();
                    return widget.options.editable.keepActivated(
                        false);
                });
                openDialog = function (onFigure) {
                    var figTypeSelectorValue, figTypeInputValue;
                    jQuery(document).trigger('openFigureDialog');
                    insideFigure = onFigure;
                    selection = rangy.getSelection();

                    if (selection.getAllRanges().length === 0) {
                        range = rangy.createRange();
                    }
                    else {
                        range = selection.getRangeAt(0);
                    }
                    jQuery('#inner-figure-preview')[0].innerHTML = '';
                    jQuery('input[name=figure-math]').removeAttr(
                        'disabled');

                    mathInput = jQuery('input[name=figure-math]',
                        dialog);
                    captionInput = jQuery('input[name=figure-caption]',
                        dialog);
                    figTypeInput = jQuery('#figure-category', dialog);
                    figTypeSelectorValue = jQuery(
                        '#figure-category-btn label',
                        dialog)[0];

                    if (insideFigure) {
                        mathInput.val(insideFigure.getAttribute(
                            'data-equation'));
                        captionInput.val(insideFigure.getAttribute(
                            'data-caption'));
                        figTypeInputValue = insideFigure.getAttribute(
                            'data-figure-category');
                        figTypeInput.val(figTypeInputValue);
                        figTypeSelectorValue.innerText = jQuery(
                            '#figure-category-list span[data-category=' +
                            figTypeInputValue + ']')[0].innerText;
                        useImage = insideFigure.getAttribute(
                            'data-image');
                        if ('' !== useImage) {
                            useImage = ImageDB[useImage];
                            //TODO: Figure out what to do if the image has been deleted from ImageDB in the meantime.
                            jQuery('input[name=figure-math]').attr(
                                'disabled',
                                'disabled');
                            jQuery('#inner-figure-preview')[0].innerHTML =
                                '<img src="' + useImage.image +
                                '" >';
                        }
                        else {
                            useImage = false;
                        }
                        jQuery('#addFigureButton').val(gettext('Update'));
                        jQuery('#deleteFigureButton').css('display',
                            'inline-block');
                    }
                    else {
                        mathInput.val('');
                        captionInput.val('');
                        figTypeSelectorValue.innerText = gettext(
                            'Figure');
                        figTypeInput.val('figure');
                        jQuery('#addFigureButton').val(gettext('Insert'));
                        jQuery('#deleteFigureButton').css('display',
                            'none');
                    }

                    widget.options.editable.keepActivated(true);
                    dialog.dialog('open');
                    captionInput.focus();

                    return false;
                }
                button.bind("click", function (event) {
                    openDialog();
                });

                jQuery(document).one('openFigureDialog', function () {

                    $.addDropdownBox($('#figure-category-btn'), $(
                        '#figure-category-pulldown'));
                    $('#figure-category-pulldown li > span').bind(
                        'click', function () {
                            $('#figure-category-btn > label').html(
                                $(this).html());
                            $('#figure-category').val($(this).attr(
                                'data-category'));
                            $('#figure-category').trigger('change');
                        });
                    jQuery('input[name=figure-math]').bind('focus',
                        function () {
                            // If a figure is being entered, disable the image button
                            jQuery('#insertFigureImage').addClass(
                                'disabled').attr(
                                'disabled', 'disabled');
                        });

                    jQuery('input[name=figure-math]').bind('blur',
                        function () {
                            if (jQuery(this).val() === '') {
                                jQuery('#inner-figure-preview')[0].innerHTML =
                                    '';
                                // enable image button
                                jQuery('#insertFigureImage').removeClass(
                                    'disabled')
                                    .removeAttr('disabled');
                            }
                            else {
                                jQuery('#inner-figure-preview')[0].innerHTML =
                                    '<p>[DMATH]' + jQuery(this).val() +
                                    '[/DMATH]</p>';
                                MathJax.Hub.Queue(["Typeset",
                                    MathJax.Hub,
                                    "inner-figure-preview"
                                ]);
                            }
                        });



                });

                // functions for image selection dialog
                jQuery(document).on('click', '#imagelist tr', function () {
                    if (!jQuery(this).hasClass('checked')) {
                        jQuery('#imagelist tr.checked').removeClass(
                            'checked');
                    }
                    jQuery(this).toggleClass('checked');
                });

                jQuery(document).on('click', '#selectImageFigureButton',
                    function () {
                        var checkedImage = jQuery(
                            '#imagelist tr.checked');
                        if (0 === checkedImage.length) {
                            useImage = false;
                            jQuery('#inner-figure-preview')[0].innerHTML =
                                '';
                            jQuery('input[name=figure-math]').removeAttr(
                                'disabled');
                        }
                        else {
                            useImage = ImageDB[checkedImage[0].id.split(
                                '_')[1]];
                            jQuery('#inner-figure-preview')[0].innerHTML =
                                '<img src="' +
                                useImage.image +
                                '" style="max-width: 400px;max-height:220px">';
                            jQuery('input[name=figure-math]').attr(
                                'disabled',
                                'disabled');
                        }
                        imageDialog.dialog('close');
                    });

                jQuery(document).on('click', '#cancelImageFigureButton',
                    function () {
                        imageDialog.dialog('close');
                    });

                jQuery(document).on('click', '#deleteFigureButton',
                    function () {
                        insideFigure.parentNode.removeChild(
                            insideFigure);
                        editorHelpers.documentHasChanged();
                        dialog.dialog('close');
                    });

                jQuery(document).on('click', '#insertFigureImage',
                    function () {
                        jQuery('#imagelist tr.checked').removeClass(
                            'checked');
                        if (useImage) {
                            jQuery('#Image_' + useImage.pk).addClass(
                                'checked');
                        }
                        imageDialog.dialog('open');
                    });

                jQuery(document).on('click', 'figure', function () {
                    if (jQuery(this).closest('.del')[0]) {
                        // Inside a deletion node
                        return true;
                    }
                    openDialog(this);
                });
                return;
            };
            if (this.options.link) {
                buttonize("A");
            }
            if (this.options.link) {
                buttonset.buttonset();
                toolbar.append(buttonset);
                imageDialog.dialog(this.options.imageDialogOpts);
                return dialog.dialog(this.options.dialogOpts);
            }
        },
        _init: function () {}
    });
})(jQuery);