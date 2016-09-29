export class DocxExporterXml {
    constructor(exporter) {
        this.exporter = exporter
        this.docs = {}
    }

    // Open file at filePath from zip file and parse it as XML.
    fromZip(filePath, defaultContents) {
        let that = this
        if (this.docs[filePath]) {
            // file has been loaded already.
            return window.Promise.resolve(true)
        } else if (this.exporter.zip.files[filePath]) {
            return this.exporter.zip.file(filePath).async('string').then(
                function(string) {
                    const parser = new window.DOMParser()
                    that.docs[filePath] = parser.parseFromString(string, "text/xml")
                }
            )
        } else if (defaultContents) {
            return window.Promise.resolve(defaultContents).then(
                function(string) {
                    const parser = new window.DOMParser()
                    that.docs[filePath] = parser.parseFromString(string, "text/xml")
                }
            )
        } else {
            // File couldn't be found and there was no default value.
            return window.Promise.resolve(false)
        }

    }

    // Put all currently open XML files into zip.
    allToZip() {
        for (let fileName in this.docs) {
            this.toZip(fileName)
        }
    }

    // Put the xml identified by filePath into zip.
    toZip(filePath) {
        const serializer = new window.XMLSerializer()
        const string = serializer.serializeToString(this.docs[filePath])
        this.exporter.zip.file(filePath, string)
    }


}
