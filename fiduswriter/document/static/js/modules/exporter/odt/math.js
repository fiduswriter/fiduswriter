export class OdtExporterMath {
    constructor(exporter) {
        this.exporter = exporter
        this.objectCounter = 1
        this.manifestXml = false
        this.domParser = new DOMParser()
    }

    init() {
        return this.exporter.xml.getXml("META-INF/manifest.xml").then(
            manifestXml => {
                this.manifestXml = manifestXml
                this.checkObjectCounter()
                return Promise.resolve()
            }
        ).then(
            () => import("mathlive")
        ).then(
            MathLive => this.mathLive = MathLive
        )
    }

    checkObjectCounter() {
        const manifestEl = this.manifestXml.querySelector('manifest')
        const fileEntries = manifestEl.querySelectorAll('file-entry')

        fileEntries.forEach(
            fileEntry => {
                const fullPath = fileEntry.getAttribute('manifest:full-path')
                const dir = fullPath.split('/')[0]
                const dirParts = dir.split(' ')
                if (dirParts.length === 2 && dirParts[0] === 'Object') {
                    const objectNumber =  parseInt(dirParts[1])
                    if (objectNumber >= this.objectCounter) {
                        this.objectCounter = objectNumber + 1
                    }
                }
            }
        )
    }

    latexToMathML(latex) {
        return this.mathLive.convertLatexToMathMl(latex)
            .replace(/&InvisibleTimes;/g, '&#8290;')
            .replace(/&ApplyFunction;/g, '&#x2061;')
            .replace(/&PlusMinus;/g, '&#177;')
            .replace(/&times;/g, '&#215;')
            .replace(/&x2061;/g, '&#x2061;') // Bug in mathlive 0.59. Has been fixed since.
    }

    addMath(latex) {
        const objectNumber = this.objectCounter++
        this.exporter.xml.addExtraFile(
            `Object ${objectNumber}/content.xml`,
            `<math xmlns="http://www.w3.org/1998/Math/MathML">${
                this.latexToMathML(latex)
            }</math>`
        )
        const manifestEl = this.manifestXml.querySelector('manifest')
        const stringOne = `<manifest:file-entry manifest:full-path="Object ${objectNumber}/content.xml" manifest:media-type="text/xml"/>`
        manifestEl.insertAdjacentHTML('beforeEnd', stringOne)
        const stringTwo = `<manifest:file-entry manifest:full-path="Object ${objectNumber}/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.formula"/>`
        manifestEl.insertAdjacentHTML('beforeEnd', stringTwo)
        return objectNumber
    }

}
