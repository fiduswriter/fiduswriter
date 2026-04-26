import {addAlert, postJson} from "../../../common"
import {CopyrightDialog} from "../../../copyright_dialog"
import {DocumentAccessRightsDialog} from "../../../documents/access_rights"
import {SaveCopy, SaveRevision} from "../../../exporter/native"
import {ExportFidusFile} from "../../../exporter/native/file"
import {LanguageDialog, RevisionDialog} from "../../dialogs"
import {E2EEKeyManager} from "../../e2ee/key-manager"
import {changePasswordDialog} from "../../e2ee/password-dialog"
import {
    KeyBindingsDialog,
    SearchReplaceDialog,
    WordCountDialog
} from "../../tools"

const languageItem = (language, name, order) => ({
    title: name,
    type: "setting",
    order,
    action: editor => {
        editor.view.dispatch(
            editor.view.state.tr
                .setDocAttribute("language", language)
                .setMeta("settings", true)
        )
    },
    selected: editor => {
        return editor.view.state.doc.attrs.language === language
    },
    available: editor => {
        return editor.view.state.doc.attrs.languages.includes(language)
    }
})

export const headerbarModel = () => ({
    open: window.innerWidth > 500, // Whether the menu is shown at all.
    content: [
        {
            id: "file",
            title: gettext("File"),
            tooltip: gettext("File handling"),
            type: "menu",
            keys: "Alt-f",
            order: 0,
            content: [
                {
                    title: editor =>
                        editor.user.is_authenticated &&
                        editor.docInfo.token &&
                        !editor.docInfo.is_owner
                            ? gettext("Request Access")
                            : gettext("Share"),
                    type: "action",
                    //icon: 'share',
                    tooltip: editor =>
                        editor.user.is_authenticated &&
                        editor.docInfo.token &&
                        !editor.docInfo.is_owner
                            ? gettext("Request to be added as a collaborator.")
                            : gettext("Share the document with other users."),
                    order: 0,
                    action: editor => {
                        if (
                            editor.user.is_authenticated &&
                            editor.docInfo.token &&
                            !editor.docInfo.is_owner
                        ) {
                            // TokenUser requesting access
                            postJson("/api/document/request_access/", {
                                document_id: editor.docInfo.id,
                                rights: "write"
                            })
                                .then(({json}) => {
                                    if (json.success) {
                                        addAlert(
                                            "success",
                                            gettext(
                                                "Your access request has been sent to the document owner."
                                            )
                                        )
                                    } else {
                                        addAlert(
                                            "error",
                                            json.error ||
                                                gettext(
                                                    "Could not send access request."
                                                )
                                        )
                                    }
                                })
                                .catch(() => {
                                    addAlert(
                                        "error",
                                        gettext(
                                            "Could not send access request."
                                        )
                                    )
                                })
                            return
                        }
                        const dialog = new DocumentAccessRightsDialog(
                            [editor.docInfo.id],
                            editor.docInfo.owner.contacts,
                            contactData => {
                                editor.docInfo.owner.contacts.push(contactData)
                            },
                            editor.e2ee?.encrypted
                        )
                        dialog.init()
                    },
                    disabled: editor => {
                        return (
                            editor.app.isOffline() ||
                            !editor.user.is_authenticated
                        )
                    }
                },
                {
                    title: editor =>
                        editor.user.is_authenticated
                            ? gettext("Close")
                            : gettext("Sign up / Log in"),
                    type: "action",
                    //icon: 'times-circle',
                    tooltip: editor =>
                        editor.user.is_authenticated
                            ? gettext(
                                  "Close the document and return to the document overview menu."
                              )
                            : gettext("Sign up for an account or log in."),
                    order: 1,
                    action: editor => {
                        if (editor.user.is_authenticated) {
                            const folderPath = editor.docInfo.path.slice(
                                0,
                                editor.docInfo.path.lastIndexOf("/")
                            )
                            if (
                                !folderPath.length &&
                                editor.app.routes[""].app === "document"
                            ) {
                                editor.app.goTo("/")
                            } else {
                                editor.app.goTo(`/documents${folderPath}/`)
                            }
                        } else {
                            if (
                                settings_REGISTRATION_OPEN ||
                                settings_SOCIALACCOUNT_OPEN
                            ) {
                                window.location.href = "/account/sign-up/"
                            } else {
                                window.location.href = "/"
                            }
                        }
                        return
                    },
                    disabled: editor => editor.app.isOffline()
                },
                {
                    title: gettext("Save revision"),
                    type: "action",
                    //icon: 'save',
                    tooltip: gettext("Save a revision of the document."),
                    order: 2,
                    keys: "Ctrl-s",
                    action: editor => {
                        const dialog = new RevisionDialog(editor.docInfo.dir)
                        dialog.init().then(note => {
                            const saver = new SaveRevision(
                                editor.getDoc(),
                                editor.mod.db.imageDB,
                                editor.mod.db.bibDB,
                                note,
                                editor.app
                            )
                            return saver.init()
                        })
                    },
                    disabled: editor =>
                        editor.docInfo.access_rights !== "write" ||
                        editor.app.isOffline() ||
                        !!editor.docInfo.token
                },
                {
                    title: gettext("Create copy"),
                    type: "action",
                    //icon: 'copy',
                    tooltip: gettext("Create a copy of the document."),
                    order: 3,
                    action: editor => {
                        const copier = new SaveCopy(
                            editor.getDoc(),
                            editor.mod.db.bibDB,
                            editor.mod.db.imageDB,
                            editor.user
                        )
                        copier
                            .init()
                            .then(({docInfo}) =>
                                editor.app.goTo(`/document/${docInfo.id}/`)
                            )
                            .catch(() => false)
                    },
                    disabled: editor =>
                        editor.app.isOffline() ||
                        (!!editor.docInfo.token &&
                            !editor.user.is_authenticated)
                },
                {
                    title: gettext("Download"),
                    type: "action",
                    //icon: 'download',
                    tooltip: gettext(
                        "Export the document as a FIDUS file including its template."
                    ),
                    order: 4,
                    action: editor => {
                        new ExportFidusFile(
                            editor.getDoc(),
                            editor.mod.db.bibDB,
                            editor.mod.db.imageDB,
                            true,
                            editor.docInfo.token
                        )
                    },
                    disabled: editor => editor.app.isOffline()
                },
                {
                    title: gettext("Print/PDF"),
                    type: "action",
                    //icon: 'print',
                    tooltip: gettext(
                        "Either print or create a PDF using your browser print dialog."
                    ),
                    order: 5,
                    keys: "Ctrl-p",
                    action: editor => {
                        import("../../../exporter/print").then(
                            ({PrintExporter}) => {
                                const exporter = new PrintExporter(
                                    editor.getDoc({
                                        changes: "acceptAllNoInsertions"
                                    }),
                                    editor.mod.db.bibDB,
                                    editor.mod.db.imageDB,
                                    editor.app.csl,
                                    editor.docInfo.updated,
                                    editor.mod.documentTemplate.documentStyles
                                )
                                exporter.init()
                            }
                        )
                    }
                },
                {
                    title: gettext("Change password"),
                    type: "action",
                    tooltip: gettext(
                        "Change the password of this encrypted document."
                    ),
                    order: 6,
                    action: editor => {
                        if (!editor.e2ee?.key) {
                            addAlert(
                                "error",
                                gettext(
                                    "Document key is not available. Please reload the document."
                                )
                            )
                            return
                        }
                        changePasswordDialog(
                            async ({currentPassword, newPassword}) => {
                                try {
                                    // Verify current password by deriving key
                                    const currentSaltBytes = new Uint8Array(
                                        atob(editor.e2ee.encryptionSalt)
                                            .split("")
                                            .map(c => c.charCodeAt(0))
                                    )
                                    const currentKey =
                                        await E2EEKeyManager.deriveKey(
                                            currentPassword,
                                            currentSaltBytes,
                                            editor.e2ee.encryptionIterations
                                        )
                                    // Test the key by encrypting and decrypting a test value
                                    const {E2EEEncryptor} = await import(
                                        "../../e2ee/encryptor"
                                    )
                                    const testValue = "test"
                                    const encryptedTest =
                                        await E2EEEncryptor.encrypt(
                                            testValue,
                                            currentKey
                                        )
                                    await E2EEEncryptor.decrypt(
                                        encryptedTest,
                                        editor.e2ee.key
                                    )

                                    // Current password verified — generate new salt and key
                                    const newSalt =
                                        E2EEKeyManager.generateSalt()
                                    const newSaltBase64 = btoa(
                                        String.fromCharCode(...newSalt)
                                    )
                                    const newIterations = 600000
                                    const newKey =
                                        await E2EEKeyManager.deriveKey(
                                            newPassword,
                                            newSalt,
                                            newIterations
                                        )

                                    // Re-encrypt the document with the new key
                                    await editor.e2ee.snapshotManager.reEncryptWithNewKey(
                                        newKey,
                                        newSaltBase64,
                                        newIterations
                                    )

                                    // Update local E2EE state
                                    editor.e2ee.encryptionSalt = newSaltBase64
                                    editor.e2ee.encryptionIterations =
                                        newIterations
                                    editor.e2ee.key = newKey

                                    // Cache the new key in sessionStorage
                                    await E2EEKeyManager.storeKeyInSession(
                                        editor.docInfo.id,
                                        newKey
                                    )

                                    addAlert(
                                        "success",
                                        gettext(
                                            "Document password changed. Remember to share the new password with your collaborators."
                                        )
                                    )
                                } catch (_error) {
                                    addAlert(
                                        "error",
                                        gettext(
                                            "The current password is incorrect."
                                        )
                                    )
                                }
                            }
                        )
                    },
                    disabled: editor =>
                        !editor.e2ee?.encrypted ||
                        editor.docInfo.access_rights !== "write"
                }
            ]
        },
        {
            id: "export",
            title: gettext("Export"),
            tooltip: gettext("Export of the document contents"),
            type: "menu",
            order: 1,
            keys: "Alt-e",
            content: [
                {
                    title: gettext("HTML"),
                    type: "action",
                    tooltip: gettext("Export the document to an HTML file."),
                    order: 0,
                    action: editor => {
                        import("../../../exporter/html").then(
                            ({HTMLExporter}) => {
                                const exporter = new HTMLExporter(
                                    editor.getDoc({
                                        changes: "acceptAllNoInsertions"
                                    }),
                                    editor.mod.db.bibDB,
                                    editor.mod.db.imageDB,
                                    editor.app.csl,
                                    editor.docInfo.updated,
                                    editor.mod.documentTemplate.documentStyles
                                )
                                exporter.init()
                            }
                        )
                    }
                },
                {
                    title: gettext("Epub"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to an Epub electronic reader file."
                    ),
                    order: 1,
                    action: editor => {
                        import("../../../exporter/epub").then(
                            ({EpubExporter}) => {
                                const exporter = new EpubExporter(
                                    editor.getDoc({
                                        changes: "acceptAllNoInsertions"
                                    }),
                                    editor.mod.db.bibDB,
                                    editor.mod.db.imageDB,
                                    editor.app.csl,
                                    editor.docInfo.updated,
                                    editor.mod.documentTemplate.documentStyles
                                )
                                exporter.init()
                            }
                        )
                    },
                    disabled: editor => editor.app.isOffline()
                },
                {
                    title: gettext("LaTeX"),
                    type: "action",
                    tooltip: gettext("Export the document to an LaTeX file."),
                    order: 2,
                    action: editor => {
                        import("../../../exporter/latex").then(
                            ({LatexExporter}) => {
                                const exporter = new LatexExporter(
                                    editor.getDoc({
                                        changes: "acceptAllNoInsertions"
                                    }),
                                    editor.mod.db.bibDB,
                                    editor.mod.db.imageDB,
                                    editor.docInfo.updated
                                )
                                exporter.init()
                            }
                        )
                    },
                    disabled: editor => editor.app.isOffline()
                },
                {
                    title: gettext("JATS"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to a Journal Archiving and Interchange Tag Library NISO JATS Version 1.2 file."
                    ),
                    order: 2,
                    action: editor => {
                        import("../../../exporter/jats").then(
                            ({JATSExporter}) => {
                                const exporter = new JATSExporter(
                                    editor.getDoc({
                                        changes: "acceptAllNoInsertions"
                                    }),
                                    editor.mod.db.bibDB,
                                    editor.mod.db.imageDB,
                                    editor.app.csl,
                                    editor.docInfo.updated,
                                    "article"
                                )
                                exporter.init()
                            }
                        )
                    },
                    disabled: editor => editor.app.isOffline()
                },
                {
                    title: gettext("BITS"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to a Book Interchange Tag Set BITS Version 2.1 file."
                    ),
                    order: 2,
                    action: editor => {
                        import("../../../exporter/jats").then(
                            ({JATSExporter}) => {
                                const exporter = new JATSExporter(
                                    editor.getDoc({
                                        changes: "acceptAllNoInsertions"
                                    }),
                                    editor.mod.db.bibDB,
                                    editor.mod.db.imageDB,
                                    editor.app.csl,
                                    editor.docInfo.updated,
                                    "book-part-wrapper"
                                )
                                exporter.init()
                            }
                        )
                    },
                    disabled: editor => editor.app.isOffline()
                },
                {
                    title: gettext("Pandoc JSON"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to a Pandoc JSON file."
                    ),
                    order: 3,
                    action: editor => {
                        import("../../../exporter/pandoc").then(
                            ({PandocExporter}) => {
                                const exporter = new PandocExporter(
                                    editor.getDoc({
                                        changes: "acceptAllNoInsertions"
                                    }),
                                    editor.mod.db.bibDB,
                                    editor.mod.db.imageDB,
                                    editor.app.csl,
                                    editor.docInfo.updated
                                )
                                exporter.init()
                            }
                        )
                    },
                    disabled: editor => editor.app.isOffline()
                },
                {
                    title: gettext("Slim FIDUS"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to a FIDUS file without its template."
                    ),
                    order: 4,
                    action: editor => {
                        new ExportFidusFile(
                            editor.getDoc(),
                            editor.mod.db.bibDB,
                            editor.mod.db.imageDB,
                            false
                        )
                    }
                }
            ]
        },
        {
            id: "settings",
            title: gettext("Settings"),
            tooltip: gettext("Configure settings of this document."),
            type: "menu",
            order: 2,
            keys: "Alt-s",
            content: [
                {
                    id: "citation_style",
                    title: gettext("Citation Style"),
                    type: "menu",
                    tooltip: gettext("Choose your preferred citation style."),
                    order: 1,
                    disabled: editor => {
                        return editor.docInfo.access_rights !== "write"
                    },
                    content: []
                },
                {
                    id: "document_style",
                    title: gettext("Document Style"),
                    type: "menu",
                    tooltip: gettext("Choose your preferred document style."),
                    order: 2,
                    disabled: editor => {
                        return (
                            editor.docInfo.access_rights !== "write" ||
                            editor.app.isOffline()
                        )
                    },
                    content: []
                },
                {
                    id: "language",
                    title: gettext("Text Language"),
                    type: "menu",
                    tooltip: gettext("Choose the language of the document."),
                    order: 3,
                    disabled: editor => {
                        return editor.docInfo.access_rights !== "write"
                    },
                    content: [
                        languageItem(
                            "en-US",
                            gettext("English (United States)"),
                            0
                        ),
                        languageItem(
                            "en-GB",
                            gettext("English (United Kingdom)"),
                            1
                        ),
                        languageItem("de-DE", gettext("German (Germany)"), 2),
                        languageItem(
                            "zh-CN",
                            gettext("Chinese (Simplified)"),
                            3
                        ),
                        languageItem("es", gettext("Spanish"), 4),
                        languageItem("fr", gettext("French"), 5),
                        languageItem("ja", gettext("Japanese"), 6),
                        languageItem("it", gettext("Italian"), 7),
                        //languageItem('pl', gettext('Polish'), 8),
                        languageItem(
                            "pt-BR",
                            gettext("Portuguese (Brazil)"),
                            9
                        ),
                        //languageItem('nl', gettext('Dutch'), 10),
                        //languageItem('ru', gettext('Russian'), 11),
                        {
                            type: "separator",
                            order: 12,
                            available: editor => {
                                // There has to be at least one language of the default languages
                                // among the default ones and one that is not among the default ones.
                                return (
                                    !!editor.view.state.doc.attrs.languages.find(
                                        lang =>
                                            [
                                                "en-US",
                                                "en-GB",
                                                "de-DE",
                                                "zh-CN",
                                                "es",
                                                "fr",
                                                "ja",
                                                "it",
                                                "pl",
                                                "pt-BR",
                                                "nl",
                                                "ru"
                                            ].includes(lang)
                                    ) &&
                                    !!editor.view.state.doc.attrs.languages.find(
                                        lang =>
                                            ![
                                                "en-US",
                                                "en-GB",
                                                "de-DE",
                                                "zh-CN",
                                                "es",
                                                "fr",
                                                "ja",
                                                "it",
                                                "pl",
                                                "pt-BR",
                                                "nl",
                                                "ru"
                                            ].includes(lang)
                                    )
                                )
                            }
                        },
                        {
                            title: gettext("Other"),
                            type: "setting",
                            order: 13,
                            action: editor => {
                                const language =
                                        editor.view.state.doc.attrs.language,
                                    dialog = new LanguageDialog(
                                        editor,
                                        language
                                    )
                                dialog.init()
                            },
                            selected: editor => {
                                return ![
                                    "en-US",
                                    "en-GB",
                                    "de-DE",
                                    "zh-CN",
                                    "es",
                                    "fr",
                                    "ja",
                                    "it",
                                    "pl",
                                    "pt-BR",
                                    "nl",
                                    "ru"
                                ].includes(editor.view.state.doc.attrs.language)
                            },
                            available: editor =>
                                !!editor.view.state.doc.attrs.languages.find(
                                    lang =>
                                        ![
                                            "en-US",
                                            "en-GB",
                                            "de-DE",
                                            "zh-CN",
                                            "es",
                                            "fr",
                                            "ja",
                                            "it",
                                            "pl",
                                            "pt-BR",
                                            "nl",
                                            "ru"
                                        ].includes(lang)
                                )
                        }
                    ]
                },
                {
                    id: "paper_size",
                    title: gettext("Paper Size"),
                    type: "menu",
                    tooltip: gettext(
                        "Choose a papersize for print and PDF generation."
                    ),
                    order: 4,
                    disabled: editor => {
                        return editor.docInfo.access_rights !== "write"
                    },
                    content: [
                        {
                            title: gettext("DIN A4"),
                            type: "setting",
                            tooltip: gettext(
                                "A4 (DIN A4/ISO 216) which is used in most of the world."
                            ),
                            order: 0,
                            action: editor => {
                                editor.view.dispatch(
                                    editor.view.state.tr
                                        .setDocAttribute("papersize", "A4")
                                        .setMeta("settings", true)
                                )
                            },
                            selected: editor => {
                                return (
                                    editor.view.state.doc.attrs.papersize ===
                                    "A4"
                                )
                            },
                            available: editor => {
                                return editor.view.state.doc.attrs.papersizes.includes(
                                    "A4"
                                )
                            }
                        },
                        {
                            title: gettext("US Letter"),
                            type: "setting",
                            tooltip: gettext(
                                "The format used by the USA and some other American countries."
                            ),
                            order: 1,
                            action: editor => {
                                editor.view.dispatch(
                                    editor.view.state.tr
                                        .setDocAttribute(
                                            "papersize",
                                            "US Letter"
                                        )
                                        .setMeta("settings", true)
                                )
                            },
                            selected: editor => {
                                return (
                                    editor.view.state.doc.attrs.papersize ===
                                    "US Letter"
                                )
                            },
                            available: editor => {
                                return editor.view.state.doc.attrs.papersizes.includes(
                                    "US Letter"
                                )
                            }
                        }
                    ]
                },
                {
                    title: gettext("Copyright Information"),
                    type: "setting",
                    order: 5,
                    action: editor => {
                        const dialog = new CopyrightDialog(
                            editor.view.state.doc.attrs.copyright
                        )
                        dialog.init().then(copyright => {
                            if (copyright) {
                                editor.view.dispatch(
                                    editor.view.state.tr
                                        .setDocAttribute("copyright", copyright)
                                        .setMeta("settings", true)
                                )
                            }
                            editor.currentView.focus()
                        })
                    },
                    disabled: editor => editor.docInfo.access_rights !== "write"
                }
            ]
        },
        {
            id: "tools",
            title: gettext("Tools"),
            tooltip: gettext("Select document editing tool."),
            type: "menu",
            order: 3,
            keys: "Alt-t",
            content: [
                {
                    title: gettext("Word counter"),
                    type: "action",
                    tooltip: gettext("See document statistics."),
                    order: 0,
                    action: editor => {
                        const dialog = new WordCountDialog(editor)
                        dialog.init()
                    }
                },
                {
                    title: gettext("Search and replace"),
                    type: "action",
                    tooltip: gettext("Show a search and replace dialog."),
                    order: 1,
                    keys: "Ctrl-h",
                    action: editor => {
                        const dialog = new SearchReplaceDialog(editor)
                        dialog.init()
                    }
                },
                {
                    title: gettext("Keyboard shortcuts"),
                    type: "action",
                    tooltip: gettext(
                        "Show an overview of available keyboard shortcuts."
                    ),
                    order: 2,
                    keys: "Shift-Ctrl-/",
                    action: editor => {
                        const dialog = new KeyBindingsDialog(editor)
                        dialog.init()
                    }
                }
            ]
        },
        {
            title: gettext("Track changes"),
            type: "menu",
            tooltip: gettext("Tracking changes to the document"),
            order: 4,
            keys: "Alt-c",
            disabled: editor => editor.docInfo.access_rights !== "write",
            content: [
                {
                    title: gettext("Record"),
                    type: "setting",
                    tooltip: gettext("Record document changes"),
                    order: 0,
                    disabled: editor => {
                        return editor.docInfo.access_rights !== "write"
                    },
                    action: editor => {
                        const tracked = !editor.view.state.doc.attrs.tracked
                        editor.view.dispatch(
                            editor.view.state.tr
                                .setDocAttribute("tracked", tracked)
                                .setMeta("settings", true)
                        )
                    },
                    selected: editor => {
                        return editor.view.state.doc.attrs.tracked === true
                    }
                },
                {
                    title: gettext("Accept all"),
                    type: "action",
                    tooltip: gettext("Accept all tracked changes."),
                    order: 1,
                    action: editor => {
                        editor.mod.track.acceptAll()
                    }
                },
                {
                    title: gettext("Reject all"),
                    type: "action",
                    tooltip: gettext("Reject all tracked changes."),
                    order: 2,
                    action: editor => {
                        editor.mod.track.rejectAll()
                    }
                }
            ]
        }
    ]
})
