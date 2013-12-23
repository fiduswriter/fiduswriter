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
// toolbar figure
jQuery(document).on('mousedown', '#button-figure, :not(.del) figure', function (event) {

        var selection = rangy.getSelection(),
        range = selection.getRangeAt(0), dialog, submitMessage = gettext('Insert'),
            dialogButtons = [],
            insideFigure = false,
            figureNode = false,
            contentNode = false,
            image = false,
            caption = '',
            category = 'figure',
            equation = '';
        event.preventDefault();

        if (jQuery(this).is('figure')) {
            insideFigure = this;
            submitMessage = gettext('Update');
            equation = insideFigure.getAttribute(
                'data-equation');
            caption = insideFigure.getAttribute(
                'data-caption');
            figureCategory = insideFigure.getAttribute(
                'data-figure-category');

            image = insideFigure.getAttribute(
                'data-image');
            if ('' === image) {
                image = false;
            } else {
                image = ImageDB[image];
                //TODO: Figure out what to do if the image has been deleted from ImageDB in the meantime.                          
            }
        }

        dialog = jQuery(tmp_configure_figure({
            equation: equation,
            caption: caption
        }));

        dialogButtons.push({
            text: submitMessage,
            class: 'fw-button fw-dark',
            click: function (event) {
                event.preventDefault();
                math = mathInput.val();
                caption = captionInput.val();

                if ((new RegExp(/^\s*$/)).test(math) && (!image)) {
                    // The math input is empty. Delete a math node if it exist. Then close the dialog.
                    if (insideFigure) {
                        manualEdits.remove(insideFigure, false);
                    }
                    dialog.dialog('close');
                    return false;
                }

                if (insideFigure && math === insideFigure.getAttribute(
                        'data-equation') &&
                    (image.pk === insideFigure.getAttribute(
                        'data-image')) &&
                    caption === insideFigure.getAttribute(
                        'data-caption') &&
                    category === insideFigure.getAttribute(
                        'data-figure-category')) {
                    // the figure has not been changed, just close the dialog
                    dialog.dialog('close');
                    return false;
                }

                figureNode = document.createElement('figure');
                figureNode.setAttribute('data-equation', math);
                if (image) {
                    figureNode.setAttribute('data-image',
                        image.pk);
                } else {
                    figureNode.setAttribute('data-image', '');
                }
                figureNode.setAttribute('data-caption', caption);
                figureNode.setAttribute('data-figure-category',
                    category);
                figureNode.setAttribute('contenteditable',
                    false);

                contentNode = document.createElement('div');
                if (image) {
                    contentNode.innerHTML = '<img src="' +
                        image.image +
                        '">';
                } else {
                    contentNode.classList.add('figure-equation');
                    contentNode.setAttribute('data-equation',
                        math);
                    contentNode.innerHTML = ' ';
                }

                if (category != 'none') {
                    figureCatNode = document.createElement('span');
                    figureCatNode.setAttribute(
                        'data-figure-category',
                        category);
                    figureCatNode.classList.add('figure-cat-' +
                        category);

                    figureCatNode.innerHTML = jQuery(
                        '#figure-category-btn label')[0].textContent;
                    captionNode.appendChild(figureCatNode);
                }
                if (caption != '') {
                    captionTextNode = document.createElement('span');
                    captionTextNode.setAttribute('data-caption',
                        caption);
                    captionTextNode.innerHTML = caption;

                    captionNode = document.createElement(
                        'figcaption');
                
                    captionNode.appendChild(captionTextNode);
                }
                figureNode.appendChild(contentNode);
                if (category != 'none' || caption != '') {
                    figureNode.appendChild(captionNode);
                }
                manualEdits.insert(figureNode, range);
                range.selectNode(figureNode);
                range.collapse();

                if (insideFigure) {
                    manualEdits.remove(insideFigure, false);
                }




                paragraphNode = document.createElement('p');
                paragraphNode.innerHTML = '<br>';
                if (figureNode.parentNode.nodeName === 'SPAN') {
                    // We are inside a span track node
                    figureNode = figureNode.parentNode;
                }
                figureNode.parentNode.insertBefore(paragraphNode, figureNode.nextSibling);

                range.selectNode(paragraphNode);
                range.collapse();

                editorHelpers.documentHasChanged();

                dialog.dialog('close');
                return false;
            },
        });

        dialogButtons.push({
            text: gettext('Cancel'),
            class: 'fw-button fw-orange',
            click: function (event) {
                dialog.dialog('close');
            }
        });


        dialogOpts = {
            width: 'auto',
            height: 'auto',
            title: gettext("Enter latex math or insert an image"),
            modal: true,
            resizable: false,
            draggable: false,
            buttons: dialogButtons,
            dialogClass: 'hallofigure-dialog',
            close: function () {
                if (figureNode && figureNode.parentNode) {
                    range.selectNode(figureNode);
                    range.collapse();
                    if (!image) {
                        mathHelpers.layoutDisplayMathNode(
                            contentNode);
                    }
                } else if (insideFigure && insideFigure.parentNode &&
                    typeof (range) !== 'undefined') {
                    range.selectNode(insideFigure);
                    range.collapse();
                }
                if (range) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            },
        };


        dialog.dialog(dialogOpts);


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

        figTypeInput = jQuery('#figure-category', dialog);

        categoryLabel = jQuery(
            '#figure-category-btn label',
            dialog);

        function setFigureLabel() {
            categoryLabel.html(jQuery('#figure-category-' + category).text());
        }
        setFigureLabel();

        function layoutMathPreview() {
            jQuery('#inner-figure-preview')[0].innerHTML =
                '<p>[DMATH]' + equation +
                '[/DMATH]</p>';
            MathJax.Hub.Queue(["Typeset",
                MathJax.Hub,
                "inner-figure-preview"
            ]);
        }

        if (equation) {
            layoutMathPreview();
        }


        $.addDropdownBox(jQuery('#figure-category-btn'), jQuery(
            '#figure-category-pulldown'));

        jQuery('#figure-category-pulldown li span').bind(
            'mousedown', function (event) {
                event.preventDefault();
                console.log(this);
                category = this.id.split('-')[2];
                setFigureLabel();
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
                } else {
                    equation = jQuery(this).val();
                layoutMathPreview();
            }
        });


});


(function (jQuery) {
    return jQuery.widget("IKS.toolbarfigure", {
        options: {
            editable: null,
            uuid: "figure",
            link: true,
            image: true,

            butonCssClass: null
        },
        populateToolbar: function (toolbar) {
            var buttonize, buttonset, dialog, imageDialog, dialogId,
                dialogSubmitCb,
                mathInput, captionInput, figTypeInput, insideFigure,
                figureNode, contentNode, captionNode, widget, range,
                selection,
                image = false,
                _this = this;




            imageDialogOpts = {
                autoOpen: false,
                width: 'auto',
                height: 'auto',
                title: gettext("Images"),
                modal: true,
                resizable: false,
                draggable: false,
                dialogClass: 'hallofigureimage-dialog'
            };

            imageDialog = jQuery(tmp_figure_image());




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

                openDialog = function (onFigure) {
                    var figTypeSelectorValue, figTypeInputValue;
                    jQuery(document).trigger('openFigureDialog');
                    insideFigure = onFigure;
                    selection = rangy.getSelection();

                    if (selection.getAllRanges().length === 0) {
                        range = rangy.createRange();
                    } else {
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



                    mathInput.val('');
                    captionInput.val('');
                    figTypeSelectorValue.textContent = gettext(
                        'Figure');
                    figTypeInput.val('figure');
                    jQuery('#addFigureButton').val(gettext('Insert'));
                    jQuery('#deleteFigureButton').css('display',
                        'none');


                    widget.options.editable.keepActivated(true);
                    dialog.dialog('open');
                    captionInput.focus();

                    return false;
                }
                button.bind("click", function (event) {
                    openDialog();
                });

                jQuery(document).one('openFigureDialog', function () {




                });

                // functions for image selection dialog
                jQuery(document).on('click', '#imagelist tr', function () {
                    var checkedImage = jQuery('#imagelist tr.checked'),
                        selecting = true;
                    if (checkedImage.length > 0 && this == checkedImage[0]) {
                        selecting = false;
                    }
                    checkedImage.removeClass('checked');
                    if (selecting) {
                        jQuery(this).addClass('checked');
                    }
                });

                jQuery(document).on('click', '#selectImageFigureButton',
                    function () {
                        var checkedImage = jQuery(
                            '#imagelist tr.checked');
                        if (0 === checkedImage.length) {
                            image = false;
                            jQuery('#inner-figure-preview')[0].innerHTML =
                                '';
                            jQuery('input[name=figure-math]').removeAttr(
                                'disabled');
                        } else {
                            image = ImageDB[checkedImage[0].id.split(
                                '_')[1]];
                            jQuery('#inner-figure-preview')[0].innerHTML =
                                '<img src="' +
                                image.image +
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
                        if (image) {
                            jQuery('#Image_' + image.pk).addClass(
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