import {escapeText} from "../../common"

/** A template for HTML export of a document. */
export const htmlExportTemplate = ({title, styleSheets, part, contents, removeUrlPrefix}) =>
`<!DOCTYPE html>
<html>
    <head>
        <title>${escapeText(title)}</title>
${
    styleSheets.map(
        sheet => sheet.filename ?
            `<link rel="stylesheet" type="text/css" href="${
                removeUrlPrefix ?
                sheet.filename.split('/').pop() :
                sheet.filename
            }" />` :
            `<style>${sheet.contents}</style>`
    ).join('')
}
    </head>
    <body class="article">
${
    part && part.length ? `<h1 class="part">${escapeText(part)}</h1>` : ''
}
        ${contents.innerHTML}
    </body>
</html>`
