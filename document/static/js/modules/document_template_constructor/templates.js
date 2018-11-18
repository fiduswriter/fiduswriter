import {escapeText} from "../common"

const headingTemplate = ({id = "", title="", initial="", help=""}) =>
`<div class="doc-part" data-type="heading">
    <div class="title">${gettext('Heading')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Locked?')} <input type="checkbox" class="locked"></label>
        <label>${gettext('Prefilled content')} <input type="text" class="initial" value="${escapeText(initial)}"></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
    </div>
</div>`

const contributorsTemplate = ({id = "", title="", initial="", help=""}) =>
`<div class="doc-part" data-type="contributors">
    <div class="title">${gettext('Namelist')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}" value="${escapeText(initial)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Locked?')} <input type="checkbox" class="locked"></label>
        <label>${gettext('Prefilled content')} <input type="text" class="initial"></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
    </div>
</div>`

const richtextTemplate = ({
    id="",
    title="",
    elements="heading paragraph figure table",
    marks="strong emph highlight underline",
    initial="",
    help=""
}) =>
`<div class="doc-part" data-type="richtext">
    <div class="title">${gettext('Richtext')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Locked?')} <input type="checkbox" class="locked"></label>
        <label>${gettext('Whitelist elements')} <input type="text" class="elements" value="${escapeText(elements)}"></label>
        <label>${gettext('Whitelist marks')} <input type="text" class="marks" value="${escapeText(marks)}"></label>
        <label>${gettext('Prefilled content')}<textarea class="initial">${escapeText(initial)}</textarea></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
    </div>
</div>`

const tagsTemplate = ({id = "", title="", initial="", help=""}) =>
`<div class="doc-part" data-type="tags">
    <div class="title">${gettext('Tags')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Locked?')} <input type="checkbox" class="locked"></label>
        <label>${gettext('Prefilled content')} <input type="text" class="initial" value="${escapeText(initial)}"></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
    </div>
</div>`

const tableTemplate = ({id = "", title="", initial="", help="", locking="free"}) =>
`<div class="doc-part" data-type="table">
    <div class="title">${gettext('Table')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></label>
        <label>${gettext('Type')}
            <select>
                <option value="free" ${locking==='free' ? "checked" : ""}>${gettext('Free')}</option>
                <option value="fixed" ${locking==='fixed' ? "checked" : ""}>${gettext('Fixed')}</option>
                <option value="rows" ${locking==='rows' ? "checked" : ""}>${gettext('Cann add/remove rows')}</option>
            </select>
        </label>
        <label>${gettext('Prefilled content')} <input type="text" class="initial" value="${escapeText(initial)}"></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
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
