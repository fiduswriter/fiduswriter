import download from "downloadjs"

import {postJson} from "../common"
import {createSlug} from "../exporter/tools/file"
import {ZipFileCreator} from "../exporter/tools/zip"


export class DocumentTemplateDownloader {
    constructor(id, getUrl = '/api/document/admin/get_template/') {
        this.id = id
        this.getUrl = getUrl

        this.zipFileName = false
        this.textFiles = []
        this.httpFiles = []
    }

    init() {
        return postJson(
            this.getUrl,
            {id: this.id}
        ).then(({json}) => {
            this.zipFileName = `${createSlug(json.title)}.fidustemplate`
            this.textFiles.push({filename: 'template.json', contents: JSON.stringify(json.content)})
            this.textFiles.push({filename: 'filetype-version', contents: json.doc_version})
            const exportTemplates = []
            json.export_templates.forEach(template => {
                const filename = template.fields.template_file.split('/').slice(-1)[0]
                this.httpFiles.push({
                    filename,
                    url: template.fields.template_file
                })
                exportTemplates.push({
                    file: filename,
                    file_type: template.fields.file_type,
                    title: template.fields.title
                })
            })
            this.textFiles.push({filename: 'exporttemplates.json', contents: JSON.stringify(exportTemplates)})
            const documentStyles = []
            json.document_styles.forEach(docStyle => {
                const style = {
                    contents: docStyle.fields.contents,
                    slug: docStyle.fields.slug,
                    title: docStyle.fields.title,
                    files: []
                }
                docStyle.fields.documentstylefile_set.forEach(docstyleFile => {
                    this.httpFiles.push({
                        filename: docstyleFile[1],
                        url: docstyleFile[0]
                    })
                    style.files.push(docstyleFile[1])
                })
                documentStyles.push(style)
            })
            this.textFiles.push({filename: 'documentstyles.json', contents: JSON.stringify(documentStyles)})
            return this.createZip()
        })
    }

    createZip() {
        const zipper = new ZipFileCreator(
            this.textFiles,
            this.httpFiles,
            undefined,
            'application/fidustemplate+zip'
        )
        return zipper.init().then(
            blob => this.download(blob)
        )
    }

    download(blob) {
        return download(blob, this.zipFileName, 'application/zip')
    }

}
