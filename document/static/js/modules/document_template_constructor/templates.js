import {escapeText} from "../common"

const headingTemplate = ({id = "", initial="", help=""}) =>
`<div class="doc-part" data-type="heading">
    <div class="title">${gettext('Heading')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Locked?')} <input type="checkbox" class="locked"></label>
        <label>${gettext('Prefilled content')} <input type="text" class="initial" value="${escapeText(initial)}"></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
    </div>
</div>`

const contributorsTemplate = ({id = "", initial="", help=""}) =>
`<div class="doc-part" data-type="contributors">
    <div class="title">${gettext('Namelist')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}" value="${escapeText(initial)}"></label>
        <label>${gettext('Locked?')} <input type="checkbox" class="locked"></label>
        <label>${gettext('Prefilled content')} <input type="text" class="initial"></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
    </div>
</div>`

const richtextTemplate = ({
    id="",
    elements="h1 h2 h3 h4 h5 h6 p code citation equation",
    marks="strong emph highlight underline",
    initial="",
    help=""
}) =>
`<div class="doc-part" data-type="richtext">
    <div class="title">${gettext('Richtext')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Locked?')} <input type="checkbox" class="locked"></label>
        <label>${gettext('Whitelist elements')} <input type="text" class="elements" value="${escapeText(elements)}"></label>
        <label>${gettext('Whitelist marks')} <input type="text" class="marks" value="${escapeText(marks)}"></label>
        <label>${gettext('Prefilled content')}<textarea class="initial">${escapeText(initial)}</textarea></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
    </div>
</div>`

const tagsTemplate = ({id = "", initial="", help=""}) =>
`<div class="doc-part" data-type="tags">
    <div class="title">${gettext('Tags')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Locked?')} <input type="checkbox" class="locked"></label>
        <label>${gettext('Prefilled content')} <input type="text" class="initial" value="${escapeText(initial)}"></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
    </div>
</div>`

const tableTemplate = ({id = "", initial="", help="", locking="free"}) =>
`<div class="doc-part" data-type="table">
    <div class="title">${gettext('Table')}</div>
    <div class="attrs">
        <label>${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></label>
        <label>${gettext('Type')}<br>
            <form action="">
                <input type="radio" name="table" value="free" ${locking==='free' ? "checked" : ""}> ${gettext('Free')}<br>
                <input type="radio" name="table" value="fixed" ${locking==='fixed' ? "checked" : ""}> ${gettext('Fixed')}<br>
                <input type="radio" name="table" value="add_rows" ${locking==='add_rows' ? "checked" : ""}> ${gettext('Can add/remove rows')}
            </form>
        </label>
        <label>${gettext('Prefilled content')} <input type="text" class="initial" value="${escapeText(initial)}"></label>
        <label>${gettext('Instructions')}<textarea class="help">${escapeText(help)}</textarea></label>
    </div>
</div>`

export const templateEditorValueTemplate = ({value}) =>
    value.map(docPart => {
        let template
        switch(docPart.type) {
            case 'heading':
                template = headingTemplate
                break
            case 'contributors':
                template = contributorsTemplate
                break
            case 'richtext':
                template = richtextTemplate
                break
            case 'tags':
                template = tagsTemplate
                break
            case 'table':
                template = tableTemplate
                break
        }
        return template ? template(docPart) : ''
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
