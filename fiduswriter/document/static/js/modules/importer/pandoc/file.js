import {ImportNative} from "../native"
import {PandocConvert} from "./convert"

export class ImportPandocFile {
    constructor(file, user, path = "", importId) {
        this.file = file
        this.user = user
        this.path = path
        this.importId = importId

        this.output = {
            ok: false,
            statusText: "",
            doc: null,
            docInfo: null
        }
    }

    init() {
        if (this.file.type === "application/json") {
            return this.importJSON()
        } else if (this.file.type === "application/zip") {
            return this.importZip()
        } else {
            this.output.statusText = gettext("Unknown file type")
            return Promise.resolve(this.output)
        }
    }

    importJSON() {
        const reader = new FileReader()
        return new Promise(resolve => {
            reader.onload = () =>
                resolve(this.handlePandocJson(reader.result, {}))
            reader.readAsText(this.file)
        })
    }

    importZip() {
        return import("jszip").then(({default: JSZip}) => {
            return JSZip.loadAsync(this.file).then(zip => {
                const imageFiles = {}
                let jsonFile = null

                // Find json and image files in zip
                zip.forEach((relativePath, zipEntry) => {
                    if (relativePath.endsWith(".json")) {
                        jsonFile = zipEntry
                    } else if (
                        relativePath.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)
                    ) {
                        imageFiles[relativePath] = zipEntry
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

                    return Promise.all(imagePromises).then(images => {
                        const imageObj = {}
                        images.forEach(({filename, blob}) => {
                            imageObj[filename] = blob
                        })
                        return this.handlePandocJson(jsonString, imageObj)
                    })
                })
            })
        })
    }

    handlePandocJson(jsonString, images) {
        let pandocJson
        try {
            pandocJson = JSON.parse(jsonString)
        } catch (error) {
            this.output.statusText = error.message
            return this.output
        }

        const converter = new PandocConvert(pandocJson, this.importId)

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
            {}, // Empty bibliography for now
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
    }
}
