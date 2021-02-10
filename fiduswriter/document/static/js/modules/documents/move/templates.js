import {escapeText} from "../../common"

export const moveTemplate = ({path}) =>
    `<div>
    <span>${gettext('Path')}:</span>
    <input type="text" value="${escapeText(path)}" id="path">
    </div>`
