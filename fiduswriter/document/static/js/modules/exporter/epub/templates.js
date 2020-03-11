import {mathliveOpfIncludes} from "../../mathlive/opf_includes"
import {escapeText} from "../../common"

/** A template for the OPF file of an epub. */
export const opfTemplate = ({id, idType, title, language, authors, keywords, date, modified, images, fontFiles, styleSheets, math, copyright}) =>
`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="${idType}" xml:lang="${language}" prefix="cc: http://creativecommons.org/ns#">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="${idType}">${id}</dc:identifier>
            <dc:title>${escapeText(title)}</dc:title>
${
    authors.map(author => `\t\t<dc:creator>${escapeText(author)}</dc:creator>\n`).join('')
}${
    keywords.map(keyword => `\t\t<dc:subject>${escapeText(keyword)}</dc:subject>\n`).join('')
}
        <dc:language>${language}</dc:language>
        <dc:date>${date}</dc:date>
        ${ copyright && copyright.holder ? `<dc:rights>© ${ copyright.year ? copyright.year : new Date().getFullYear()} ${escapeText(copyright.holder)}</dc:rights>` : ''}
        <meta property="dcterms:modified">${modified}</meta>
    </metadata>
    <manifest>
        <item id="t1" href="document.xhtml" media-type="application/xhtml+xml" />
        <item id="nav" href="document-nav.xhtml" properties="nav" media-type="application/xhtml+xml" />
${
    images.map((image, index) =>
        `\t\t\t<item ${
            image.coverImage ?
            'id="cover-image" properties="cover-image"' :
            `id="img${index}"`
        } href="${
            image.filename
        }" media-type="image/${
            image.filename.split(".")[1]==="png" ?
            'png' :
            image.filename.split(".")[1]==="svg" ?
            'svg+xml' :
            'jpeg'
        }" />\n`
    ).join('')
}${
    fontFiles.map((fontFile, index) =>
        `\t\t\t<item ${
            `id="font${index}"`
        } href="${
            fontFile.filename
        }" media-type="application/${
            fontFile.filename.split(".")[1]==="woff" ?
            'font-woff' :
            'font-sfnt'
        }" />\n`
    ).join('')
}${
    styleSheets.map((sheet, index) =>
        `\t\t\t<item id="css${index}" href="${sheet.filename}" media-type="text/css" />\n`
    ).join('')
}${
    math ?
    mathliveOpfIncludes :
    ''
}
        <!-- ncx included for 2.0 reading system compatibility: -->
        <item id="ncx" href="document.ncx" media-type="application/x-dtbncx+xml" />
    </manifest>
    <spine toc="ncx">
        <itemref idref="t1" />
    </spine>
</package>`


/** A template for the contianer XML of an epub file. */
export const containerTemplate = () =>
`<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
    <rootfiles>
        <rootfile full-path="EPUB/document.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`

/** A template of the NCX file of an epub. */
export const ncxTemplate = ({shortLang, idType, id, title, contentItems}) =>
`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns:ncx="http://www.daisy.org/z3986/2005/ncx/" xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${shortLang}">
    <head>
        <meta name="dtb:${idType}" content="${id}"/>
    </head>
    <docTitle>
        <text>${escapeText(title)}</text>
    </docTitle>
    <navMap>
        <!-- 2.01 NCX: playOrder is optional -->
${
    contentItems.map(item =>
        ncxItemTemplate({item})
    ).join('')
}
    </navMap>
</ncx>`

/** A template for each list item in the navMap of an epub's NCX file. */
export const ncxItemTemplate = ({item}) =>
`        <navPoint id="t${item.docNum ? `${item.id}-${item.docNum}` : item.id}">
            <navLabel><text>${escapeText(item.title)}</text></navLabel>
            <content src="${item.link ? item.link : item.docNum ? `document-${item.docNum}.xhtml#${item.id}` : `document.xhtml#${item.id}` }"/>
${
    item.subItems.map(
        item => ncxItemTemplate({item})
    ).join('')
}
        </navPoint>\n`


/** A template for a document in an epub. */
export const xhtmlTemplate = ({shortLang, title, math, styleSheets, part, body, copyright}) =>
`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${shortLang}" lang="${shortLang}"
        xmlns:epub="http://www.idpf.org/2007/ops">
    <head>
        ${copyright && copyright.holder ? `<meta name="copyright" content="© ${copyright.year ? copyright.year : new Date().getFullYear()} ${escapeText(copyright.holder)}" />` : ''}
        <title>${escapeText(title)}</title>
${
    math ?
    '\t\t<link rel="stylesheet" type="text/css" href="mathlive.css" />\n' :
    ''
}
${
    styleSheets.map(sheet => `\t\t<link rel="stylesheet" type="text/css" href="${sheet.filename}" />\n`
    ).join('')
}
    </head>
    <body>${
        part && part.length ?
        `\t\t<h1 class="part">${escapeText(part)}</h1>` :
        ''
    }${
        body
    }${
        copyright && copyright.holder ?
            `<div>© ${copyright.year ? copyright.year : new Date().getFullYear()} ${copyright.holder}</div>` :
            ''
    }
    ${
        copyright && copyright.licenses.length ?
            `<div>${copyright.licenses.map(license => `<a rel="license" href="${escapeText(license.url)}">${escapeText(license.title)}${license.start ? ` (${license.start})` : ''}</a>`).join('</div><div>')}</div>` :
            ''
    }</body>
</html>`


/** A template for an epub's navigation document. */
export const navTemplate = ({shortLang, contentItems}) =>
`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${shortLang}" lang="${shortLang}" xmlns:epub="http://www.idpf.org/2007/ops">
    <head>
        <meta charset="utf-8"></meta>
    </head>
    <body>
        <nav epub:type="toc" id="toc">
            <ol>
${
    contentItems.map(item => navItemTemplate({item})).join('')
}
            </ol>
        </nav>
    </body>
</html>`

/** A template for each item in an epub's navigation document. */
export const navItemTemplate = ({item}) =>
    `\t\t\t\t<li><a href="${
        item.link ?
        item.link :
        item.docNum ?
        `document-${item.docNum}.xhtml#${item.id}` :
        `document.xhtml#${item.id}`}">${escapeText(item.title)
    }</a>
${
    item.subItems.length ?
    `<ol>
        ${
            item.subItems.map(item =>
                navItemTemplate({item})
            ).join('')
        }
    </ol>` :
    ''
}
</li>`
