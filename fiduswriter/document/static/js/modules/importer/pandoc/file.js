import {BibLatexImporter} from "../../bibliography/import"
import {postJson} from "../../common"
import {ImportNative} from "../native"
import {PandocConvert} from "./convert"

export class ImportPandocFile {
    constructor(file, user, path, importId) {
        this.file = file
        this.user = user
        this.path = path
        this.importId = importId

        this.template = null
        this.output = {
            ok: false,
            statusText: "",
            doc: null,
            docInfo: null
        }
    }

    init() {
        return this.getTemplate().then(() => {
            if (this.file.type === "application/json") {
                return this.importJSON()
            } else if (this.file.type === "application/zip") {
                return this.importZip()
            } else {
                this.output.statusText = gettext("Unknown file type")
                return Promise.resolve(this.output)
            }
        })
    }

    getTemplate() {
        return postJson("/api/document/get_template/", {
            import_id: this.importId
        }).then(({json}) => {
            this.template = json.template
        })
    }

    importJSON() {
        const reader = new FileReader()
        return new Promise(resolve => {
            reader.onload = () =>
                resolve(this.handlePandocJson(reader.result, {}, null))
            reader.readAsText(this.file)
        })
    }

    importZip() {
        return import("jszip").then(({default: JSZip}) => {
            return JSZip.loadAsync(this.file).then(zip => {
                const imageFiles = {}
                let jsonFile = null,
                    bibFile = null

                // Find json and image files in zip
                zip.forEach((relativePath, zipEntry) => {
                    if (relativePath.endsWith(".json")) {
                        jsonFile = zipEntry
                    } else if (
                        relativePath.match(
                            /\.(avif|avifs|png|jpg|jpeg|gif|svg|webp)$/i
                        )
                    ) {
                        imageFiles[relativePath] = zipEntry
                    } else if (relativePath.endsWith(".bib")) {
                        bibFile = zipEntry
                    }
                })

                if (!jsonFile) {
                    this.output.statusText = gettext(
                        "No JSON file found in zip"
                    )
                    return Promise.resolve(this.output)
                }

                // Load JSON and images
                return jsonFile.async("text").then(jsonString => {
                    const imagePromises = Object.entries(imageFiles).map(
                        ([filename, zipEntry]) =>
                            zipEntry.async("blob").then(blob => {
                                return {
                                    filename,
                                    blob
                                }
                            })
                    )

                    let bibPromise

                    if (bibFile) {
                        bibPromise = bibFile.async("text")
                    } else {
                        bibPromise = Promise.resolve(null)
                    }
                    const imageObj = {}

                    return Promise.all(imagePromises)
                        .then(imageFiles => {
                            imageFiles.forEach(({filename, blob}) => {
                                imageObj[filename] = blob
                            })
                            return bibPromise
                        })
                        .then(bibString =>
                            this.handlePandocJson(
                                jsonString,
                                imageObj,
                                bibString
                            )
                        )
                })
            })
        })
    }

    handlePandocJson(jsonString, images, bibString) {
        let pandocJson
        try {
            pandocJson = JSON.parse(jsonString)
        } catch (error) {
            this.output.statusText = error.message
            return this.output
        }

        // Create a promise that will resolve with the bibliography entries
        const bibPromise = new Promise(resolve => {
            if (bibString) {
                // Create a temporary bibliography database
                const tempBibDB = {
                    saveBibEntries: data => {
                        // Instead of saving, just return the data
                        return Promise.resolve(
                            Object.entries(data).map((entry, index) => [
                                entry[0],
                                index + 1
                            ])
                        )
                    }
                }

                // Create a temporary callback that will resolve with the bibliography data
                const tempCallback = () => {}

                // Create a temporary addToList function
                const tempAddToList = () => {}

                // Use BibLatexImporter to parse the bibliography
                const importer = new BibLatexImporter(
                    bibString,
                    tempBibDB,
                    tempAddToList,
                    tempCallback,
                    false // Don't show alerts
                )

                // Store the original onMessage function
                const originalOnMessage = importer.onMessage

                // Override onMessage to capture the bibliography data
                importer.onMessage = function (message) {
                    if (message.type === "data") {
                        resolve(message.data)
                    }
                    originalOnMessage.call(this, message)
                }

                importer.init()
            } else {
                resolve({})
            }
        })

        return bibPromise.then(bibliography => {
            const converter = new PandocConvert(
                pandocJson,
                this.importId,
                this.template,
                bibliography
            )

            let convertedDoc
            try {
                convertedDoc = converter.init()
            } catch (error) {
                this.output.statusText = error.message
                return this.output
            }
            const title =
                convertedDoc.content.content[0].content?.[0]?.text ||
                gettext("Untitled")
            // Create a new ImportNative instance
            const nativeImporter = new ImportNative(
                {
                    content: convertedDoc.content,
                    title,
                    comments: {},
                    settings: convertedDoc.settings
                },
                bibliography,
                converter.images, // Pass converted images
                Object.entries(images).map(([filename, blob]) => ({
                    filename,
                    content: blob
                })),
                this.user,
                null,
                this.path + title
            )

            return nativeImporter
                .init()
                .then(({doc, docInfo}) => {
                    this.output.ok = true
                    this.output.doc = doc
                    this.output.docInfo = docInfo
                    this.output.statusText = `${doc.title} ${gettext("successfully imported.")}`
                    return this.output
                })
                .catch(error => {
                    this.output.statusText = error.message
                    console.error(error)
                    return this.output
                })
        })
    }
}
