export class WordExporterXml {
    constructor(exporter) {
        this.exporter = exporter
        this.docs = {}
    }

    // Open file at filePath from zip file and parse it as XML.
    fromZip(filePath) {
        const parser = new window.DOMParser(), that = this
        return this.exporter.zip.file(filePath).async('string').then(
            function(string) {
                that.docs[filePath] = parser.parseFromString(string, "text/xml")
            }
        )
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
