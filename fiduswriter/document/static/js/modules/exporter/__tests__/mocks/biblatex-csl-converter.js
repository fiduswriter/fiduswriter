// Mock for BiblioJSON
export class CSLExporter {
    constructor() {
        this.items = []
    }
    addEntry(entry) {
        this.items.push(entry)
    }
    parse() {
        return {}
    }
}

export class BibLatexExporter {
    constructor() {
        this.items = []
    }
}

export default {CSLExporter, BibLatexExporter}
