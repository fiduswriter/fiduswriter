import {ImportNative} from "../native"
import {PandocConvert} from "./convert"

export class ImportPandocFile {
    constructor(file, user, path = "", importId) {
        this.file = file
        this.user = user
        this.path = path
        this.importId = importId

        this.ok = false
        this.statusText = ""
        this.doc = null
        this.docInfo = null
    }
    init() {
        const reader = new FileReader()
        return new Promise(resolve => {
            reader.onload = () => {
                let pandocJson, convertedDoc
                try {
                    pandocJson = JSON.parse(reader.result)
                } catch (error) {
                    this.statusText = error.message
                    return resolve(this)
                }

                const converter = new PandocConvert(pandocJson, this.importId)

                try {
                    convertedDoc = converter.init()
                } catch (error) {
                    this.statusText = error.message
                    return resolve(this)
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
                    {}, // No images for now
                    [], // No other files
                    this.user,
                    null,
                    this.path + title
                )
                return nativeImporter.init().then(({doc, docInfo}) => {
                    this.ok = true
                    this.doc = doc
                    this.docInfo = docInfo
                    this.statusText = `${doc.title} ${gettext("successfully imported.")}`
                    return resolve(this)
                })
            }
            reader.readAsText(this.file)
        })
    }
}
