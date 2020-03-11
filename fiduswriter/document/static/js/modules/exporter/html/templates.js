import {escapeText} from "../../common"

/** A template for HTML export of a document. */
export const htmlExportTemplate = ({contents, part, settings, styleSheets, title}) =>
`<!DOCTYPE html>
<html>
    <head>
        ${settings.copyright && settings.copyright.holder ? `<meta name="copyright" content="© ${settings.copyright.year ? settings.copyright.year : new Date().getFullYear()} ${escapeText(settings.copyright.holder)}" />` : ''}
        <title>${escapeText(title)}</title>
${
    styleSheets.map(
        sheet => sheet.filename ?
            `<link rel="stylesheet" type="text/css" href="${sheet.filename}" />` :
            `<style>${sheet.contents}</style>`
    ).join('')
}
    </head>
    <body class="article">
${
    part && part.length ? `<h1 class="part">${escapeText(part)}</h1>` : ''
}
        ${contents.innerHTML}
        ${
            settings.copyright && settings.copyright.holder ?
                `<div>© ${settings.copyright.year ? settings.copyright.year : new Date().getFullYear()} ${settings.copyright.holder}</div>` :
                ''
        }
        ${
            settings.copyright && settings.copyright.licenses.length ?
                `<div>${settings.copyright.licenses.map(license => `<a rel="license" href="${escapeText(license.url)}">${escapeText(license.title)}${license.start ? ` (${license.start})` : ''}</a>`).join('</div><div>')}</div>` :
                ''
        }
    </body>
</html>`
