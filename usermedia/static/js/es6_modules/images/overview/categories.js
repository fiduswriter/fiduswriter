import {usermediaEditcategoriesTemplate, usermediaCategoryListItemTemplate} from "./templates"
import {activateWait, deactivateWait, addAlert, csrfToken} from "../../common"

export class ImageOverviewCategories {

    constructor(imageOverview) {
        this.imageOverview = imageOverview
        imageOverview.mod.categories = this
    }

    //save changes or create a new category
    saveCategories(cats) {
        let postData = {
            'ids[]': cats.ids,
            'titles[]': cats.titles
        }
        activateWait()
        jQuery.ajax({
            url: '/usermedia/save_category/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: (response, textStatus, jqXHR) => {
                if (jqXHR.status == 201) {
                    this.imageOverview.imageDB.cats = response.entries
                    this.setImageCategoryList(response.entries)
                    addAlert('success', gettext('The categories have been updated'))
                }
            },
            error: (jqXHR, textStatus, errorThrown) => {
                addAlert('error', jqXHR.responseText)
            },
            complete: () => deactivateWait()
        })
    }

    setImageCategoryList(imageCategories) {
        let catSelector = this.imageOverview.menu.model.content.find(menuItem => menuItem.id === 'cat_selector')
        catSelector.content = catSelector.content.filter(cat => cat.type !== 'category')
        catSelector.content = catSelector.content.concat(
            imageCategories.map(cat => ({
                type: 'category',
                title: cat.category_title,
                action: overview => {
                    let trs = [].slice.call(document.querySelectorAll('#bibliography > tbody > tr'))
                    trs.forEach(tr => {
                        if (tr.classList.contains(`cat_${cat.id}`)) {
                            tr.style.display = ''
                        } else {
                            tr.style.display = 'none'
                        }
                    })
                }
            }))
        )
        this.imageOverview.menu.update()
    }

    //open a dialog for editing categories
    editCategoryDialog() {
        let dialogHeader = gettext('Edit Categories')
        let dialogBody = usermediaEditcategoriesTemplate({
            dialogHeader,
            categories: this.imageOverview.imageDB.cats
        })
        jQuery('body').append(dialogBody)
        let diaButtons = {}
        let that = this
        diaButtons[gettext('Submit')] = function () {
            let cats = {
                'ids': [],
                'titles': []
            }
            jQuery('#editCategories .category-form').each(function () {
                let thisVal = jQuery.trim(jQuery(this).val())
                let thisId = jQuery(this).attr('data-id')
                if ('undefined' == typeof (thisId)) thisId = 0
                if ('' !== thisVal) {
                    cats.ids.push(thisId)
                    cats.titles.push(thisVal)
                }
            })
            that.saveCategories(cats)
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
            close: () =>
                jQuery("#editCategories").dialog('destroy').remove()
        })
        this.addRemoveListHandler()

    }

    addRemoveListHandler() {
        //add and remove name list field
        jQuery('.fw-add-input').bind('click', function () {
            let parent = jQuery(this).parents('.fw-list-input')
            if (0 === parent.next().length) {
                let parentClone = parent.clone(true)
                parentClone.find('input, select').val('').removeAttr(
                    'data-id')
                parentClone.insertAfter(parent)
            } else {
                parent.remove()
            }
        })
        jQuery('.dk').dropkick()
    }

}
