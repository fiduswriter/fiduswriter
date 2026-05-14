// Mock for biblatex-csl-converter
export class CSLExporter {
    constructor() {
        this.items = []
    }
    addEntry(entry) {
        this.items.push(entry)
    }
}

export class BibLatexExporter {
    constructor() {
        this.items = []
    }
}

export default {CSLExporter, BibLatexExporter}
