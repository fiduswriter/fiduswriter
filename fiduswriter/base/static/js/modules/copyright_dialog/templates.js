import {escapeText} from "fwtoolkit"
import {LICENSE_URLS} from "./index"

export const licenseSelectTemplate = ({url}) =>
    `<select class="license">
        <option value=""></option>
        ${LICENSE_URLS.map(
            licenseUrl =>
                `<option value="${licenseUrl[1]}"${url === licenseUrl[1] ? " selected" : ""}>${licenseUrl[0]}</option>`
        ).join("")}
    </select>
    <div class="fw-select-arrow fa fa-caret-down"></div>`

export const licenseInputTemplate = ({url, title}) =>
    `<div class="field-part field-part-huge">
        <input type='text' class='license' value="${escapeText(url)}" placeholder="${gettext("License URL")}">
    </div>
    <div class="field-part field-part-huge">
        <input type='text' class='license-title' value="${escapeText(title)}" placeholder="${gettext("License Title")}">
    </div>`

export const copyrightTemplate = ({holder, year, freeToRead}) =>
    `<table class="fw-dialog-table">
        <tbody>
            <tr>
                <th><h4 class="fw-tablerow-title wtooltip">
                    ${gettext("Copyright holder")}
                    <span class="tooltip">${gettext("If the work is not in the public domain, specify who the copyright holder is.")}</span>
                </h4></th>
                <td class="entry-field"><input type="text" class="holder" value="${holder ? escapeText(holder) : ""}"></td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title wtooltip">
                    ${gettext("Copyright year")}
                    <span class="tooltip">${gettext("If the work is not in the public domain, specify the year of the copyright.")}</span>
                </h4></th>
                <td class="entry-field"><input type="number" class="year" min=0 max=2100 value="${year ? year : ""}"></td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title wtooltip">
                    ${gettext("Available to read for free?")}
                    <span class="tooltip">${gettext("Specify whether the work can be accessed without paying a fee.")}</span>
                </h4></th>
                <td class="entry-field"><input type="checkbox" class="free-to-read"${freeToRead ? " checked" : ""}></td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title wtooltip">
                    ${gettext("License(s)")}
                    <span class="tooltip">${gettext('List any licenses the work is available under. If the license only applies from a given date, please specify the date in the ISO8601 format (such as "2012-10-15").')}</span>
                </h4></th>
                <td class="entry-field licenses">
                    <div class="copyright-licenses-list"></div>
                </td>
            </tr>
        </tbody>
    </table>`
