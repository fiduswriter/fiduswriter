import {getMissingDocumentListData} from "../tools"
import {importFidusTemplate} from "./templates"
import {SaveCopy, ExportFidusFile} from "../../exporter/native"
import {ImportFidusFile} from "../../importer/file"
import {DocumentRevisionsDialog} from "../revisions"
import {activateWait, deactivateWait, addAlert, postJson, Dialog, escapeText, longFilePath} from "../../common"

export class DocumentOverviewActions {
    constructor(documentOverview) {
        documentOverview.mod.actions = this
        this.documentOverview = documentOverview
    }

    deleteDocument(id) {
        const doc = this.documentOverview.documentList.find(doc => doc.id === id)
        if (!doc) {
            return Promise.resolve()
        }
        return postJson(
            '/api/document/delete/',
            {id}
        ).then(
            ({json}) => {
                if (json.done) {
                    addAlert('success', `${gettext('Document has been deleted')}: '${longFilePath(doc.title, doc.path)}'`)
                    this.documentOverview.documentList = this.documentOverview.documentList.filter(doc => doc.id !== id)
                    this.documentOverview.initTable()
                } else {
                    addAlert('error', `${gettext('Could not delete document')}: '${longFilePath(doc.title, doc.path)}'`)
                }
            }
        )
    }

    deleteDocumentDialog(ids) {
        const docPaths = ids.map(id => {
            const doc = this.documentOverview.documentList.find(doc => doc.id === id)
            return escapeText(longFilePath(doc.title, doc.path))
        })
        const confirmDeletionDialog = new Dialog({
            title: gettext('Confirm deletion'),
            body: `<p>
                ${  ids.length > 1 ?
        gettext('Do you really want to delete the following documents?') :
        gettext('Do you really want to delete the following document?')
}
                </p>
                <p>
                ${docPaths.join('<br>')}
                </p>`,
            id: 'confirmdeletion',
            icon: 'exclamation-triangle',
            buttons: [
                {
                    text: gettext('Delete'),
                    classes: "fw-dark",
                    height: Math.min(50 + 15 * ids.length, 500),
                    click: () => {
                        Promise.all(ids.map(id => this.deleteDocument(id))).then(
                            () => {
                                confirmDeletionDialog.close()
                                this.documentOverview.initTable()
                            }
                        )

                    }
                },
                {
                    type: 'cancel'
                }
            ]
        })

        confirmDeletionDialog.open()
    }

    importFidus() {
        const buttons = [
            {
                text: gettext('Import'),
                classes: "fw-dark",
                click: () => {
                    let fidusFile = document.getElementById('fidus-uploader').files
                    if (0 === fidusFile.length) {
                        return false
                    }
                    fidusFile = fidusFile[0]
                    if (104857600 < fidusFile.size) {
                        //TODO: This is an arbitrary size. What should be done with huge import files?
                        return false
                    }
                    activateWait()

                    const importer = new ImportFidusFile(
                        fidusFile,
                        this.documentOverview.user,
                        this.documentOverview.path,
                        true,
                        this.documentOverview.contacts
                    )

                    importer.init().then(
                        ({ok, statusText, doc}) => {
                            deactivateWait()
                            if (ok) {
                                addAlert('info', statusText)
                            } else {
                                addAlert('error', statusText)
                                return
                            }
                            this.documentOverview.documentList.push(doc)
                            this.documentOverview.initTable()
                            importDialog.close()
                        }
                    ).catch(
                        () => false
                    )

                }
            },
            {
                type: 'cancel'
            }
        ]
        const importDialog = new Dialog({
            id: 'importfidus',
            title: gettext('Import a Fidus file'),
            body: importFidusTemplate(),
            height: 100,
            buttons
        })
        importDialog.open()

        document.getElementById('fidus-uploader').addEventListener(
            'change',
            () => {
                document.getElementById('import-fidus-name').innerHTML =
                    document.getElementById('fidus-uploader').value.replace(/C:\\fakepath\\/i, '')
            }
        )

        document.getElementById('import-fidus-btn').addEventListener('click', event => {
            document.getElementById('fidus-uploader').click()
            event.preventDefault()
        })

    }

    copyFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(
            () => {
                ids.forEach(id => {
                    const doc = this.documentOverview.documentList.find(entry => entry.id === id)
                    const copier = new SaveCopy(
                        doc,
                        {db: doc.bibliography},
                        {db: doc.images},
                        this.documentOverview.user
                    )

                    copier.init().then(
                        ({doc}) => {
                            this.documentOverview.documentList.push(doc)
                            this.documentOverview.initTable()
                        }
                    ).catch(() => false)
                })
            }
        )
    }

    copyFilesAs(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(
            () => {

                const selectTemplateDialog = new Dialog({
                    title: gettext('Choose document template'),
                    body: `<p>
                        ${ids.length > 1 ? gettext('Select document template for copies') : gettext('Select document template for copy.')}
                        </p>
                        <select class="fw-button fw-large fw-light">${
    Object.entries(this.documentOverview.documentTemplates).map(
        ([importId, dt]) => `<option value="${escapeText(importId)}">${escapeText(dt.title)}</option>`
    ).join('')
}</select>`,
                    buttons: [
                        {
                            text: gettext('Copy'),
                            classes: "fw-dark",
                            click: () => {
                                ids.forEach(id => {
                                    const doc = this.documentOverview.documentList.find(entry => entry.id === id)
                                    const copier = new SaveCopy(
                                        doc,
                                        {db: doc.bibliography},
                                        {db: doc.images},
                                        this.documentOverview.user,
                                        selectTemplateDialog.dialogEl.querySelector('select').value
                                    )

                                    copier.init().then(
                                        ({doc}) => {
                                            this.documentOverview.documentList.push(doc)
                                            this.documentOverview.initTable()
                                        }
                                    ).catch(() => false)
                                })
                                selectTemplateDialog.close()
                            }
                        },
                        {
                            type: 'cancel'
                        }
                    ]
                })
                selectTemplateDialog.open()
            }
        )
    }

    downloadNativeFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(
            () => ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(entry => entry.id === id)
                new ExportFidusFile(
                    doc,
                    {db: doc.bibliography},
                    {db: doc.images}
                )
            })
        )
    }

    downloadSlimNativeFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(
            () => ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(entry => entry.id === id)
                new ExportFidusFile(
                    doc,
                    {db: doc.bibliography},
                    {db: doc.images},
                    false
                )
            })
        )
    }

    downloadHtmlFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(
            () => ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(entry => entry.id === id)
                import("../../exporter/html").then(({HTMLExporter}) => {
                    const exporter = new HTMLExporter(
                        this.documentOverview.schema,
                        this.documentOverview.app.csl,
                        this.documentOverview.documentStyles,
                        doc,
                        {db: doc.bibliography},
                        {db: doc.images},
                        new Date(doc.updated * 1000)
                    )
                    exporter.init()
                })
            })
        )
    }

    downloadTemplateExportFiles(ids, templateUrl, templateType) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(
            () => {
                ids.forEach(id => {
                    const doc = this.documentOverview.documentList.find(entry => entry.id === id)
                    if (templateType === 'docx') {
                        import("../../exporter/docx").then(({DocxExporter}) => {
                            const exporter = new DocxExporter(
                                doc,
                                templateUrl,
                                {db: doc.bibliography},
                                {db: doc.images},
                                this.documentOverview.app.csl
                            )
                            exporter.init()
                        })
                    } else {
                        import("../../exporter/odt").then(({OdtExporter}) => {
                            const exporter = new OdtExporter(
                                doc,
                                templateUrl,
                                {db: doc.bibliography},
                                {db: doc.images},
                                this.documentOverview.app.csl
                            )
                            exporter.init()
                        })
                    }
                })
            }
        )
    }

    downloadLatexFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(
            () =>
                ids.forEach(id => {
                    const doc = this.documentOverview.documentList.find(entry => entry.id === id)
                    import("../../exporter/latex").then(({LatexExporter}) => {
                        const exporter = new LatexExporter(
                            doc,
                            {db: doc.bibliography},
                            {db: doc.images},
                            new Date(doc.updated * 1000)
                        )
                        exporter.init()
                    })
                })
        )
    }

    downloadJATSFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(
            () =>
                ids.forEach(id => {
                    const doc = this.documentOverview.documentList.find(entry => entry.id === id)
                    import("../../exporter/jats").then(({JATSExporter}) => {
                        const exporter = new JATSExporter(
                            doc,
                            {db: doc.bibliography},
                            {db: doc.images},
                            this.documentOverview.app.csl,
                            new Date(doc.updated * 1000)
                        )
                        exporter.init()
                    })
                })
        )
    }

    downloadEpubFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(
            () =>
                ids.forEach(id => {
                    const doc = this.documentOverview.documentList.find(entry => entry.id === id)
                    import("../../exporter/epub").then(({EpubExporter}) => {
                        const exporter = new EpubExporter(
                            this.documentOverview.schema,
                            this.documentOverview.app.csl,
                            this.documentOverview.documentStyles,
                            doc,
                            {db: doc.bibliography},
                            {db: doc.images},
                            new Date(doc.updated * 1000)
                        )
                        exporter.init()
                    })
                })
        )
    }

    revisionsDialog(documentId) {
        const revDialog = new DocumentRevisionsDialog(
            documentId,
            this.documentOverview.documentList,
            this.documentOverview.user
        )
        revDialog.init().then(
            actionObject => {
                switch (actionObject.action) {
                case 'added-document':
                    this.documentOverview.documentList.push(actionObject.doc)
                    this.documentOverview.initTable()
                    break
                case 'deleted-revision':
                    actionObject.doc.revisions = actionObject.doc.revisions.filter(rev => rev.pk !== actionObject.id)
                    this.documentOverview.initTable()
                    break
                }
            })
    }
}
