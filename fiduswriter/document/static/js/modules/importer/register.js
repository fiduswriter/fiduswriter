import {
    ImporterRegistry,
    registerImporter
} from "@fiduswriter/document/importer/registry"

export {ImporterRegistry, registerImporter}

export const importerRegistry = new ImporterRegistry()

import {DocxImporter} from "./docx"
import {OdtImporter} from "./odt"
import {PandocImporter} from "./pandoc"

importerRegistry.register([["Pandoc JSON", ["json"]]], PandocImporter)

importerRegistry.register([["ODT", ["odt"]]], OdtImporter)

importerRegistry.register([["DOCX", ["docx"]]], DocxImporter)
