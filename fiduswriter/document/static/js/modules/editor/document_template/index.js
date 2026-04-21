import {Dialog, addAlert, escapeText, get} from "../../common"
import {SaveCopy} from "../../exporter/native"
import {E2EEKeyManager} from "../e2ee/key-manager"
import {
    createPasswordDialog,
    enterPasswordDialog
} from "../e2ee/password-dialog"

export class ModDocumentTemplate {
    constructor(editor) {
        editor.mod.documentTemplate = this
        this.editor = editor
        this.exportTemplates = []
        this.documentStyles = []
    }

    setStyles(styles) {
        this.exportTemplates = styles.export_templates
        this.documentStyles = styles.document_styles
        this.documentTemplates = styles.document_templates
        this.addExportTemplateMenuEntries()
        this.addDocumentStylesMenuEntries()
        if (Object.keys(this.documentTemplates).length) {
            this.addCopyAsMenuEntry()
        }
        if (this.editor.menu.headerView) {
            this.editor.menu.headerView.update()
        }
        //Cache the template files using Service Worker
        for (const key in styles.export_templates) {
            const template = styles.export_templates[key]
            get(template.template_file)
        }
        //Cache the required font related files too!
        this.documentStyles.forEach(docStyle => {
            docStyle.documentstylefile_set.forEach(([url, _filename]) =>
                get(url)
            )
        })
    }

    addDocPartSettings() {
        const hideableDocParts = []
        this.editor.view.state.doc.forEach((child, _offset, index) => {
            if (child.attrs.optional) {
                hideableDocParts.push({
                    title: child.attrs.title,
                    id: child.attrs.id,
                    index
                })
            }
        })
        if (!hideableDocParts.length) {
            return
        }
        const metadataMenu = {
            id: "metadata",
            title: gettext("Optional sections"),
            type: "menu",
            tooltip: gettext("Choose which optional sections to enable."),
            order: 0,
            disabled: editor => editor.docInfo.access_rights !== "write",
            content: hideableDocParts.map(docPart => ({
                title: docPart.title,
                type: "setting",
                tooltip: `${gettext("Show/hide")} ${docPart.title}`,
                order: docPart.index,
                action: editor => {
                    let offset = 0
                    for (let i = 0; i < docPart.index; i++) {
                        offset += editor.view.state.doc.child(i).nodeSize
                    }
                    const node = editor.view.state.doc.child(docPart.index)
                    editor.view.dispatch(
                        editor.view.state.tr
                            .setNodeMarkup(
                                offset,
                                false,
                                Object.assign({}, node.attrs, {
                                    hidden: !node.attrs.hidden
                                })
                            )
                            .setMeta("settings", true)
                    )
                },
                selected: editor =>
                    !editor.view.state.doc.child(docPart.index).attrs.hidden
            }))
        }
        const settingsMenu = this.editor.menu.headerbarModel.content.find(
            menu => menu.id === "settings"
        )
        settingsMenu.content = settingsMenu.content.filter(
            item => item.id !== "metadata"
        )
        settingsMenu.content.unshift(metadataMenu)
    }

    addCopyAsMenuEntry() {
        const fileMenu = this.editor.menu.headerbarModel.content.find(
            menu => menu.id === "file"
        )
        // Cancel if run already
        if (fileMenu.content.find(menuItem => menuItem.id === "copy_as")) {
            return
        }
        fileMenu.content.push({
            id: "copy_as",
            title: gettext("Create copy as ..."),
            type: "action",
            tooltip: gettext(
                "Create copy of the current document with a specific template."
            ),
            order: 3.5,
            action: editor => {
                const isE2EE = editor.docInfo.e2ee
                const e2eeMode = settings_E2EE_MODE
                const canToggleE2EE =
                    e2eeMode === "enabled" ||
                    (e2eeMode === "required" && !isE2EE) ||
                    (e2eeMode === "disabled" && isE2EE)

                let e2eeHtml = ""
                if (canToggleE2EE) {
                    e2eeHtml = `
                        <div class="e2ee-copy-toggle" style="margin-top: 15px;">
                            <label>
                                <input type="checkbox" id="e2ee-copy-toggle" ${e2eeMode === "required" || isE2EE ? "checked" : ""}>
                                ${gettext("Encrypt the copy")}
                            </label>
                        </div>
                    `
                }

                const selectTemplateDialog = new Dialog({
                    title: gettext("Choose document template"),
                    body: `<p>
                        ${gettext("Select document template for copy.")}
                        </p>
                        <select class="fw-button fw-large fw-light">${Object.entries(
                            editor.mod.documentTemplate.documentTemplates
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
                                if (editor.app.isOffline()) {
                                    addAlert(
                                        "error",
                                        "You are offline. Please try again after you are online."
                                    )
                                    selectTemplateDialog.close()
                                    return
                                }

                                const targetE2EE =
                                    canToggleE2EE &&
                                    selectTemplateDialog.dialogEl.querySelector(
                                        "#e2ee-copy-toggle"
                                    )?.checked

                                const doCopy = e2eeOptions => {
                                    const copier = new SaveCopy(
                                        editor.getDoc(),
                                        editor.mod.db.bibDB,
                                        editor.mod.db.imageDB,
                                        editor.user,
                                        selectTemplateDialog.dialogEl.querySelector(
                                            "select"
                                        ).value,
                                        e2eeOptions
                                    )
                                    copier
                                        .init()
                                        .then(({docInfo}) => {
                                            const url = targetE2EE
                                                ? `/document/${docInfo.id}/?e2ee=1`
                                                : `/document/${docInfo.id}/`
                                            editor.app.goTo(url)
                                        })
                                        .catch(() => false)
                                    selectTemplateDialog.close()
                                }

                                if (isE2EE && !targetE2EE) {
                                    // Decrypting: need source key
                                    if (editor.e2ee && editor.e2ee.key) {
                                        doCopy({
                                            sourceKey: editor.e2ee.key,
                                            targetE2EE: false
                                        })
                                    } else {
                                        enterPasswordDialog(async password => {
                                            try {
                                                const key =
                                                    await E2EEKeyManager.deriveKey(
                                                        password,
                                                        new Uint8Array(
                                                            atob(
                                                                editor.docInfo
                                                                    .e2ee_salt
                                                            )
                                                                .split("")
                                                                .map(c =>
                                                                    c.charCodeAt(
                                                                        0
                                                                    )
                                                                )
                                                        ),
                                                        editor.docInfo
                                                            .e2ee_iterations ||
                                                            600000
                                                    )
                                                doCopy({
                                                    sourceKey: key,
                                                    targetE2EE: false
                                                })
                                            } catch (_err) {
                                                addAlert(
                                                    "error",
                                                    gettext(
                                                        "Incorrect password."
                                                    )
                                                )
                                            }
                                        })
                                    }
                                } else if (!isE2EE && targetE2EE) {
                                    // Encrypting: need new password
                                    createPasswordDialog(password => {
                                        doCopy({
                                            targetE2EE: true,
                                            targetPassword: password
                                        })
                                    })
                                } else if (isE2EE && targetE2EE) {
                                    // E2EE -> E2EE: need source key, then new password
                                    const handlePasswords = sourceKey => {
                                        createPasswordDialog(password => {
                                            doCopy({
                                                sourceKey: sourceKey,
                                                targetE2EE: true,
                                                targetPassword: password
                                            })
                                        })
                                    }
                                    if (editor.e2ee && editor.e2ee.key) {
                                        handlePasswords(editor.e2ee.key)
                                    } else {
                                        enterPasswordDialog(async password => {
                                            try {
                                                const key =
                                                    await E2EEKeyManager.deriveKey(
                                                        password,
                                                        new Uint8Array(
                                                            atob(
                                                                editor.docInfo
                                                                    .e2ee_salt
                                                            )
                                                                .split("")
                                                                .map(c =>
                                                                    c.charCodeAt(
                                                                        0
                                                                    )
                                                                )
                                                        ),
                                                        editor.docInfo
                                                            .e2ee_iterations ||
                                                            600000
                                                    )
                                                handlePasswords(key)
                                            } catch (_err) {
                                                addAlert(
                                                    "error",
                                                    gettext(
                                                        "Incorrect password."
                                                    )
                                                )
                                            }
                                        })
                                    }
                                } else {
                                    // Plain -> plain
                                    doCopy(null)
                                }
                            }
                        },
                        {
                            type: "cancel"
                        }
                    ]
                })
                selectTemplateDialog.open()
            },
            disabled: editor => editor.app.isOffline()
        })

        fileMenu.content = fileMenu.content.sort((a, b) => a.order - b.order)
    }

    addExportTemplateMenuEntries() {
        const exportMenu = this.editor.menu.headerbarModel.content.find(
            menu => menu.id === "export"
        )
        // Remove any previous entries in case we run this a second time
        exportMenu.content = exportMenu.content.filter(
            menuItem => menuItem.class !== "export_template"
        )
        // Find highest menu item under 100 to put templates at end of native exporter options.
        let order = 1
        exportMenu.content.forEach(menuItem => {
            if (menuItem.order < 100 && menuItem.order > order) {
                order = menuItem.order
            }
        })
        const exportMenuEntries = this.exportTemplates.map(template => {
            if (template.file_type === "docx") {
                return {
                    class: "export_template",
                    title: `${template.title} (DOCX)`,
                    type: "action",
                    order: ++order,
                    tooltip: gettext(
                        "Export the document to a DOCX file with the given template."
                    ),
                    action: editor => {
                        import("../../exporter/docx").then(({DOCXExporter}) => {
                            const exporter = new DOCXExporter(
                                editor.getDoc(),
                                template.template_file,
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB,
                                editor.app.csl
                            )
                            exporter.init()
                        })
                    },
                    disabled: editor => editor.app.isOffline()
                }
            } else {
                return {
                    class: "export_template",
                    title: `${template.title} (ODT)`,
                    type: "action",
                    order: ++order,
                    tooltip: gettext(
                        "Export the document to an ODT file with the given template."
                    ),
                    action: editor => {
                        import("../../exporter/odt").then(({ODTExporter}) => {
                            const exporter = new ODTExporter(
                                editor.getDoc(),
                                template.template_file,
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB,
                                editor.app.csl
                            )
                            exporter.init()
                        })
                    },
                    disabled: editor => editor.app.isOffline()
                }
            }
        })
        exportMenu.content = exportMenu.content.concat(exportMenuEntries)
        exportMenu.content = exportMenu.content.sort(
            (a, b) => a.order - b.order
        )
    }

    addDocumentStylesMenuEntries() {
        const settingsMenu = this.editor.menu.headerbarModel.content.find(
                menu => menu.id === "settings"
            ),
            documentStyleMenu = settingsMenu.content.find(
                menu => menu.id === "document_style"
            )

        documentStyleMenu.content = this.documentStyles.map(docStyle => {
            return {
                title: docStyle.title,
                type: "setting",
                action: editor => {
                    editor.view.dispatch(
                        editor.view.state.tr
                            .setDocAttribute("documentstyle", docStyle.slug)
                            .setMeta("settings", true)
                    )
                },
                selected: editor =>
                    editor.view.state.doc.attrs.documentstyle === docStyle.slug,
                disabled: editor => editor.app.isOffline()
            }
        })
    }

    getCitationStyles() {
        return this.editor.app.csl.getStyles().then(styles => {
            this.citationStyles = styles
        })
    }

    addCitationStylesMenuEntries() {
        const settingsMenu = this.editor.menu.headerbarModel.content.find(
                menu => menu.id === "settings"
            ),
            citationStyleMenu = settingsMenu.content.find(
                menu => menu.id === "citation_style"
            )
        if (citationStyleMenu) {
            citationStyleMenu.content =
                this.editor.view.state.doc.attrs.citationstyles.map(
                    citationstyle => {
                        return {
                            title: this.citationStyles[citationstyle],
                            type: "setting",
                            action: editor => {
                                editor.view.dispatch(
                                    editor.view.state.tr
                                        .setDocAttribute(
                                            "citationstyle",
                                            citationstyle
                                        )
                                        .setMeta("settings", true)
                                )
                            },
                            selected: editor => {
                                return (
                                    editor.view.state.doc.attrs
                                        .citationstyle === citationstyle
                                )
                            }
                        }
                    }
                )
        }
    }
}
