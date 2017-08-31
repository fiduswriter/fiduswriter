import {escapeText} from "../../common"

/** A template for the editing of bibliography categories list. */
export let editCategoriesTemplate = ({categories, dialogHeader}) =>
    `<div id="editCategories" title="${dialogHeader}">
        <table id="editCategoryList" class="fw-dialog-table"><tbody>${categories}</tbody></table>
    </div>`

/** A template for each category in the category list edit of the bibliography categories list. */
export let categoryFormsTemplate = ({categories}) =>
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


/* A template for the overview list of bibliography items. */
export let bibtableTemplate = ({id, cats, title, type, typetitle, published, author}) =>
    `<tr id="Entry_${id}" class="${cats.map(cat => `cat_${cat}`).join(' ')}">
        <td width="30">
            <span class="fw-inline">
                <input type="checkbox" class="entry-select" data-id="${id}" />
            </span>
        </td>
        <td width="285">
            <span class="fw-document-table-title fw-inline">
                <i class="fa fa-book"></i>
                <span class="edit-bib fw-link-text fw-searchable" data-id="${id}"
                        data-type="${type}">
                    ${title.length ? escapeText(title) : `<i>${gettext('Untitled')}</i>`}
                </span>
            </span>
        </td>
        <td width="205" class="type"><span class="fw-inline">${gettext(typetitle)}</span></td>
        <td width="215" class="author"><span class="fw-inline fw-searchable">${escapeText(author)}</span></td>
        <td width="120" class="publised"><span class="fw-inline">${published}</span></td>
        <td width="70" align="center">
            <span class="delete-bib fw-inline fw-link-text" data-id="${id}"
                    data-title="${escapeText(title)}">
                <i class="fa fa-trash-o"></i>
            </span>
        </td>
    </tr>`

/** A template of a bibliography category list item. */
export let bibliographyCategoryListItemTemplate = ({bCat}) =>
    `<li>
        <span class="fw-pulldown-item" data-id="${bCat.id}">
            ${escapeText(bCat.category_title)}
        </span>
    </li>`
