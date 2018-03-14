import {usermediaEditcategoriesTemplate} from "./templates"
import {activateWait, deactivateWait, addAlert, postJson} from "../../common"

export class ImageOverviewCategories {

    constructor(imageOverview) {
        this.imageOverview = imageOverview
        imageOverview.mod.categories = this
    }

    //save changes or create a new category
    saveCategories(cats) {
        activateWait()

        postJson(
            '/usermedia/save_category/',
            {
                'ids': cats.ids,
                'titles': cats.titles
            }
        ).then(
            response => {
                this.imageOverview.imageDB.cats = response.entries
                this.setImageCategoryList(response.entries)
                addAlert('success', gettext('The categories have been updated'))
            }
        ).catch(
            () => addAlert('error', gettext('Could not update categories'))
        ).then(
            () => deactivateWait()
        )
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
        document.body.insertAdjacentHTML(
            'beforeend',
            dialogBody
        )
        let diaButtons = {}
        let that = this
        diaButtons[gettext('Submit')] = function () {
            let cats = {
                'ids': [],
                'titles': []
            }
            document.querySelectorAll('#editCategories .category-form').forEach(el => {
                let thisVal = el.value.trim()
                let thisId = this.dataset.id
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
        document.querySelectorAll('.fw-add-input').forEach(el =>
            el.addEventListener('click', event => {
                let parent = jQuery(el).parents('.fw-list-input')
                if (0 === parent.next().length) {
                    let parentClone = parent.clone(true)
                    parentClone.find('input, select').val('').removeAttr('data-id')
                    parentClone.insertAfter(parent)
                } else {
                    parent.remove()
                }
            })
        )
    }

}
