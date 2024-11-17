export class ImporterRegistry {
    constructor() {
        this.importers = new Map()
    }

    register(fileTypes, importer, title) {
        fileTypes.forEach(type => {
            this.importers.set(type, {importer, title})
        })
    }

    getImporter(fileType) {
        return this.importers.get(fileType)
    }

    getAllFileTypes() {
        return Array.from(this.importers.keys())
    }

    getAllImporterTitles() {
        return Array.from(
            new Set(Array.from(this.importers.values()).map(({title}) => title))
        )
    }
}

export const importerRegistry = new ImporterRegistry()

import {OdtImporter} from "./odt"
// Register built-in importers
import {PandocImporter} from "./pandoc"

importerRegistry.register(
    ["json", "zip"],
    PandocImporter,
    gettext("Import Pandoc JSON/ZIP file")
)

importerRegistry.register(["odt"], OdtImporter, gettext("Import ODT file"))

export function registerImporters(importers) {
    importers.forEach(({fileTypes, importer, title}) => {
        importerRegistry.register(fileTypes, importer, title)
    })
}
