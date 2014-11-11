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
        range,
        dialog, submitMessage = gettext('Insert'),
        dialogButtons = [],
        insideFigure = false,
        figureNode = false,
        contentNode = false,
        image = false,
        caption = '',
        category = 'figure',
        equation = '',
        mathInput, captionInput;
    event.preventDefault();

    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        if (jQuery(range.startContainer).closest('#document-editable').length===0) {
            range = rangy.createRange();
        }

    } else {
        range = rangy.createRange();
    }



    if (jQuery(this).is('figure')) {
        insideFigure = this;
        range.selectNode(insideFigure);
        range.collapse();
        submitMessage = gettext('Update');
        equation = insideFigure.getAttribute(
            'data-equation');
        caption = insideFigure.getAttribute(
            'data-caption');
        category = insideFigure.getAttribute(
            'data-figure-category');

        image = insideFigure.getAttribute(
            'data-image');
        if ('' === image) {
            image = false;
        } else {
            image = ImageDB[image];
            //TODO: Figure out what to do if the image has been deleted from ImageDB in the meantime.
        }
        dialogButtons.push({
            text: gettext('Remove'),
            class: 'fw-button fw-orange',
            click: function () {
                manualEdits.remove(insideFigure, range);
                insideFigure = false;
                dialog.dialog('close');
            }
        });

    }

    dialog = jQuery(toolbarTemplates.configureFigure({
        equation: equation,
        caption: caption,
        image: image
    }));

    dialogButtons.push({
        text: submitMessage,
        class: 'fw-button fw-dark',
        mousedown: function (event) {
            var figureCatNode, captionTextNode, captionNode;
            event.preventDefault();
            equation = mathInput.val();
            caption = captionInput.val();

            if ((new RegExp(/^\s*$/)).test(equation) && (!image)) {
                // The math input is empty. Delete a math node if it exist. Then close the dialog.
                if (insideFigure) {
                    manualEdits.remove(insideFigure, false);
                }
                dialog.dialog('close');
                return false;
            }

            if (insideFigure && equation === insideFigure.getAttribute(
                    'data-equation') &&
                (image.pk === insideFigure.getAttribute(
                    'data-image') || (image.pk === undefined && insideFigure.getAttribute(
                    'data-image') === '')) &&
                caption === insideFigure.getAttribute(
                    'data-caption') &&
                category === insideFigure.getAttribute(
                    'data-figure-category')) {
                // the figure has not been changed, just close the dialog
                dialog.dialog('close');
                return false;
            }

            figureNode = document.createElement('figure');
            figureNode.setAttribute('data-equation', equation);
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
                    equation);
                contentNode.innerHTML = ' ';
            }

            captionNode = document.createElement(
                'figcaption');

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
        height: 585,
        title: gettext("Enter latex math or insert an image"),
        modal: true,
        resizable: false,
        draggable: false,
        buttons: dialogButtons,
        dialogClass: 'figure-dialog',
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
            jQuery(this).dialog('destroy').remove();
        },
    };


    dialog.dialog(dialogOpts);

    mathInput = jQuery('input[name=figure-math]', dialog); /*.focus(
        function (
            e) {
            return this.select();
        });*/
    captionInput = jQuery('input[name=figure-caption]', dialog)
        .focus(function (
            e) {
            return this.select();
        });

    captionInput.focus();

    function setFigureLabel() {
        jQuery(
            '#figure-category-btn label',
            dialog).html(jQuery('#figure-category-' + category).text());
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

    function layoutImagePreview() {
        jQuery('#inner-figure-preview')[0].innerHTML =
            '<img src="' +
            image.image +
            '" style="max-width: 400px;max-height:220px">';
    }

    if (equation) {
        layoutMathPreview();
    } else if (image) {
        layoutImagePreview();
    }


    $.addDropdownBox(jQuery('#figure-category-btn'), jQuery(
        '#figure-category-pulldown'));

    jQuery('#figure-category-pulldown li span').bind(
        'mousedown', function (event) {
            event.preventDefault();
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

    jQuery('#insertFigureImage').bind('click',
        function () {
            if (jQuery(this).hasClass('disabled')) {
                return;
            }
            var imageDialog = jQuery(toolbarTemplates.figureImage()).dialog({
                width: 'auto',
                height: 'auto',
                title: gettext("Images"),
                modal: true,
                resizable: false,
                draggable: false,
                dialogClass: 'figureimage-dialog',
                close: function () {
                    jQuery(this).dialog('destroy').remove();
                }
            });

            usermediaHelpers.startUsermediaTable();

            if (image) {
                jQuery('#Image_' + image.pk).addClass(
                    'checked');
            }

            jQuery('#selectImageFigureButton').bind('click',
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
                        layoutImagePreview();
                        jQuery('input[name=figure-math]').attr(
                            'disabled',
                            'disabled');
                    }
                    imageDialog.dialog('close');
                });

            jQuery('#cancelImageFigureButton').bind('click',
                function () {
                    imageDialog.dialog('close');
                });


        });


});

// functions for the image selection dialog
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
