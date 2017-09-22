import {escapeText} from "../../common"

/* A template for the image category selection of the image selection dialog. */
let imageEditCategoryTemplate = ({image, cats}) => {
    if (!cats.length) {
        return ''
    }
    return `<div class="fw-media-category">
            <div>${gettext('Select categories')}</div>
            ${cats.map(cat =>
                `<label class="fw-checkable fw-checkable-label${
                        image && image.cats.includes(cat.id) ?
                        ' checked' :
                        ''
                    }"
                        for="imageCat${cat.id}">
                    ${escapeText(cat.category_title)}
                </label>
                <input class="fw-checkable-input fw-media-form entry-cat" type="checkbox"
                        id="imageCat${cat.id}" name="imageCat" value="${cat.id}" ${
                            image && image.cats.includes(cat.id) ?
                            ' checked' :
                            ''
                        }>`
            ).join('')}
        </div>`
}

/* A template for the form for the image upload dialog. */
export let imageEditTemplate = ({image, cats}) =>
    `<div id="editimage" class="fw-media-uploader" title="${
            image ?
            escapeText('Update Image') :
            gettext('Upload Image')
        }">
        <div>
            <input name="title" class="fw-media-title" type="text"
                    placeholder="${gettext('Insert a title')}" value="${
                            image ? escapeText(image.title) : ''
                    }" />
            ${
                image ?
                '' :
                `<button type="button" class="fw-media-select-button fw-button fw-light">
                    ${gettext('Select a file')}
                </button>
                <input name="image" type="file" class="fw-media-file-input">`
            }
        </div>
        <div class="figure-preview"><div>
            ${
                image && image.image ?
                `<img src="${image.image}" />` :
                ''
            }
        </div></div>
        ${imageEditCategoryTemplate({image, cats})}
    </div>`
