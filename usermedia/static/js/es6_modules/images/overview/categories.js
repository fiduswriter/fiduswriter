import {usermediaEditcategoriesTemplate, usermediaCategoryformsTemplate, usermediaCategoryListItemTemplate} from "./templates"

export class ImageOverviewCategories {

    constructor(imageOverview) {
        this.imageOverview = imageOverview
        imageOverview.mod.categories = this
    }
    //save changes or create a new category
    createCategory(cats) {
        let postData = {
            'ids[]': cats.ids,
            'titles[]': cats.titles
        }, that = this
        $.activateWait()
        $.ajax({
            url: '/usermedia/save_category/',
            data: postData,
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
        let postData = {
            'ids[]': ids
        }
        $.ajax({
            url: '/usermedia/delete_category/',
            data: postData,
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
            let newCat = {
                'ids': [],
                'titles': []
            }
            let deletedCats = []
            jQuery('#editCategories .category-form').each(function () {
                let thisVal = jQuery.trim(jQuery(this).val())
                let thisId = jQuery(this).attr('data-id')
                if ('undefined' == typeof (thisId)) thisId = 0
                if ('' != thisVal) {
                    newCat.ids.push(thisId)
                    newCat.titles.push(thisVal)
                } else if ('' == thisVal && 0 < thisId) {
                    deletedCats.push(thisId)
                }
            })
            that.deleteCategory(deletedCats)
            that.createCategory(newCat)
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
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
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
            let parent = jQuery(this).parents('.fw-list-input')
            if (0 == parent.next().size()) {
                let parentClone = parent.clone(true)
                parentClone.find('input, select').val('').removeAttr(
                    'data-id')
                parentClone.insertAfter(parent)
            } else {
                let thePrev = jQuery(this).prev()
                if (thePrev.hasClass("category-form")) {
                    let thisId = thePrev.attr('data-id')
                    if ('undefined' != typeof (thisId))
                        deleted_cat[deleted_cat.length] = thisId
                }
                parent.remove()
            }
        })
        jQuery('.dk').dropkick()
    }

}
