import {escapeText} from "fwtoolkit"

/* A template for the image category selection of the image selection dialog. */
const imageEditCategoryTemplate = ({cats}) => {
    if (!cats.length) {
        return ""
    }
    return `<div class="fw-media-category">
            <div>${gettext("Select categories")}</div>
            <div id="image-edit-categories"></div>
        </div>`
}

/* A template for the form for the image upload dialog. */
export const imageEditTemplate = ({image, cats}) =>
    `<div>
        <input name="title" class="fw-media-title" type="text"
                placeholder="${gettext("Insert a title")}" value="${
                    image ? escapeText(image.title) : ""
                }" />
        ${
            image
                ? ""
                : `<button type="button" class="fw-media-select-button fw-button fw-light">
                ${gettext("Select a file")}
            </button>
            <input name="image" type="file" class="fw-media-file-input">`
        }
    </div>
    <div class="figure-preview">
        <button class="figure-edit-menu" title="${gettext("Edit Image")}">
            <span class="dot-menu-icon"><i class="fa fa-ellipsis-v"></i></span>
        </button>
    <div>
        ${
            image && image.image
                ? `<div class="img" style="background-image: url(${image.image});"></div>`
                : ""
        }
    </div></div>
    ${imageEditCategoryTemplate({cats})}`
