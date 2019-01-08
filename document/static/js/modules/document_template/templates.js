import {escapeText} from "../common"
import {LANGUAGES} from "../editor/common"

const headingTemplate = ({
    id="",
    title="",
    attrs={
        elements: ["heading1", "heading2", "heading3", "heading4", "heading5", "heading6"],
        marks: ["strong", "em", "highlight", "underline", "link"]
    },
    locking="false",
    optional="false",
    language=false
}) =>
`<div class="doc-part" data-type="heading">
    <div class="title">${gettext('Heading')}</div>
    <div class="attrs">
        <div class="label">${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></div>
        <div class="label">${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></div>
        <div class="label">${gettext('Locking')}
            <select class="locking">
                <option value="false" ${locking==='false' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
            </select>
        </div>
        <div class="label">${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="shown" ${optional==='shown' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="hidden" ${optional==='hidden' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </div>
        <div class="label">
            ${gettext('Allowed elements')}
        </div>
        <label>
            <input type="checkbox" class="elements" value="heading1" ${attrs.elements.includes('heading1') ? 'checked' : ''}/>
            ${gettext('Heading 1')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading2" ${attrs.elements.includes('heading2') ? 'checked' : ''}/>
            ${gettext('Heading 2')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading3" ${attrs.elements.includes('heading3') ? 'checked' : ''}/>
            ${gettext('Heading 3')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading4" ${attrs.elements.includes('heading4') ? 'checked' : ''}/>
            ${gettext('Heading 4')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading5" ${attrs.elements.includes('heading5') ? 'checked' : ''}/>
            ${gettext('Heading 5')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading6" ${attrs.elements.includes('heading6') ? 'checked' : ''}/>
            ${gettext('Heading 6')}
        </label>
        <div class="label">
            ${gettext('Allowed marks')}
        </div>
        <label>
            <input type="checkbox" class="marks" value="strong" ${attrs.marks.includes('strong') ? 'checked' : ''}/>
            ${gettext('Strong')}
        </label>
        <label>
            <input type="checkbox" class="marks" value="em" ${attrs.marks.includes('em') ? 'checked' : ''}/>
            ${gettext('Emphasis')}
        </label>
        <label>
            <input type="checkbox" class="marks" value="mark" ${attrs.marks.includes('mark') ? 'checked' : ''}/>
            ${gettext('Mark')}
        </label>
        <label>
            <input type="checkbox" class="marks" value="link" ${attrs.marks.includes('link') ? 'checked' : ''}/>
            ${gettext('Link')}
        </label>
        <div class="label">${gettext('Language')}
            <select class="language">
                <option value="false" ${language===false ? "selected" : ""}>${gettext('Document language')}</option>
                ${
                    LANGUAGES.map(([code, name]) =>
                        `<option value="${code}" ${language===code ? "selected" : ""}>${name}</option>`
                    ).join('')
                }
            </select>
        </div>
        <div>
            <div class="label">${gettext('Initial content')}</div>
            <div class="initial"></div>
        </div>
        <div>
            <div class="label">${gettext('Instructions')}</div>
            <div class="instructions"></div>
        </div>
    </div>
</div>`

const contributorsTemplate = ({
    id="",
    title="",
    attrs={
        item_title: ""
    },
    locking="false",
    optional="false"
}) =>
`<div class="doc-part" data-type="contributors">
    <div class="title">${gettext('Namelist')}</div>
    <div class="attrs">
        <div class="label">${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></div>
        <div class="label">${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></div>
        <div class="label">${gettext('Item title')} <input type="text" class="item_title" value="${escapeText(attrs.item_title)}"></div>
        <div class="label">${gettext('Locking')}
            <select class="locking">
                <option value="false" ${locking==='false' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
            </select>
        </div>
        <div class="label">${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="shown" ${optional==='shown' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="hidden" ${optional==='hidden' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </div>
        <div>
            <div class="label">${gettext('Initial content')}</div>
            <div class="initial"></div>
        </div>
        <div>
            <div class="label">${gettext('Instructions')}</div>
            <div class="instructions"></div>
        </div>
    </div>
</div>`

const richtextTemplate = ({
    id="",
    title="",
    attrs={
        elements: ["paragraph", "heading", "figure", "ordered_list", "bullet_list", "horizontal_rule", "equation", "citation", "blockquote", "footnote"],
        marks: ["strong", "em", "highlight", "underline", "link"]
    },
    locking="false",
    optional="false",
    language=false
}) => `<div class="doc-part" data-type="richtext">
    <div class="title">${gettext('Richtext')}</div>
    <div class="attrs">
        <div class="label">${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></div>
        <div class="label">${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></div>
        <div class="label">${gettext('Locking')}
            <select class="locking">
                <option value="false" ${locking==='false' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
            </select>
        </div>
        <div class="label">${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="shown" ${optional==='shown' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="hidden" ${optional==='hidden' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </div>
        <div class="label">
            ${gettext('Allowed elements')}
        </div>
        <label>
            <input type="checkbox" class="elements" value="paragraph" ${attrs.elements.includes('paragraph') ? 'checked' : ''}/>
            ${gettext('Paragraph')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading1" ${attrs.elements.includes('heading1') ? 'checked' : ''}/>
            ${gettext('Heading 1')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading2" ${attrs.elements.includes('heading2') ? 'checked' : ''}/>
            ${gettext('Heading 2')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading3" ${attrs.elements.includes('heading3') ? 'checked' : ''}/>
            ${gettext('Heading 3')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading4" ${attrs.elements.includes('heading4') ? 'checked' : ''}/>
            ${gettext('Heading 4')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading5" ${attrs.elements.includes('heading5') ? 'checked' : ''}/>
            ${gettext('Heading 5')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading6" ${attrs.elements.includes('heading6') ? 'checked' : ''}/>
            ${gettext('Heading 6')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="figure" ${attrs.elements.includes('figure') ? 'checked' : ''}/>
            ${gettext('Figure')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="ordered_list" ${attrs.elements.includes('ordered_list') ? 'checked' : ''}/>
            ${gettext('Ordered list')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="bullet_list" ${attrs.elements.includes('bullet_list') ? 'checked' : ''}/>
            ${gettext('Bullet list')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="horizontal_rule" ${attrs.elements.includes('horizontal_rule') ? 'checked' : ''}/>
            ${gettext('Horizontal rule')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="equation" ${attrs.elements.includes('equation') ? 'checked' : ''}/>
            ${gettext('Equation')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="citation" ${attrs.elements.includes('citation') ? 'checked' : ''}/>
            ${gettext('Citation')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="blockquote" ${attrs.elements.includes('blockquote') ? 'checked' : ''}/>
            ${gettext('Blockquote')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="footnote" ${attrs.elements.includes('footnote') ? 'checked' : ''}/>
            ${gettext('Footnote')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="table" ${attrs.elements.includes('table') ? 'checked' : ''}/>
            ${gettext('Table')}
        </label>
        <div class="label">
            ${gettext('Allowed marks')}
        </div>
        <label>
            <input type="checkbox" class="marks" value="strong" ${attrs.marks.includes('strong') ? 'checked' : ''}/>
            ${gettext('Strong')}
        </label>
        <label>
            <input type="checkbox" class="marks" value="em" ${attrs.marks.includes('em') ? 'checked' : ''}/>
            ${gettext('Emphasis')}
        </label>
        <label>
            <input type="checkbox" class="marks" value="mark" ${attrs.marks.includes('mark') ? 'checked' : ''}/>
            ${gettext('Mark')}
        </label>
        <label>
            <input type="checkbox" class="marks" value="link" ${attrs.marks.includes('link') ? 'checked' : ''}/>
            ${gettext('Link')}
        </label>
        <div class="label">${gettext('Language')}
            <select class="language">
                <option value="false" ${language===false ? "selected" : ""}>${gettext('Document language')}</option>
                ${
                    LANGUAGES.map(([code, name]) =>
                        `<option value="${code}" ${language===code ? "selected" : ""}>${name}</option>`
                    ).join('')
                }
            </select>
        </div>
        <div>
            <div class="label">${gettext('Initial content')}</div>
            <div class="initial"></div>
        </div>
        <div>
            <div class="label">${gettext('Instructions')}</div>
            <div class="instructions"></div>
        </div>
    </div>
</div>`

const tagsTemplate = ({
    id="",
    title="",
    attrs={
        item_title: ""
    },
    locking="false",
    optional="false"
}) =>
`<div class="doc-part" data-type="tags">
    <div class="title">${gettext('Tags')}</div>
    <div class="attrs">
        <div class="label">${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></div>
        <div class="label">${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></div>
        <div class="label">${gettext('Item title')} <input type="text" class="item_title" value="${escapeText(attrs.item_title)}"></div>
        <div class="label">${gettext('Locking')}
            <select class="locking">
                <option value="false" ${locking==='false' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
            </select>
        </div>
        <div class="label">${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="shown" ${optional==='shown' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="hidden" ${optional==='hidden' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </div>
        <div>
            <div class="label">${gettext('Initial content')}</div>
            <div class="initial"></div>
        </div>
        <div>
            <div class="label">${gettext('Instructions')}</div>
            <div class="instructions"></div>
        </div>
    </div>
</div>`

const tableTemplate = ({
    id="",
    title="",
    attrs={
        elements: ["paragraph", "heading", "figure", "ordered_list", "bullet_list", "horizontal_rule", "equation", "citation", "blockquote", "footnote"],
        marks: ["strong", "em", "highlight", "underline", "link"]
    },
    locking="false",
    optional="false",
    language=false
}) =>
`<div class="doc-part" data-type="table">
    <div class="title">${gettext('Table')}</div>
    <div class="attrs">
        <div class="label">${gettext('ID')} <input type="text" class="id" value="${escapeText(id)}"></div>
        <div class="label">${gettext('Title')} <input type="text" class="title" value="${escapeText(title)}"></div>
        <div class="label">${gettext('Locking')}
            <select class="locking">
                <option value="false" ${locking==='false' ? "selected" : ""}>${gettext('User can change contents')}</option>
                <option value="fixed" ${locking==='fixed' ? "selected" : ""}>${gettext('User can not change contents')}</option>
                <option value="header" ${locking==='header' ? "selected" : ""}>${gettext('User can not change first row')}</option>
            </select>
        </div>
        <div class="label">${gettext('Optional')}
            <select class="optional">
                <option value="false" ${optional==='false' ? "selected" : ""}>${gettext('Obligatory field')}</option>
                <option value="shown" ${optional==='shown' ? "selected" : ""}>${gettext('Optional, shown by default')}</option>
                <option value="hidden" ${optional==='hidden' ? "selected" : ""}>${gettext('Optional, not shown by default')}</option>
            </select>
        </div>
        <div class="label">
            ${gettext('Allowed elements')}
        </div>
        <label>
            <input type="checkbox" class="elements" value="paragraph" ${attrs.elements.includes('paragraph') ? 'checked' : ''}/>
            ${gettext('Paragraph')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading1" ${attrs.elements.includes('heading1') ? 'checked' : ''}/>
            ${gettext('Heading 1')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading2" ${attrs.elements.includes('heading2') ? 'checked' : ''}/>
            ${gettext('Heading 2')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading3" ${attrs.elements.includes('heading3') ? 'checked' : ''}/>
            ${gettext('Heading 3')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading4" ${attrs.elements.includes('heading4') ? 'checked' : ''}/>
            ${gettext('Heading 4')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading5" ${attrs.elements.includes('heading5') ? 'checked' : ''}/>
            ${gettext('Heading 5')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="heading6" ${attrs.elements.includes('heading6') ? 'checked' : ''}/>
            ${gettext('Heading 6')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="figure" ${attrs.elements.includes('figure') ? 'checked' : ''}/>
            ${gettext('Figure')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="ordered_list" ${attrs.elements.includes('ordered_list') ? 'checked' : ''}/>
            ${gettext('Ordered list')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="bullet_list" ${attrs.elements.includes('bullet_list') ? 'checked' : ''}/>
            ${gettext('Bullet list')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="horizontal_rule" ${attrs.elements.includes('horizontal_rule') ? 'checked' : ''}/>
            ${gettext('Horizontal rule')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="equation" ${attrs.elements.includes('equation') ? 'checked' : ''}/>
            ${gettext('Equation')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="citation" ${attrs.elements.includes('citation') ? 'checked' : ''}/>
            ${gettext('Citation')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="blockquote" ${attrs.elements.includes('blockquote') ? 'checked' : ''}/>
            ${gettext('Blockquote')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="footnote" ${attrs.elements.includes('footnote') ? 'checked' : ''}/>
            ${gettext('Footnote')}
        </label>
        <label>
            <input type="checkbox" class="elements" value="table" ${attrs.elements.includes('table') ? 'checked' : ''}/>
            ${gettext('Table')}
        </label>
        <div class="label">
            ${gettext('Allowed marks')}
        </div>
        <label>
            <input type="checkbox" class="marks" value="strong" ${attrs.marks.includes('strong') ? 'checked' : ''}/>
            ${gettext('Strong')}
        </label>
        <label>
            <input type="checkbox" class="marks" value="em" ${attrs.marks.includes('em') ? 'checked' : ''}/>
            ${gettext('Emphasis')}
        </label>
        <label>
            <input type="checkbox" class="marks" value="mark" ${attrs.marks.includes('mark') ? 'checked' : ''}/>
            ${gettext('Mark')}
        </label>
        <label>
            <input type="checkbox" class="marks" value="link" ${attrs.marks.includes('link') ? 'checked' : ''}/>
            ${gettext('Link')}
        </label>
        <div class="label">${gettext('Language')}
            <select class="language">
                <option value="false" ${language===false ? "selected" : ""}>${gettext('Document language')}</option>
                ${
                    LANGUAGES.map(([code, name]) =>
                        `<option value="${code}" ${language===code ? "selected" : ""}>${name}</option>`
                    ).join('')
                }
            </select>
        </div>
        <div>
            <div class="label">${gettext('Initial content')}</div>
            <div class="initial"></div>
        </div>
        <div>
            <div class="label">${gettext('Instructions')}</div>
            <div class="instructions"></div>
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
                    <div class="to-container">${templateEditorValueTemplate({value})}</div>
                </td>
                <td class="trash">
                </td>
            </tr>
        </tbody>
    </table>`
