import {usermediaEditcategoriesTemplate, usermediaCategoryformsTemplate, usermediaCategoryListItemTemplate} from "./templates"

export class ImageOverviewCategories {

    constructor(imageOverview) {
        this.imageOverview = imageOverview
        imageOverview.mod.categories = this
    }
    //save changes or create a new category
    createCategory(cats) {
        let post_data = {
            'ids[]': cats.ids,
            'titles[]': cats.titles
        }, that = this
        $.activateWait()
        $.ajax({
            url: '/usermedia/save_category/',
            data: post_data,
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                if (jqXHR.status == 201) {
                    // TODO: Why do we reload the entire list when one new category is created?
                    imageCategories = []
                    jQuery('#image-category-list li').not(':first').remove()
                    that.addImageCategoryList(response.entries)

                    $.addAlert('success', gettext('The categories have been updated'))
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                $.deactivateWait()
            }
        })
    }

    addImageCategoryList(newimageCategories) {
        //imageCategories = imageCategories.concat(newimageCategories)
        for (let i = 0; i < newimageCategories.length; i++) {
            this.appendToImageCatList(newimageCategories[i])
        }
    }

    appendToImageCatList(iCat) {
        jQuery('#image-category-list').append(
            usermediaCategoryListItemTemplate({
                'iCat': iCat
            }))
    }

    //delete an image category

    deleteCategory(ids) {
        let post_data = {
            'ids[]': ids
        }
        $.ajax({
            url: '/usermedia/delete_category/',
            data: post_data,
            type: 'POST',
            dataType: 'json'
        })
    }

    //open a dialog for editing categories
    createCategoryDialog() {
        let that = this
        let dialogHeader = gettext('Edit Categories')
        let dialogBody = usermediaEditcategoriesTemplate({
            'dialogHeader': dialogHeader,
            'categories': tmpUsermediaCategoryforms({
                'categories': imageCategories
            })
        })
        jQuery('body').append(dialogBody)
        let diaButtons = {}
        diaButtons[gettext('Submit')] = function () {
            let new_cat = {
                'ids': [],
                'titles': []
            }
            let deletedCats = []
            jQuery('#editCategories .category-form').each(function () {
                let this_val = jQuery.trim(jQuery(this).val())
                let this_id = jQuery(this).attr('data-id')
                if ('undefined' == typeof (this_id)) this_id = 0
                if ('' != this_val) {
                    new_cat.ids.push(this_id)
                    new_cat.titles.push(this_val)
                } else if ('' == this_val && 0 < this_id) {
                    deletedCats.push(this_id)
                }
            })
            that.deleteCategory(deletedCats)
            that.createCategory(new_cat)
            jQuery(this).dialog('close')
        }
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close')
        }
        jQuery("#editCategories").dialog({
            resizable: false,
            width: 350,
            height: 350,
            modal: true,
            buttons: diaButtons,
            create: function () {
                let $the_dialog = jQuery(this).closest(".ui-dialog")
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            },
            close: function () {
                jQuery("#editCategories").dialog('destroy').remove()
            },
        })
        this.addRemoveListHandler()

    }

    addRemoveListHandler() {
        //add and remove name list field
        jQuery('.fw-add-input').bind('click', function () {
            let $parent = jQuery(this).parents('.fw-list-input')
            if (0 == $parent.next().size()) {
                let $parent_clone = $parent.clone(true)
                $parent_clone.find('input, select').val('').removeAttr(
                    'data-id')
                $parent_clone.insertAfter($parent)
            } else {
                let $the_prev = jQuery(this).prev()
                if ($the_prev.hasClass("category-form")) {
                    let this_id = $the_prev.attr('data-id')
                    if ('undefined' != typeof (this_id))
                        deleted_cat[deleted_cat.length] = this_id
                }
                $parent.remove()
            }
        })
        jQuery('.dk').dropkick()
    }

}
