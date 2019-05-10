import TeXZilla from "texzilla"

import {noSpaceTmp} from "../../common"

// Not entirely sure if we need this font here. This is included whenever Word
// itself adds a formula, but our ooml doesn't refer to the font, so it may be pointless.
const CAMBRIA_MATH_FONT_DECLARATION = noSpaceTmp`
    <w:font w:name="Cambria Math">
        <w:panose1 w:val="02040503050406030204" />
        <w:charset w:val="00" />
        <w:family w:val="roman" />
        <w:pitch w:val="variable" />
        <w:sig w:usb0="E00002FF" w:usb1="420024FF" w:usb2="00000000" w:usb3="00000000" w:csb0="0000019F" w:csb1="00000000" />
    </w:font>`

export class DocxExporterMath {
    constructor(exporter) {
        this.exporter = exporter
        this.fontTableXml = false
        this.addedCambriaMath = false
        this.processor = new window.XSLTProcessor()
    }

    init() {
        return this.exporter.xml.getXml("word/fontTable.xml").then(
            fontTableXml => {
                this.fontTableXml = fontTableXml
                return this.setupXslt()
            }
        )
    }

    setupXslt() {
        return fetch(`${this.exporter.staticUrl}xsl/mml2omml.xsl?v=${process.env.TRANSPILE_VERSION}`)
            .then(response => response.text())
            .then(xmlString => {
                const parser = new window.DOMParser()
                const xsl = parser.parseFromString(xmlString, "text/xml").querySelector('stylesheet')
                this.processor.importStylesheet(xsl)
            })
    }


    getOmml(latex) {
        if (!this.addedCambriaMath) {
            const fontsEl = this.fontTableXml.querySelector('fonts')
            fontsEl.insertAdjacentHTML('beforeEnd', CAMBRIA_MATH_FONT_DECLARATION)
            this.addedCambriaMath = true
        }
        const mathml = TeXZilla.toMathML(latex)
        const omml = this.processor.transformToDocument(mathml)
        return omml.firstChild.outerHTML

    }

}
