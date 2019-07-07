import {DocumentAccessRightsDialog} from "../../../documents/access_rights"
import {SaveRevision, SaveCopy} from "../../../exporter/native"
import {ExportFidusFile} from "../../../exporter/native/file"
import {RevisionDialog, LanguageDialog} from "../../dialogs"

const languageItem = function(code, name, order) {
    return {
        title: name,
        type: 'setting',
        order,
        action: editor => {
            const article = editor.view.state.doc.firstChild
            const attrs = Object.assign({}, article.attrs)
            attrs.language = code
            editor.view.dispatch(
                editor.view.state.tr.setNodeMarkup(0, false, attrs).setMeta('settings', true)
            )
        },
        selected: editor => {
            return editor.view.state.doc.firstChild.attrs.language === code
        },
        available: editor => {
            return editor.view.state.doc.firstChild.attrs.languages.includes(code)
        }
    }
}


export const headerbarModel = () => ({
    open: true, // Whether the menu is shown at all.
    content: [
        {
            id: 'file',
            title: gettext('File'),
            tooltip: gettext('File handling'),
            type: 'menu',
            order: 0,
            content: [
                {
                    title: gettext('Share'),
                    type: 'action',
                    //icon: 'share',
                    tooltip: gettext('Share the document with other users.'),
                    order: 0,
                    action: editor => {
                        const dialog = new DocumentAccessRightsDialog(
                            [editor.docInfo.id],
                            editor.docInfo.owner.team_members,
                            memberData => {
                                editor.user.team_members.push(memberData)
                            },
                            editor.registrationOpen
                        )
                        dialog.init()
                    },
                    disabled: editor => {
                        return !editor.docInfo.is_owner
                    }
                },
                {
                    title: gettext('Close'),
                    type: 'action',
                    //icon: 'times-circle',
                    tooltip: gettext('Close the document and return to the document overview menu.'),
                    order: 1,
                    action: editor => {
                        editor.app.goTo('/')
                    }
                },
                {
                    title: gettext('Save revision'),
                    type: 'action',
                    //icon: 'save',
                    tooltip: gettext('Save a revision of the current document.'),
                    order: 2,
                    keys: 'Ctrl-s',
                    action: editor => {
                        const dialog = new RevisionDialog(editor.docInfo.dir)
                        dialog.init().then(
                            note => {
                                const saver = new SaveRevision(
                                    editor.getDoc(),
                                    editor.mod.db.imageDB,
                                    editor.mod.db.bibDB,
                                    note
                                )
                                return saver.init()
                            }
                        )
                    },
                    disabled: editor => editor.docInfo.access_rights !== 'write'
                },
                {
                    title: gettext('Create Copy'),
                    type: 'action',
                    //icon: 'copy',
                    tooltip: gettext('Create copy of the current document.'),
                    order: 3,
                    action: editor => {
                        const copier = new SaveCopy(
                                editor.getDoc(),
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB,
                                editor.user
                            )
                        copier.init().then(({docInfo}) =>
                            window.location.href = `/document/${docInfo.id}/`
                        ).catch(() => false)
                    }
                },
                {
                    title: gettext('Download'),
                    type: 'action',
                    //icon: 'download',
                    tooltip: gettext('Download the current document.'),
                    order: 4,
                    action: editor => {
                        new ExportFidusFile(
                            editor.getDoc(),
                            editor.mod.db.bibDB,
                            editor.mod.db.imageDB
                        )
                    }
                },
                {
                    title: gettext('Print/PDF'),
                    type: 'action',
                    //icon: 'print',
                    tooltip: gettext('Either print or create a PDF using your browser print dialog.'),
                    order: 5,
                    keys: 'Ctrl-p',
                    action: editor => {
                        import("../../../exporter/print").then(({PrintExporter}) => {
                            const exporter = new PrintExporter(
                                editor.schema,
                                editor.getDoc({changes: 'acceptAllNoInsertions'}),
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB,
                                editor.mod.documentTemplate.citationStyles,
                                editor.mod.documentTemplate.citationLocales,
                                editor.mod.documentTemplate.documentStyles,
                                editor.staticUrl
                            )
                            exporter.init()
                        })
                    }
                }
            ]
        },
        {
            id: 'export',
            title: gettext('Export'),
            tooltip: gettext('Export of the document contents'),
            type: 'menu',
            order: 1,
            content: [
                {
                    title: gettext('HTML'),
                    type: 'action',
                    tooltip: gettext('Export the document to an HTML file.'),
                    order: 0,
                    action: editor => {
                        import("../../../exporter/html").then(({HTMLExporter}) => {
                            const exporter = new HTMLExporter(
                                editor.schema,
                                editor.getDoc({changes: 'acceptAllNoInsertions'}),
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB,
                                editor.mod.documentTemplate.citationStyles,
                                editor.mod.documentTemplate.citationLocales,
                                editor.mod.documentTemplate.documentStyles,
                                editor.staticUrl
                            )
                            exporter.init()
                        })
                    }
                },
                {
                    title: gettext('Epub'),
                    type: 'action',
                    tooltip: gettext('Export the document to an Epub electronic reader file.'),
                    order: 1,
                    action: editor => {
                        import("../../../exporter/epub").then(({EpubExporter}) => {
                            const exporter = new EpubExporter(
                                editor.schema,
                                editor.getDoc({changes: 'acceptAllNoInsertions'}),
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB,
                                editor.mod.documentTemplate.citationStyles,
                                editor.mod.documentTemplate.citationLocales,
                                editor.staticUrl
                            )
                            exporter.init()
                        })
                    }
                },
                {
                    title: gettext('LaTeX'),
                    type: 'action',
                    tooltip: gettext('Export the document to an LaTeX file.'),
                    order: 2,
                    action: editor => {
                        import("../../../exporter/latex").then(({LatexExporter}) => {
                            const exporter = new LatexExporter(
                                editor.getDoc({changes: 'acceptAllNoInsertions'}),
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB
                            )
                            exporter.init()
                        })
                    }
                }
            ]
        },
        {
            id: 'settings',
            title: gettext('Settings'),
            tooltip: gettext('Configure settings of this document.'),
            type: 'menu',
            order: 2,
            content: [
                {
                    id: 'citation_style',
                    title: gettext('Citation Style'),
                    type: 'menu',
                    tooltip: gettext('Choose your preferred citation style.'),
                    order: 1,
                    disabled: editor => {
                        return editor.docInfo.access_rights !== 'write'
                    },
                    content: []
                },
                {
                    id: 'document_style',
                    title: gettext('Document Style'),
                    type: 'menu',
                    tooltip: gettext('Choose your preferred document style.'),
                    order: 2,
                    disabled: editor => {
                        return editor.docInfo.access_rights !== 'write'
                    },
                    content: []
                },
                {
                    id: 'language',
                    title: gettext('Text Language'),
                    type: 'menu',
                    tooltip: gettext('Choose the language of the document.'),
                    order: 3,
                    disabled: editor => {
                        return editor.docInfo.access_rights !== 'write'
                    },
                    content: [
                        languageItem('en-US', gettext('English (United States)'), 0),
                        languageItem('en-GB', gettext('English (United Kingdom)'), 1),
                        languageItem('de-DE', gettext('German (Germany)'), 2),
                        languageItem('zh-CN', gettext('Chinese (Simplified)'), 3),
                        languageItem('es', gettext('Spanish'), 4),
                        languageItem('fr', gettext('French'), 5),
                        languageItem('ja', gettext('Japanese'), 6),
                        languageItem('it', gettext('Italian'), 7),
                        languageItem('pl', gettext('Polish'), 8),
                        languageItem('pt-BR', gettext('Portuguese (Brazil)'), 9),
                        languageItem('nl', gettext('Dutch'), 10),
                        languageItem('ru', gettext('Russian'), 11),
                        {
                            type: 'separator',
                            order: 12,
                            available: editor => {
                                // There has to be at least one language of the default languages
                                // among the default ones and one that is not among the default ones.
                                return !!editor.view.state.doc.firstChild.attrs.languages.find(
                                    lang => [
                                        'en-US',
                                        'en-GB',
                                        'de-DE',
                                        'zh-CN',
                                        'es',
                                        'fr',
                                        'ja',
                                        'it',
                                        'pl',
                                        'pt-BR',
                                        'nl',
                                        'ru'
                                    ].includes(lang)
                                ) && !!editor.view.state.doc.firstChild.attrs.languages.find(
                                    lang => ![
                                        'en-US',
                                        'en-GB',
                                        'de-DE',
                                        'zh-CN',
                                        'es',
                                        'fr',
                                        'ja',
                                        'it',
                                        'pl',
                                        'pt-BR',
                                        'nl',
                                        'ru'
                                    ].includes(lang)
                                )

                            }
                        },
                        {
                            title: gettext('Other'),
                            type: 'setting',
                            order: 13,
                            action: editor => {
                                const language = editor.view.state.doc.firstChild.attrs.language,
                                    dialog = new LanguageDialog(editor, language)
                                dialog.init()
                            },
                            selected: editor => {
                                return ![
                                    'en-US',
                                    'en-GB',
                                    'de-DE',
                                    'zh-CN',
                                    'es',
                                    'fr',
                                    'ja',
                                    'it',
                                    'pl',
                                    'pt-BR',
                                    'nl',
                                    'ru'
                                ].includes(
                                    editor.view.state.doc.firstChild.attrs.language
                                )
                            },
                            available: editor => !!editor.view.state.doc.firstChild.attrs.languages.find(
                                lang => ![
                                        'en-US',
                                        'en-GB',
                                        'de-DE',
                                        'zh-CN',
                                        'es',
                                        'fr',
                                        'ja',
                                        'it',
                                        'pl',
                                        'pt-BR',
                                        'nl',
                                        'ru'
                                    ].includes(lang)
                            )
                        }
                    ]
                },
                {
                    id: 'paper_size',
                    title: gettext('Paper Size'),
                    type: 'menu',
                    tooltip: gettext('Choose a papersize for print and PDF generation.'),
                    order: 4,
                    disabled: editor => {
                        return editor.docInfo.access_rights !== 'write'
                    },
                    content: [
                        {
                            title: gettext('DIN A4'),
                            type: 'setting',
                            tooltip: gettext('A4 (DIN A4/ISO 216) which is used in most of the world.'),
                            order: 0,
                            action: editor => {
                                const article = editor.view.state.doc.firstChild
                                const attrs = Object.assign({}, article.attrs)
                                attrs.papersize = 'A4'
                                editor.view.dispatch(
                                    editor.view.state.tr.setNodeMarkup(0, false, attrs).setMeta('settings', true)
                                )
                            },
                            selected: editor => {
                                return editor.view.state.doc.firstChild.attrs.papersize === 'A4'
                            },
                            available: editor => {
                                return editor.view.state.doc.firstChild.attrs.papersizes.includes('A4')
                            }
                        },
                        {
                            title: gettext('US Letter'),
                            type: 'setting',
                            tooltip: gettext('The format used by the USA and some other American countries.'),
                            order: 1,
                            action: editor => {
                                const article = editor.view.state.doc.firstChild
                                const attrs = Object.assign({}, article.attrs)
                                attrs.papersize = 'US Letter'
                                editor.view.dispatch(
                                    editor.view.state.tr.setNodeMarkup(0, false, attrs).setMeta('settings', true)
                                )
                            },
                            selected: editor => {
                                return editor.view.state.doc.firstChild.attrs.papersize === 'US Letter'
                            },
                            available: editor => {
                                return editor.view.state.doc.firstChild.attrs.papersizes.includes('US Letter')
                            }
                        }
                    ]
                }
            ]
        },
        {
            id: 'tools',
            title: gettext('Tools'),
            tooltip: gettext('Select document editing tool.'),
            type: 'menu',
            order: 3,
            content: [
                {
                    title: gettext('Word counter'),
                    type: 'action',
                    tooltip: gettext('See document statistics.'),
                    order: 0,
                    action: editor => {
                        editor.mod.tools.wordCount.wordCountDialog()
                    }
                },
                {
                    title: gettext('Keyboard shortcuts'),
                    type: 'action',
                    tooltip: gettext('Show an overview of available keyboard shortcuts.'),
                    order: 1,
                    keys: 'Shift-Ctrl-/',
                    action: editor => {
                        editor.mod.tools.showKeyBindings.show()
                    }
                }
            ]
        },
        {
            title: gettext('Track changes'),
            type: 'menu',
            tooltip: gettext('Tracking changes to the document'),
            order: 4,
            disabled: editor => {
                return editor.docInfo.access_rights !== 'write'
            },
            content: [
                {
                    title: gettext('Record'),
                    type: 'setting',
                    tooltip: gettext('Record document changes'),
                    order: 0,
                    disabled: editor => {
                        return editor.docInfo.access_rights !== 'write'
                    },
                    action: editor => {
                        const article = editor.view.state.doc.firstChild
                        const attrs = Object.assign({}, article.attrs)
                        attrs.tracked = !attrs.tracked
                        editor.view.dispatch(
                            editor.view.state.tr.setNodeMarkup(0, false, attrs).setMeta('settings', true)
                        )
                    },
                    selected: editor => {
                        return editor.view.state.doc.firstChild.attrs.tracked === true
                    }
                },
                {
                    title: gettext('Accept all'),
                    type: 'action',
                    tooltip: gettext('Accept all tracked changes.'),
                    order: 1,
                    action: editor => {
                        editor.mod.track.acceptAll()
                    }
                },
                {
                    title: gettext('Reject all'),
                    type: 'action',
                    tooltip: gettext('Reject all tracked changes.'),
                    order: 2,
                    action: editor => {
                        editor.mod.track.rejectAll()
                    }
                },
            ]
        }
    ]
})
