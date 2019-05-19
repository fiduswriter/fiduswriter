/** Creates a zip file.
 * @function zipFileCreator
 * @param {list} textFiles A list of files in plain text format.
 * @param {list} binaryFiles A list fo files that have to be downloaded from the internet before being included.
 * @param {list} includeZips A list of zip files to be merged into the output zip file.
 * @param {string} [mimeType=application/zip] The mimetype of the file that is to be created.
 */

export class ZipFileCreator {
    constructor(textFiles = [], binaryFiles = [], zipFiles = [], mimeType = 'application/zip') {
        this.textFiles = textFiles
        this.binaryFiles = binaryFiles
        this.zipFiles = zipFiles
        this.mimeType = mimeType
    }

    init() {
        return import("jszip").then(({default: JSZip}) => {
            this.zipFs = new JSZip()
            if (this.mimeType !== 'application/zip') {
                this.zipFs.file('mimetype', this.mimeType, {compression: 'STORE'})
            }

            return this.includeZips()
        })
    }

    includeZips() {
        const includePromises = this.zipFiles.map(zipFile => {
            let zipDir
            if (zipFile.directory === '') {
                zipDir = this.zipFs
            } else {
                zipDir = this.zipFs.folder(zipFile.directory)
            }
            return new Promise(
                resolve => import("jszip-utils").then(
                    ({default: JSZipUtils}) => JSZipUtils.getBinaryContent(zipFile.url, (err, contents) => {
                        zipDir.loadAsync(contents).then(_importedZip => {
                            resolve()
                        })
                    })
                )
            )
        })
        return Promise.all(includePromises).then(
            () => this.createZip()
        )

    }

    createZip() {
        this.textFiles.forEach(textFile => {
            this.zipFs.file(textFile.filename, textFile.contents, {compression: 'DEFLATE'})
        })
        const httpPromises = this.binaryFiles.map(binaryFile =>
            new Promise(
                resolve => import("jszip-utils").then(({default: JSZipUtils}) => {
                    JSZipUtils.getBinaryContent(binaryFile.url, (err, contents) => {
                        this.zipFs.file(binaryFile.filename, contents, {binary: true, compression: 'DEFLATE'})
                        resolve()
                    })
                })
            )
        )
        return Promise.all(httpPromises).then(
            () => this.zipFs.generateAsync({type:"blob", mimeType: this.mimeType})
        )
    }

}
