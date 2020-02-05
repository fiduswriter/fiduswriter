import {escapeText} from "../common"

const LICENSE_URLS = [
    ['CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'],
    ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'],
    ['CC BY-ND 4.0', 'https://creativecommons.org/licenses/by-nd/4.0/'],
    ['CC BY-NC 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/'],
    ['CC BY-NC-SA 4.0', 'https://creativecommons.org/licenses/by-nc-sa/4.0/'],
    ['CC BY-NC-ND 4.0', 'https://creativecommons.org/licenses/by-nc-nd/4.0/'],
    ['CC0', 'https://creativecommons.org/publicdomain/zero/1.0/']
]

export const licenseSelectTemplate = ({url}) =>
    `<select class="license">
        <option value=""></option>
        ${
            LICENSE_URLS.map(licenseUrl => `<option value="${licenseUrl[1]}"${url===licenseUrl[1] ? ' selected' : ''}>${licenseUrl[0]}</option>`).join('')
        }
    </select>
    <div class="fw-select-arrow fa fa-caret-down"></div>`

export const licenseInputTemplate = ({url}) =>
    `<input type='text' class='field-part-single license' value="${escapeText(url)}" placeholder="${gettext('License URL')}">`

const licenseTemplate = ({url, start}) => {
    const selector = url === '' || LICENSE_URLS.find(licenseUrl => licenseUrl[1] === url) ? true : false
    return `<tr>
        <td>
            <table>
                <tr>
                    <td colspan="2">
                        <div class="type-switch-input-wrapper">
                            <button class="type-switch value${selector ? '1' : '2'}">
                                <span class="type-switch-inner">
                                    <span class="type-switch-label">${gettext('From list')}</span>
                                    <span class="type-switch-label">${gettext('Custom')}</span>
                                </span>
                            </button>
                            <div class="type-switch-input-inner">${selector ? licenseSelectTemplate({url}) : licenseInputTemplate({url})}</div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td><input type="text" value="${start ? start : ''}" class="field-part-single license-start" placeholder="${gettext('License start date (optional)')}"></td>
                </tr>
            </table>
        </td>
        <td class="input-field-list-ctrl">
            <span class="fa fa-minus-circle"></span>&nbsp;<span class="fa fa-plus-circle"></span>
        </td>
    </tr>`
}


export const copyrightTemplate = ({holder, year, freeToRead, licenses}) =>
    `<table class="fw-dialog-table">
        <tbody>
            <tr>
                <th><h4 class="fw-tablerow-title wtooltip">
                    ${gettext('Copyright holder')}
                    <span class="tooltip">${gettext('If the work is not in the public domain, specify who the copyright holder is.')}</span>
                </h4></th>
                <td class="entry-field"><input type="text" class="holder" value="${holder ? escapeText(holder) : ''}"></td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title wtooltip">
                    ${gettext('Copyright year')}
                    <span class="tooltip">${gettext('If the work is not in the public domain, specify the year of the copyright.')}</span>
                </h4></th>
                <td class="entry-field"><input type="number" class="year" min=0 max=2100 value="${year ? year : ''}"></td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title wtooltip">
                    ${gettext('Available to read for free?')}
                    <span class="tooltip">${gettext('Specify whether the work can be accessed without paying a fee.')}</span>
                </h4></th>
                <td class="entry-field"><input type="checkbox" class="free-to-read"${freeToRead? ' checked' : ''}></td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title wtooltip">
                    ${gettext('License(s)')}
                    <span class="tooltip">${gettext('List any licenses the work is available under. If the license only applies from a given date, please specify the date in the ISO8601 format (such as "2012-10-15").')}</span>
                </h4></th>
                <td class="entry-field licenses">
                    <table class="input-list-wrapper">
                        <tbody>
                            ${licenses.map(license => licenseTemplate(license)).join('')}
                            ${licenseTemplate({url: '', start: false})}
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>`
