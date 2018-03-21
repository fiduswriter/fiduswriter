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
        let that = this
        let buttons = [
            {
                text: gettext('Submit'),
                class: "fw-button fw-dark",
                click: function () {
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
            },
            {
                text: gettext('Cancel'),
                class: "fw-button fw-orange",
                click: function () {jQuery(this).dialog('close')}
            }
        ]

        jQuery("#editCategories").dialog({
            resizable: false,
            width: 350,
            height: 350,
            modal: true,
            buttons,
            close: () =>
                jQuery("#editCategories").dialog('destroy').remove()
        })
    }


}
