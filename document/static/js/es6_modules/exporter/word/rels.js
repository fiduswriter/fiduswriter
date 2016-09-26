// manages the .rels files. Need to initialize one for each of document.xml and footnotes.xml

export class WordExporterRels {
    constructor(exporter, docName) {
        this.exporter = exporter
        this.docName = docName
        this.xml = false
        this.maxRelId = 0
        this.filePath = `word/_rels/${this.docName}.xml.rels`
    }

    init() {
        let that = this
        return this.exporter.xml.fromZip(this.filePath).then(function(){
            that.xml = that.exporter.xml.docs[that.filePath]
            that.findMaxRelId()
        })
    }

    // Go through a rels xml file and file all the listed relations
    findMaxRelId() {
        let rels = [].slice.call(this.xml.querySelectorAll('Relationship')),
        that = this

        rels.forEach(function(rel){
            let id = parseInt(rel.getAttribute("Id").replace(/\D/g,''))
            if (id > that.maxRelId) {
                that.maxRelId = id
            }
        })
    }

    // Add a relationship for a link
    addLinkRel(link) {
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${link}" TargetMode="External"/>`
        rels.insertAdjacentHTML('beforeend', string)
        this.maxRelId = rId
        return rId
    }

    // add a relationship for an image
    addImageRel(imgFileName) {
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFileName}"/>`
        rels.insertAdjacentHTML('beforeend', string)
        this.maxRelId = rId
        return rId
    }


}
