import {escapeText} from "../../common"

/** A template for the image category edit form. */
let usermediaCategoryformsTemplate = ({categories}) =>
    `${
        categories.map(cat =>
            `<tr id="categoryTr_${cat.id}" class="fw-list-input">
                <td>
                    <input type="text" class="category-form" id="categoryTitle_${cat.id}"
                            value="${escapeText(cat.category_title)}" data-id="${cat.id}" />
                    <span class="fw-add-input icon-addremove"></span>
                </td>
            </tr>`
        ).join('')
    }
    <tr class="fw-list-input">
        <td>
            <input type="text" class="category-form" />
            <span class="fw-add-input icon-addremove"></span>
        </td>
    </tr>`

/** A template to edit image categories. */
export let usermediaEditcategoriesTemplate = ({categories}) =>
    `<table id="editCategoryList" class="fw-dialog-table">
        <tbody>
            ${usermediaCategoryformsTemplate({categories})}
        </tbody>
    </table>`
