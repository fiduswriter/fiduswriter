import {escapeText} from "../common"
import {LANGUAGES} from "../editor/common"

const headingTemplate = ({
    id="",
    title="",
    attrs={
        elements: "heading1 heading2 heading3 heading4 heading5 heading6",
        marks: "strong emph highlight underline"
    },
    locking="free",
    optional="false",
    language=false
}) =>
`<div class="doc-part" data-type="heading">
    <div class="title">${gettext('Heading')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Locking')}
            <select class="locking">
                <option value="free" ${locking==='free' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
            </select>
        </label>
        <label>${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="true_on" ${optional==='true_on' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="true_off" ${optional==='true_off' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </label>
        <label>${gettext('Whitelist elements')} <input type="text" class="elements" value="${escapeText(attrs.elements)}"></label>
        <label>${gettext('Whitelist marks')} <input type="text" class="marks" value="${escapeText(attrs.marks)}"></label>
        <label>${gettext('Language')}
            <select class="language">
                <option value="false" ${language===false ? "selected" : ""}>${gettext('Document language')}</option>
                ${
                    LANGUAGES.map(([code, name]) =>
                        `<option value="${code}" ${language===code ? "selected" : ""}>${name}</option>`
                    ).join('')
                }
                <option value="true_on" ${optional==='true_on' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="true_off" ${optional==='true_off' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </label>
        <div>
            <label>${gettext('Initial content')}</label>
            <div class="initial"></div>
        </div>
        <div>
            <label>${gettext('Instructions')}</label>
            <div class="help"></div>
        </div>
    </div>
</div>`

const contributorsTemplate = ({
    id="",
    title="",
    attrs={
        item_title: ""
    },
    locking="free",
    optional="false"
}) =>
`<div class="doc-part" data-type="contributors">
    <div class="title">${gettext('Namelist')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Item title')} <input type="text" class="item_title" value="${escapeText(attrs.item_title)}"></label>
        <label>${gettext('Locking')}
            <select class="locking">
                <option value="free" ${locking==='free' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
            </select>
        </label>
        <label>${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="true_on" ${optional==='true_on' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="true_off" ${optional==='true_off' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </label>
        <div>
            <label>${gettext('Instructions')}</label>
            <div class="help"></div>
        </div>
    </div>
</div>`

const richtextTemplate = ({
    id="",
    title="",
    attrs={
        elements: "paragraph heading figure table ordered_list bullet_list",
        marks: "strong emph highlight underline"
    },
    locking="free",
    optional="false",
    language=false
}) => `<div class="doc-part" data-type="richtext">
    <div class="title">${gettext('Richtext')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Locking')}
            <select class="locking">
                <option value="free" ${locking==='free' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
            </select>
        </label>
        <label>${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="true_on" ${optional==='true_on' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="true_off" ${optional==='true_off' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </label>
        <label>${gettext('Whitelist elements')} <input type="text" class="elements" value="${escapeText(attrs.elements)}"></label>
        <label>${gettext('Whitelist marks')} <input type="text" class="marks" value="${escapeText(attrs.marks)}"></label>
        <label>${gettext('Language')}
            <select class="language">
                <option value="false" ${language===false ? "selected" : ""}>${gettext('Document language')}</option>
                ${
                    LANGUAGES.map(([code, name]) =>
                        `<option value="${code}" ${language===code ? "selected" : ""}>${name}</option>`
                    ).join('')
                }
                <option value="true_on" ${optional==='true_on' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="true_off" ${optional==='true_off' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </label>
        <div>
            <label>${gettext('Initial content')}</label>
            <div class="initial"></div>
        </div>
        <div>
            <label>${gettext('Instructions')}</label>
            <div class="help"></div>
        </div>
    </div>
</div>`

const tagsTemplate = ({
    id="",
    title="",
    attrs={
        item_title: ""
    },
    locking="free",
    optional="false"
}) =>
`<div class="doc-part" data-type="tags">
    <div class="title">${gettext('Tags')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Item title')} <input type="text" class="item_title" value="${escapeText(attrs.item_title)}"></label>
        <label>${gettext('Locking')}
            <select class="locking">
                <option value="free" ${locking==='free' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
            </select>
        </label>
        <label>${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="true_on" ${optional==='true_on' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="true_off" ${optional==='true_off' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </label>
        <div>
            <label>${gettext('Instructions')}</label>
            <div class="help"></div>
        </div>
    </div>
</div>`

const tableTemplate = ({
    id="",
    title="",
    attrs={
        elements: "paragraph heading figure ordered_list bullet_list",
        marks: "strong emph highlight underline"
    },
    locking="free",
    optional="false",
    language=false
}) =>
`<div class="doc-part" data-type="table">
    <div class="title">${gettext('Table')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Locking')}
            <select class="locking">
                <option value="free" ${locking==='free' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
                <option value="rows" ${locking==='rows' ? "selected" : ""}>${gettext('User can add/remove rows')}</option>
            </select>
        </label>
        <label>${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="true_on" ${optional==='true_on' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="true_off" ${optional==='true_off' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </label>
        <label>${gettext('Whitelist elements')} <input type="text" class="elements" value="${escapeText(attrs.elements)}"></label>
        <label>${gettext('Whitelist marks')} <input type="text" class="marks" value="${escapeText(attrs.marks)}"></label>
        <label>${gettext('Language')}
            <select class="language">
                <option value="false" ${language===false ? "selected" : ""}>${gettext('Document language')}</option>
                ${
                    LANGUAGES.map(([code, name]) =>
                        `<option value="${code}" ${language===code ? "selected" : ""}>${name}</option>`
                    ).join('')
                }
                <option value="true_on" ${optional==='true_on' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="true_off" ${optional==='true_off' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </label>
        <div>
            <label>${gettext('Initial content')}</label>
            <div class="initial"></div>
        </div>
        <div>
            <label>${gettext('Instructions')}</label>
            <div class="help"></div>
        </div>
    </div>
</div>`

export const templateEditorValueTemplate = ({value}) =>
    value.map(docPart => {
        switch(docPart.type) {
            case 'heading':
                return headingTemplate(docPart)
            case 'contributors':
                return contributorsTemplate(docPart)
            case 'richtext':
                return richtextTemplate(docPart)
            case 'tags':
                return tagsTemplate(docPart)
            case 'table':
                return tableTemplate(docPart)
            default:
                return ''
        }
    }).join('')

export const toggleEditorButtonTemplate = () =>
    `<ul class="object-tools right">
        <li>
            <a href="#" id="toggle-editor">${gettext('Source/Editor')}</a>
        </li>
    </ul>`

export const documentConstructorTemplate = ({value}) =>
    `<ul class="errorlist"></ul>
    <table id="template-editor">
        <thead>
            <tr>
                <th>${gettext('Element types')}</th>
                <th>${gettext('Document structure')}</th>
                <th>${gettext('Delete')}</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="from-container">
                    ${headingTemplate({})}
                    ${contributorsTemplate({})}
                    ${richtextTemplate({})}
                    ${tagsTemplate({})}
                    ${tableTemplate({})}
                </td>
                <td class="to-column">
                    <div class="doc-part fixed" data-type="initial">${gettext('Title')}</div>
                    <div class="doc-part fixed" data-type="initial">${gettext('Subtitle')}</div>
                    <div class="to-container">${templateEditorValueTemplate({value})}</div>
                </td>
                <td class="trash">
                </td>
            </tr>
        </tbody>
    </table>`
