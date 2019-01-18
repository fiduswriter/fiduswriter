import {getMissingDocumentListData} from "../tools"
import {importFidusTemplate} from "./templates"
import {SaveCopy, ExportFidusFile} from "../../exporter/native"
import {EpubExporter} from "../../exporter/epub"
import {HTMLExporter} from "../../exporter/html"
import {LatexExporter} from "../../exporter/latex"
import {DocxExporter} from "../../exporter/docx"
import {OdtExporter} from "../../exporter/odt"
import {ImportFidusFile} from "../../importer/file"
import {DocumentRevisionsDialog} from "../revisions"
import {activateWait, deactivateWait, addAlert, postJson, Dialog} from "../../common"

export class DocumentOverviewActions {
    constructor (documentOverview) {
        documentOverview.mod.actions = this
        this.documentOverview = documentOverview
    }

    deleteDocument(id) {
        let doc = this.documentOverview.documentList.find(doc => doc.id === id)
        if (!doc) {
            return
        }
        postJson(
            '/document/delete/',
            {id}
        ).then(
            ({json}) => {
                if (json.done) {
                    addAlert('success', gettext(`${gettext('Document has been deleted')}: '${doc.title}'`))
                    this.documentOverview.removeTableRows([id])
                    this.documentOverview.documentList = this.documentOverview.documentList.filter(doc => doc.id !== id)
                } else {
                    addAlert('error', gettext(`${gettext('Could not delete document')}: '${doc.title}'`))
                }
            }
        )
    }

    deleteDocumentDialog(ids) {

        let confirmDeletionDialog = new Dialog({
            title: gettext('Confirm deletion'),
            body: `<p>
                ${gettext('Delete the document(s)?')}
                </p>`,
            id: 'confirmdeletion',
            icon: 'exclamation-triangle',
            buttons: [
                {
                    text: gettext('Delete'),
                    classes: "fw-dark",
                    height: 180,
                    click: () => {
                        for (let i = 0; i < ids.length; i++) {
                            this.deleteDocument(ids[i])
                        }
                        confirmDeletionDialog.close()
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
        let buttons = [
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
                        true,
                        this.documentOverview.teamMembers
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
                            this.documentOverview.addDocToTable(doc)
                            importDialog.close()
                        }
                    )

                }
            },
            {
                type: 'cancel'
            }
        ]
        let importDialog = new Dialog({
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
        getMissingDocumentListData(ids, this.documentOverview.documentList).then(
            () => {
                ids.forEach(id => {
                    let doc = this.documentOverview.documentList.find(entry => entry.id === id)
                    let copier = new SaveCopy(
                        doc,
                        {db:doc.bibliography},
                        {db:doc.images},
                        this.documentOverview.user
                    )

                    copier.init().then(
                        ({doc}) => {
                            this.documentOverview.documentList.push(doc)
                            this.documentOverview.addDocToTable(doc)
                        }
                    )
                })
            }
        )
    }

    downloadNativeFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList
        ).then(
            () => ids.forEach(id => {
                let doc = this.documentOverview.documentList.find(entry => entry.id===id)
                new ExportFidusFile(
                    doc,
                    {db:doc.bibliography},
                    {db:doc.images}
                )
            })
        )
    }

    downloadHtmlFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList
        ).then(
            () => ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(entry => entry.id===id)
                const exporter = new HTMLExporter(
                    doc,
                    {db:doc.bibliography},
                    {db:doc.images},
                    this.documentOverview.citationStyles,
                    this.documentOverview.citationLocales,
                    this.documentOverview.documentStyles,
                    this.documentOverview.staticUrl
                )
                exporter.init()
            })
        )
    }

    downloadTemplateExportFiles(ids, templateUrl, templateType) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList
        ).then(
            () => {
                ids.forEach(id => {
                    const doc = this.documentOverview.documentList.find(entry => entry.id===id)
                    if (templateType==='docx') {
                        const exporter = new DocxExporter(
                            doc,
                            templateUrl,
                            {db:doc.bibliography},
                            {db:doc.images},
                            this.documentOverview.citationStyles,
                            this.documentOverview.citationLocales,
                            this.documentOverview.staticUrl
                        )
                        exporter.init()
                    } else {
                        const exporter = new OdtExporter(
                            doc,
                            templateUrl,
                            {db:doc.bibliography},
                            {db:doc.images},
                            this.documentOverview.citationStyles,
                            this.documentOverview.citationLocales
                        )
                        exporter.init()
                    }
                })
            }
        )
    }

    downloadLatexFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList
        ).then(
            () =>
                ids.forEach(id => {
                    const doc = this.documentOverview.documentList.find(entry => entry.id===id)
                    const exporter = new LatexExporter(
                        doc,
                        {db:doc.bibliography},
                        {db:doc.images}
                    )
                    exporter.init()
                })
        )
    }

    downloadEpubFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList
        ).then(
            () =>
                ids.forEach(id => {
                    const doc = this.documentOverview.documentList.find(entry => entry.id===id)
                    const exporter = new EpubExporter(
                        doc,
                        {db:doc.bibliography},
                        {db:doc.images},
                        this.documentOverview.citationStyles,
                        this.documentOverview.citationLocales,
                        this.documentOverview.staticUrl
                    )
                    exporter.init()
                })
        )
    }

    revisionsDialog(documentId) {
        let revDialog = new DocumentRevisionsDialog(
            documentId,
            this.documentOverview.documentList,
            this.documentOverview.user
        )
        revDialog.init().then(
          actionObject => {
            switch(actionObject.action) {
                case 'added-document':
                    this.documentOverview.documentList.push(actionObject.doc)
                    this.documentOverview.addDocToTable(actionObject.doc)
                    break
                case 'deleted-revision':
                    actionObject.doc.revisions = actionObject.doc.revisions.filter(rev => rev.pk !== actionObject.id)
                    this.documentOverview.removeTableRows([actionObject.doc.id])
                    this.documentOverview.addDocToTable(actionObject.doc)
                    break
            }
        })
    }
}
