import {figureImageTemplate, configureFigureTemplate} from "./templates"

export let bindFigure = function (editor) {
// toolbar figure
    jQuery(document).on('mousedown', '#button-figure:not(.disabled)', function (event) {

        let dialog, submitMessage = gettext('Insert'),
            dialogButtons = [],
            insideFigure = false,
            figureNode = false,
            contentNode = false,
            image = false,
            caption = '',
            figureCategory = 'figure',
            equation = '',
            previewImage,
            mathInput, captionInput,
            node = editor.pm.selection.node

        event.preventDefault()




        if (node && node.type && node.type.name==='figure') {
            insideFigure = true
            submitMessage = gettext('Update')
            equation = node.attrs.equation
            image = node.attrs.image
            figureCategory = node.attrs.figureCategory
            caption = node.attrs.caption

            if ('' === image) {
                image = false
            } else {
                previewImage = ImageDB[image]
                //TODO: Figure out what to do if the image has been deleted from ImageDB in the meantime.
            }
            dialogButtons.push({
                text: gettext('Remove'),
                class: 'fw-button fw-orange',
                click: function () {
                    editor.pm.execCommand('deleteSelection')
                    dialog.dialog('close')
                }
            })

        }

        dialog = jQuery(configureFigureTemplate({
            equation: equation,
            caption: caption,
            image: image
        }))

        dialogButtons.push({
            text: submitMessage,
            class: 'fw-button fw-dark',
            mousedown: function (event) {
                let figureCatNode, captionTextNode, captionNode
                event.preventDefault()
                equation = mathInput.val()
                caption = captionInput.val()

                if ((new RegExp(/^\s*$/)).test(equation) && (!image)) {
                    // The math input is empty. Delete a math node if it exist. Then close the dialog.
                    if (insideFigure) {
                        editor.pm.execCommand('deleteSelection')
                    }
                    dialog.dialog('close')
                    return false
                }

                if (insideFigure && equation === node.attrs.equation &&
                    (image === node.attrs.image) &&
                    caption === node.attrs.caption &&
                    figureCategory === node.attrs.figureCategory) {
                    // the figure has not been changed, just close the dialog
                    dialog.dialog('close')
                    return false
                }

                editor.pm.execCommand('figure:insert', [equation, image, figureCategory, caption])


                dialog.dialog('close')
                return false
            },
        })

        dialogButtons.push({
            text: gettext('Cancel'),
            class: 'fw-button fw-orange',
            click: function (event) {
                dialog.dialog('close')
            }
        })


        let dialogOpts = {
            width: 'auto',
            height: 585,
            title: gettext("Enter latex math or insert an image"),
            modal: true,
            resizable: false,
            draggable: false,
            buttons: dialogButtons,
            dialogClass: 'figure-dialog',
            close: function () {
                jQuery(this).dialog('destroy').remove()
            },
        }


        dialog.dialog(dialogOpts)

        mathInput = jQuery('input[name=figure-math]', dialog)
        captionInput = jQuery('input[name=figure-caption]', dialog)
            .focus(function (
                e) {
                return this.select()
            })

        captionInput.focus()

        function setFigureLabel() {
            jQuery(
                '#figure-category-btn label',
                dialog).html(jQuery('#figure-category-' + figureCategory).text())
        }
        setFigureLabel()

        function layoutMathPreview() {
            jQuery('#inner-figure-preview')[0].innerHTML =
                '<p>[DMATH]' + equation +
                '[/DMATH]</p>'
            MathJax.Hub.Queue(["Typeset",
                MathJax.Hub,
                "inner-figure-preview"
            ])
        }

        function layoutImagePreview() {
            jQuery('#inner-figure-preview')[0].innerHTML =
                '<img src="' +
                previewImage.image +
                '" style="max-width: 400px;max-height:220px">'
        }

        if (equation) {
            layoutMathPreview()
        } else if (image) {
            layoutImagePreview()
        }


        $.addDropdownBox(jQuery('#figure-category-btn'), jQuery(
            '#figure-category-pulldown'))

        jQuery('#figure-category-pulldown li span').bind(
            'mousedown', function (event) {
                event.preventDefault()
                figureCategory = this.id.split('-')[2]
                setFigureLabel()
            })

        jQuery('input[name=figure-math]').bind('focus',
            function () {
                // If a figure is being entered, disable the image button
                jQuery('#insertFigureImage').addClass(
                    'disabled').attr(
                    'disabled', 'disabled')
            })

        jQuery('input[name=figure-math]').bind('blur',
            function () {
                if (jQuery(this).val() === '') {
                    jQuery('#inner-figure-preview')[0].innerHTML =
                        ''
                    // enable image button
                    jQuery('#insertFigureImage').removeClass(
                        'disabled')
                        .removeAttr('disabled')
                } else {
                    equation = jQuery(this).val()
                    layoutMathPreview()
                }
            })

        jQuery('#insertFigureImage').bind('click',
            function () {
                if (jQuery(this).hasClass('disabled')) {
                    return
                }
                let imageDialog = jQuery(figureImageTemplate()).dialog({
                    width: 'auto',
                    height: 'auto',
                    title: gettext("Images"),
                    modal: true,
                    resizable: false,
                    draggable: false,
                    dialogClass: 'figureimage-dialog',
                    close: function () {
                        jQuery(this).dialog('destroy').remove()
                    }
                })

                usermediaHelpers.startUsermediaTable()

                if (image) {
                    jQuery('#Image_' + image).addClass(
                        'checked')
                }

                jQuery('#selectImageFigureButton').bind('click',
                    function () {
                        let checkedImage = jQuery(
                            '#imagelist tr.checked')
                        if (0 === checkedImage.length) {
                            image = false
                            jQuery('#inner-figure-preview')[0].innerHTML =
                                ''
                            jQuery('input[name=figure-math]').removeAttr(
                                'disabled')
                        } else {
                            previewImage = ImageDB[checkedImage[0].id.split(
                                '_')[1]]
                            image = previewImage.pk
                            layoutImagePreview()
                            jQuery('input[name=figure-math]').attr(
                                'disabled',
                                'disabled')
                        }
                        imageDialog.dialog('close')
                    })

                jQuery('#cancelImageFigureButton').bind('click',
                    function () {
                        imageDialog.dialog('close')
                    })


            })

    })

    // functions for the image selection dialog
    jQuery(document).on('click', '#imagelist tr', function () {
        let checkedImage = jQuery('#imagelist tr.checked'),
            selecting = true
        if (checkedImage.length > 0 && this == checkedImage[0]) {
            selecting = false
        }
        checkedImage.removeClass('checked')
        if (selecting) {
            jQuery(this).addClass('checked')
        }
    })

}
