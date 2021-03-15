import {escapeText} from "../../common"

/** A template for HTML export of a document. */
export const htmlExportTemplate = ({contents, settings, styleSheets, title}) =>
    `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
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
