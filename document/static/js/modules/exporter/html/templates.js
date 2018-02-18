import {escapeText} from "../../common"

/** A template for HTML export of a document. */
export let htmlExportTemplate = ({title, styleSheets, part, contents, settings}) =>
`<!DOCTYPE html>
<html>
    <head>
        <title>${escapeText(title)}</title>
${
    styleSheets.map(
        sheet => `\t\t<link rel="stylesheet" type="text/css" href="${sheet.filename}" />\n`
    )
}
    </head>
    <body>
${
    part && part.length ? `\t\t<h1 class="part">${escapeText(part)}</h1>\n` : ''
}
        ${contents}
    </body>
</html>`
