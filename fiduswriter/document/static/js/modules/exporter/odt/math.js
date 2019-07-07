import TeXZilla from "texzilla"

export class OdtExporterMath {
    constructor(exporter) {
        this.exporter = exporter
        this.objectCounter = 1
        this.manifestXml = false
    }

    init() {
        return this.exporter.xml.getXml("META-INF/manifest.xml").then(
            manifestXml => {
                this.manifestXml = manifestXml
                this.checkObjectCounter()
                return Promise.resolve()
            }
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
                if (dirParts.length===2 && dirParts[0] === 'Object') {
                    const objectNumber =  parseInt(dirParts[1])
                    if (objectNumber >= this.objectCounter) {
                        this.objectCounter = objectNumber + 1
                    }
                }
            }
        )
    }

    addMath(latex) {
        const mathml = TeXZilla.toMathML(latex)
        const objectNumber = this.objectCounter++
        this.exporter.xml.addXmlFile(`Object ${objectNumber}/content.xml`, mathml)
        const manifestEl = this.manifestXml.querySelector('manifest')
        const stringOne = `<manifest:file-entry manifest:full-path="Object ${objectNumber}/content.xml" manifest:media-type="text/xml"/>`
        manifestEl.insertAdjacentHTML('beforeEnd', stringOne)
        const stringTwo = `<manifest:file-entry manifest:full-path="Object ${objectNumber}/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.formula"/>`
        manifestEl.insertAdjacentHTML('beforeEnd', stringTwo)
        return objectNumber
    }

}
