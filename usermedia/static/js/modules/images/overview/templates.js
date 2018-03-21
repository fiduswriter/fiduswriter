import {escapeText, localizeDate} from "../../common"

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
export let usermediaEditcategoriesTemplate = ({dialogHeader, categories}) =>
    `<div id="editCategories" title="${dialogHeader}">
        <table id="editCategoryList" class="fw-dialog-table">
            <tbody>
                ${usermediaCategoryformsTemplate({categories})}
            </tbody>
        </table>
    </div>`

/** A template for image overview list. */
export let usermediaTableTemplate = ({id, cats, title, width, height, fileType, added, thumbnail, image}) =>
    `<tr id="Image_${id}" class="${cats.map(cat => `cat_${cat}`)}">
        <td width="40">
            <span class="fw-inline">
                <input type="checkbox" class="entry-select" data-id="${id}">
            </span>
        </td>
        <td width="430" class="title">
            <span class="fw-usermedia-image">
                <img src="${thumbnail ? thumbnail : image}">
            </span>
            <span class="fw-inline fw-usermedia-title">
                <span class="edit-image fw-link-text fw-searchable" data-id="${id}">
                    ${title.length ? title : gettext('Untitled')}
                </span>
                <span class="fw-usermedia-type">${fileType}</span>
            </span>
        </td>
        <td width="205" class="type ">
            <span class="fw-inline">${width} x ${height}</span>
        </td>
        <td width="190" class="file_type ">
            <span class="fw-inline">${localizeDate(added, 'sortable-date')}</span>
        </td>
        <td width="75" align="center">
            <span class="delete-image fw-inline fw-link-text" data-id="${id}"
                    data-title="${escapeText(title)}">
                <i class="fa fa-trash-o"></i>
            </span>
        </td>
    </tr>`
