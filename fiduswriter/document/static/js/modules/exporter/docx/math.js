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
        this.domParser = new DOMParser()
    }

    init() {
        return this.exporter.xml.getXml("word/fontTable.xml").then(
            fontTableXml => {
                this.fontTableXml = fontTableXml
                return this.setupXslt()
            }
        ).then(
            () => import("mathlive")
        ).then(
            MathLive => this.mathLive = MathLive
        )
    }

    setupXslt() {
        return fetch(`${settings_STATIC_URL}xsl/mml2omml.xsl?v=${transpile_VERSION}`)
            .then(response => response.text())
            .then(xmlString => {
                const parser = new window.DOMParser()
                const xsl = parser.parseFromString(xmlString, "text/xml").querySelector('stylesheet')
                this.processor.importStylesheet(xsl)
            })
    }

    latexToMathML(latex) {
        return this.mathLive.convertLatexToMathMl(latex)
            .replace(/&InvisibleTimes;/g, '&#8290;')
            .replace(/&ApplyFunction;/g, '&#x2061;')
            .replace(/&PlusMinus;/g, '&#177;')
            .replace(/&times;/g, '&#215;')
            .replace(/&x2061;/g, '&#x2061;') // Bug in mathlive 0.59. Has been fixed since.
    }


    getOmml(latex) {
        if (!this.addedCambriaMath) {
            const fontsEl = this.fontTableXml.querySelector('fonts')
            fontsEl.insertAdjacentHTML('beforeEnd', CAMBRIA_MATH_FONT_DECLARATION)
            this.addedCambriaMath = true
        }
        const mathml = this.domParser.parseFromString(
            `<math xmlns="http://www.w3.org/1998/Math/MathML"><semantics>${this.latexToMathML(latex)}</semantics></math>`,
            "application/xml"
        ).documentElement
        const omml = this.processor.transformToDocument(mathml)
        let ommlString = omml.firstChild.outerHTML
        // Firefox 73 doesn't wrap the omml properly, so we remove the transformiix:result and add the m:oMath
        if (ommlString.startsWith('<transformiix:result')) {
            ommlString = omml.firstChild.innerHTML
        }
        if (!ommlString.startsWith('<m:oMath')) {
            ommlString = this.domParser.parseFromString(
                `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:mml="http://www.w3.org/1998/Math/MathML">${ommlString}</m:oMath>`,
                "application/xml"
            ).documentElement.outerHTML
        }
        return ommlString

    }

}
