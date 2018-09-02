import {escapeText} from "../../common"

/** A template for HTML export of a document. */
export let htmlExportTemplate = ({title, styleSheets, part, contents, settings}) =>
`<!DOCTYPE html>
<html>
    <head>
        <title>${escapeText(title)}</title>
${
    styleSheets.map(
        sheet => sheet.filename ? `<link rel="stylesheet" type="text/css" href="${sheet.filename}" />` : `<style>${sheet.contents}</style>`
    )
}
    </head>
    <body>
${
    part && part.length ? `<h1 class="part">${escapeText(part)}</h1>` : ''
}
        ${contents.innerHTML}
    </body>
</html>`
