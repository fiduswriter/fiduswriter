import {
    Dialog,
    activateWait,
    addAlert,
    deactivateWait,
    escapeText,
    longFilePath,
    postJson
} from "../../common"
import {E2EEKeyManager} from "../../editor/e2ee/key-manager"
import {
    createPasswordDialog,
    enterPasswordDialog
} from "../../editor/e2ee/password-dialog"
import {ExportFidusFile, SaveCopy} from "../../exporter/native"
import {FidusFileImporter} from "../../importer/native"
import {importerRegistry} from "../../importer/register"
import {DocumentRevisionsDialog} from "../revisions"
import {getMissingDocumentListData} from "../tools"
import {importDocumentTemplate} from "./templates"

// Returns the user-facing title for a document. For E2EE documents,
// `doc.title` holds the encrypted ciphertext; the decrypted title (if any)
// is cached in sessionStorage under `e2ee_title_<id>` by the overview after
// successful decryption. Fall back to a localized placeholder when the title
// is still encrypted.
const getDisplayTitle = doc => {
    if (doc.e2ee) {
        const cached = sessionStorage.getItem(`e2ee_title_${doc.id}`)
        if (cached !== null) {
            return cached
        }
        if (doc.title) {
            return gettext("Encrypted Document")
        }
    }
    return doc.title
}

export class DocumentOverviewActions {
    constructor(documentOverview) {
        documentOverview.mod.actions = this
        this.documentOverview = documentOverview
    }

    deleteDocument(id) {
        const doc = this.documentOverview.documentList.find(
            doc => doc.id === id
        )
        if (!doc) {
            return Promise.resolve()
        }
        const displayTitle = getDisplayTitle(doc)
        return postJson("/api/document/delete/", {id}).then(({json}) => {
            if (json.done) {
                addAlert(
                    "success",
                    `${gettext("Document has been deleted")}: '${escapeText(longFilePath(displayTitle, doc.path))}'`
                )
                this.documentOverview.documentList =
                    this.documentOverview.documentList.filter(
                        doc => doc.id !== id
                    )
                this.documentOverview.initTable()
            } else {
                addAlert(
                    "error",
                    `${gettext("Could not delete document")}: '${escapeText(longFilePath(displayTitle, doc.path))}'`
                )
            }
        })
    }

    deleteDocumentDialog(ids, app) {
        if (app.isOffline()) {
            addAlert(
                "info",
                gettext("You cannot delete a document while you are offline.")
            )
            return
        }
        const docPaths = ids.map(id => {
            const doc = this.documentOverview.documentList.find(
                doc => doc.id === id
            )
            return escapeText(longFilePath(getDisplayTitle(doc), doc.path))
        })
        const confirmDeletionDialog = new Dialog({
            title: gettext("Confirm deletion"),
            body: `<p>
                ${
                    ids.length > 1
                        ? gettext(
                              "Do you really want to delete the following documents?"
                          )
                        : gettext(
                              "Do you really want to delete the following document?"
                          )
                }
                </p>
                <p>
                ${docPaths.join("<br>")}
                </p>`,
            id: "confirmdeletion",
            icon: "exclamation-triangle",
            buttons: [
                {
                    text: gettext("Delete"),
                    classes: "fw-dark",
                    height: Math.min(50 + 15 * ids.length, 500),
                    click: () => {
                        Promise.all(
                            ids.map(id => this.deleteDocument(id))
                        ).then(() => {
                            confirmDeletionDialog.close()
                            this.documentOverview.initTable()
                        })
                    }
                },
                {
                    type: "cancel"
                }
            ]
        })

        confirmDeletionDialog.open()
    }

    importDocument() {
        const documentTemplates = this.documentOverview.documentTemplates || {}
        const importIds = Object.keys(documentTemplates)
        let importId = importIds[0] // Default to first template

        const templateSelector =
            importIds.length > 1
                ? `<label for="import-template-selector">${gettext("Import as:")}</label>
                <div class="fw-select-container">
                    <select class="fw-button fw-light fw-large" id="import-template-selector">
                        ${Object.entries(documentTemplates)
                            .map(
                                ([key, template]) =>
                                    `<option value="${escapeText(key)}">${escapeText(template.title)}</option>`
                            )
                            .join("")}
                    </select>
                    <div class="fw-select-arrow fa-solid fa-caret-down"></div>
                </div>`
                : ""

        const e2eeMode = this.documentOverview.app.settings.E2EE_MODE
        let e2eeHtml = ""
        let forceE2EE = false
        if (e2eeMode === "required") {
            forceE2EE = true
            e2eeHtml = `<div class="e2ee-import-note" style="margin-top: 10px;">
                <em>${gettext("This document will be saved as encrypted.")}</em>
            </div>`
        } else if (e2eeMode === "enabled") {
            e2eeHtml = `<div class="e2ee-import-choice" style="margin-top: 10px;">
                <div>
                    <input type="radio" id="import-nonencrypted" name="import-encryption" value="nonencrypted" checked>
                    <label for="import-nonencrypted">${gettext("Non-encrypted")}</label>
                </div>
                <div>
                    <input type="radio" id="import-e2ee" name="import-encryption" value="e2ee">
                    <label for="import-e2ee">${gettext("Encrypted")}</label>
                </div>
            </div>`
        }

        const supportedDescriptions = Object.entries(
            importerRegistry.getAllDescriptions()
        )
            .map(
                ([description, extensions]) =>
                    `${description} (${extensions.join(", ")})`
            )
            .join("<br>")
        const supportedFormatsText = `${gettext("Supported formats")}:<p>FIDUS<br>${supportedDescriptions}</p><p>${gettext("You can also upload a ZIP file that contains one file in any of these formats as well as images and/or bibtex file.")}</p>`

        const importDialog = new Dialog({
            id: "import_document",
            title: gettext("Import a document"),
            body: importDocumentTemplate({
                templateSelector,
                e2eeHtml,
                supportedFormatsText
            }),
            height: (importIds.length > 1 ? 260 : 210) + (e2eeHtml ? 60 : 0),
            buttons: [
                {
                    text: gettext("Import"),
                    classes: "fw-dark",
                    click: () => {
                        let file = document.getElementById("doc-uploader").files
                        if (0 === file.length) {
                            return false
                        }
                        file = file[0]
                        if (104857600 < file.size) {
                            addAlert("error", gettext("File too large"))
                            return false
                        }

                        // Determine E2EE selection
                        let targetE2EE = forceE2EE
                        if (e2eeMode === "enabled") {
                            targetE2EE =
                                document.querySelector(
                                    'input[name="import-encryption"]:checked'
                                )?.value === "e2ee"
                        }

                        const doImport = async e2eeOptions => {
                            const isFidus =
                                file.name.split(".").pop().toLowerCase() ===
                                "fidus"

                            if (isFidus) {
                                const importer = new FidusFileImporter(
                                    file,
                                    this.documentOverview.user,
                                    this.documentOverview.path,
                                    true,
                                    this.documentOverview.contacts,
                                    e2eeOptions
                                )

                                try {
                                    const {ok, statusText, doc} =
                                        await importer.init()
                                    deactivateWait()
                                    if (ok) {
                                        addAlert("info", statusText)
                                    } else {
                                        addAlert("error", statusText)
                                        return
                                    }
                                    this.documentOverview.documentList.push(doc)
                                    this.documentOverview.initTable()
                                    importDialog.close()
                                } catch (_error) {
                                    deactivateWait()
                                }
                                return
                            }

                            // Handle ZIP files for external formats
                            if (file.type === "application/zip") {
                                const {default: JSZip} = await import("jszip")
                                const zip = await JSZip.loadAsync(file)
                                const importerInfo =
                                    importerRegistry.getZipImporter(zip)

                                if (!importerInfo) {
                                    addAlert(
                                        "error",
                                        gettext(
                                            "No importable files found in ZIP"
                                        )
                                    )
                                    deactivateWait()
                                    return
                                }

                                const files = await importerInfo.getContents()
                                const importer = new importerInfo.importer(
                                    files.mainContent,
                                    this.documentOverview.user,
                                    this.documentOverview.path,
                                    importId,
                                    {...files, e2eeOptions}
                                )

                                const {ok, statusText, doc} =
                                    await importer.init()
                                deactivateWait()
                                if (ok) {
                                    addAlert("info", statusText)
                                } else {
                                    addAlert("error", statusText)
                                    return
                                }
                                this.documentOverview.documentList.push(doc)
                                this.documentOverview.initTable()
                                importDialog.close()
                                return
                            }

                            // Get file extension for external formats
                            const fileExtension = file.name
                                .split(".")
                                .pop()
                                .toLowerCase()
                            const importerInfo =
                                importerRegistry.getImporter(fileExtension)

                            if (!importerInfo) {
                                addAlert(
                                    "error",
                                    gettext("Unsupported file format")
                                )
                                deactivateWait()
                                return
                            }

                            // Get selected template if multiple templates exist
                            if (importIds.length > 1) {
                                importId = document.getElementById(
                                    "import-template-selector"
                                ).value
                            }

                            const options = {
                                bibDB: this.documentOverview.app.bibDB,
                                files: {},
                                e2eeOptions
                            }

                            const importer = new importerInfo.importer(
                                file,
                                this.documentOverview.user,
                                this.documentOverview.path,
                                importId,
                                options
                            )

                            const {ok, statusText, doc} = await importer.init()
                            deactivateWait()
                            if (ok) {
                                addAlert("info", statusText)
                            } else {
                                addAlert("error", statusText)
                                return
                            }
                            this.documentOverview.documentList.push(doc)
                            this.documentOverview.initTable()
                            importDialog.close()
                        }

                        if (targetE2EE) {
                            activateWait()
                            createPasswordDialog(async password => {
                                const salt = window.crypto.getRandomValues(
                                    new Uint8Array(16)
                                )
                                const iterations = 600000
                                try {
                                    const key = await E2EEKeyManager.deriveKey(
                                        password,
                                        salt,
                                        iterations
                                    )
                                    const e2eeOptions = {
                                        enabled: true,
                                        key,
                                        salt: btoa(
                                            String.fromCharCode(...salt)
                                        ),
                                        iterations
                                    }
                                    await doImport(e2eeOptions)
                                } catch (error) {
                                    deactivateWait()
                                    addAlert(
                                        "error",
                                        gettext(
                                            "Could not create encrypted document."
                                        )
                                    )
                                    console.error(error)
                                }
                            })
                        } else {
                            activateWait()
                            doImport(null)
                        }
                    }
                },
                {
                    type: "cancel"
                }
            ]
        })
        importDialog.open()

        document
            .getElementById("doc-uploader")
            .addEventListener("change", () => {
                document.getElementById("import-doc-name").innerHTML = document
                    .getElementById("doc-uploader")
                    .value.replace(/C:\\fakepath\\/i, "")
            })

        document
            .getElementById("import-doc-btn")
            .addEventListener("click", event => {
                document.getElementById("doc-uploader").click()
                event.preventDefault()
            })
    }

    copyFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(() => {
            ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
                const copier = new SaveCopy(
                    doc,
                    {db: doc.bibliography},
                    {db: doc.images},
                    this.documentOverview.user
                )

                copier
                    .init()
                    .then(({doc}) => {
                        this.documentOverview.documentList.push(doc)
                        this.documentOverview.initTable()
                    })
                    .catch(() => false)
            })
        })
    }

    copyFilesAs(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(() => {
            const docs = ids.map(id =>
                this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
            )
            const allE2EE = docs.every(doc => doc.e2ee)
            const anyE2EE = docs.some(doc => doc.e2ee)
            const e2eeMode = this.documentOverview.app.settings.E2EE_MODE

            const canToggleE2EE =
                e2eeMode === "enabled" ||
                (e2eeMode === "required" && !allE2EE) ||
                (e2eeMode === "disabled" && anyE2EE)

            let e2eeHtml = ""
            if (canToggleE2EE) {
                const checked =
                    e2eeMode === "required" || allE2EE ? "checked" : ""
                e2eeHtml = `
                        <div class="e2ee-copy-toggle" style="margin-top: 15px;">
                            <label>
                                <input type="checkbox" id="e2ee-copy-toggle" ${checked}>
                                ${gettext("Encrypt the copy")}
                            </label>
                        </div>
                    `
            }

            const selectTemplateDialog = new Dialog({
                title: gettext("Choose document template"),
                body: `<p>
                        ${ids.length > 1 ? gettext("Select document template for copies") : gettext("Select document template for copy.")}
                        </p>
                        <select class="fw-button fw-large fw-light">${Object.entries(
                            this.documentOverview.documentTemplates
                        )
                            .map(
                                ([importId, dt]) =>
                                    `<option value="${escapeText(importId)}">${escapeText(dt.title)}</option>`
                            )
                            .join("")}</select>
                        ${e2eeHtml}`,
                buttons: [
                    {
                        text: gettext("Copy"),
                        classes: "fw-dark",
                        click: () => {
                            const targetE2EE =
                                canToggleE2EE &&
                                selectTemplateDialog.dialogEl.querySelector(
                                    "#e2ee-copy-toggle"
                                )?.checked

                            const doCopy = (sourceKey, targetPassword) => {
                                ids.forEach(id => {
                                    const doc =
                                        this.documentOverview.documentList.find(
                                            entry => entry.id === id
                                        )
                                    const e2eeOptions = {}
                                    if (doc.e2ee && sourceKey) {
                                        e2eeOptions.sourceKey = sourceKey
                                    }
                                    if (targetE2EE && targetPassword) {
                                        e2eeOptions.targetE2EE = true
                                        e2eeOptions.targetPassword =
                                            targetPassword
                                    }

                                    const copier = new SaveCopy(
                                        doc,
                                        {db: doc.bibliography},
                                        {db: doc.images},
                                        this.documentOverview.user,
                                        selectTemplateDialog.dialogEl.querySelector(
                                            "select"
                                        ).value,
                                        e2eeOptions
                                    )

                                    copier
                                        .init()
                                        .then(({doc}) => {
                                            this.documentOverview.documentList.push(
                                                doc
                                            )
                                            this.documentOverview.initTable()
                                        })
                                        .catch(error => {
                                            console.error(error)
                                            addAlert(
                                                "error",
                                                gettext(
                                                    "Could not copy document."
                                                )
                                            )
                                        })
                                })
                                selectTemplateDialog.close()
                            }

                            if (anyE2EE && !targetE2EE) {
                                enterPasswordDialog(async password => {
                                    try {
                                        const sampleDoc = docs.find(
                                            doc => doc.e2ee
                                        )
                                        const salt = new Uint8Array(
                                            atob(sampleDoc.e2ee_salt)
                                                .split("")
                                                .map(c => c.charCodeAt(0))
                                        )
                                        const key =
                                            await E2EEKeyManager.deriveKey(
                                                password,
                                                salt,
                                                sampleDoc.e2ee_iterations ||
                                                    600000
                                            )
                                        doCopy(key, null)
                                    } catch (_err) {
                                        addAlert(
                                            "error",
                                            gettext("Incorrect password.")
                                        )
                                    }
                                })
                            } else if (!anyE2EE && targetE2EE) {
                                createPasswordDialog(password => {
                                    doCopy(null, password)
                                })
                            } else if (anyE2EE && targetE2EE) {
                                enterPasswordDialog(async password => {
                                    try {
                                        const sampleDoc = docs.find(
                                            doc => doc.e2ee
                                        )
                                        const salt = new Uint8Array(
                                            atob(sampleDoc.e2ee_salt)
                                                .split("")
                                                .map(c => c.charCodeAt(0))
                                        )
                                        const key =
                                            await E2EEKeyManager.deriveKey(
                                                password,
                                                salt,
                                                sampleDoc.e2ee_iterations ||
                                                    600000
                                            )
                                        createPasswordDialog(targetPassword => {
                                            doCopy(key, targetPassword)
                                        })
                                    } catch (_err) {
                                        addAlert(
                                            "error",
                                            gettext("Incorrect password.")
                                        )
                                    }
                                })
                            } else {
                                doCopy(null, null)
                            }
                        }
                    },
                    {
                        type: "cancel"
                    }
                ]
            })
            selectTemplateDialog.open()
        })
    }

    downloadNativeFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(() =>
            ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
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
        ).then(() =>
            ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
                new ExportFidusFile(
                    doc,
                    {db: doc.bibliography},
                    {db: doc.images},
                    false
                )
            })
        )
    }

    downloadHTMLFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(() =>
            ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
                import("../../exporter/html").then(({HTMLExporter}) => {
                    const exporter = new HTMLExporter(
                        doc,
                        {db: doc.bibliography},
                        {db: doc.images},
                        this.documentOverview.app.csl,
                        new Date(doc.updated * 1000),
                        this.documentOverview.documentStyles
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
        ).then(() => {
            ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
                if (templateType === "docx") {
                    import("../../exporter/docx").then(({DOCXExporter}) => {
                        const exporter = new DOCXExporter(
                            doc,
                            templateUrl,
                            {db: doc.bibliography},
                            {db: doc.images},
                            this.documentOverview.app.csl
                        )
                        exporter.init()
                    })
                } else {
                    import("../../exporter/odt").then(({ODTExporter}) => {
                        const exporter = new ODTExporter(
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
        })
    }

    downloadLatexFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(() =>
            ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
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
        ).then(() =>
            ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
                import("../../exporter/jats").then(({JATSExporter}) => {
                    const exporter = new JATSExporter(
                        doc,
                        {db: doc.bibliography},
                        {db: doc.images},
                        this.documentOverview.app.csl,
                        new Date(doc.updated * 1000),
                        "article"
                    )
                    exporter.init()
                })
            })
        )
    }

    downloadBITSFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            this.documentOverview.schema
        ).then(() =>
            ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
                import("../../exporter/jats").then(({JATSExporter}) => {
                    const exporter = new JATSExporter(
                        doc,
                        {db: doc.bibliography},
                        {db: doc.images},
                        this.documentOverview.app.csl,
                        new Date(doc.updated * 1000),
                        "book-part-wrapper"
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
        ).then(() =>
            ids.forEach(id => {
                const doc = this.documentOverview.documentList.find(
                    entry => entry.id === id
                )
                import("../../exporter/epub").then(({EpubExporter}) => {
                    const exporter = new EpubExporter(
                        doc,
                        {db: doc.bibliography},
                        {db: doc.images},
                        this.documentOverview.app.csl,
                        new Date(doc.updated * 1000),
                        this.documentOverview.documentStyles
                    )
                    exporter.init()
                })
            })
        )
    }

    revisionsDialog(documentId, app) {
        if (app.isOffline()) {
            addAlert(
                "info",
                gettext(
                    "You cannot view the revision history of a document while you are offline."
                )
            )
            return
        }
        const revDialog = new DocumentRevisionsDialog(
            documentId,
            this.documentOverview.documentList,
            this.documentOverview.user
        )
        revDialog.init().then(actionObject => {
            switch (actionObject.action) {
                case "added-document":
                    this.documentOverview.documentList.push(actionObject.doc)
                    this.documentOverview.initTable()
                    break
                case "deleted-revision":
                    actionObject.doc.revisions =
                        actionObject.doc.revisions.filter(
                            rev => rev.pk !== actionObject.id
                        )
                    this.documentOverview.initTable()
                    break
            }
        })
    }
}
