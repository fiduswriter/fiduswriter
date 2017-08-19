import {DocumentAccessRightsDialog} from "../../documents/access-rights"
import {SaveRevision, SaveCopy} from "../../exporter/native"
import {ExportFidusFile} from "../../exporter/native/file"
import {LatexExporter} from "../../exporter/latex"
import {HTMLExporter} from "../../exporter/html"
import {EpubExporter} from "../../exporter/epub"
import {RevisionDialog} from "./dialogs"
import {READ_ONLY_ROLES, COMMENT_ONLY_ROLES} from ".."

export let headerbarModel = {
    open: true, // Whether the menu is shown at all.
    content: [
        {
            id: 'file',
            title: gettext('File'),
            tooltip: gettext('File handling'),
            content: [
                {
                    title: gettext('Share'),
                    icon: 'export',
                    tooltip: gettext('Share the document with other users.'),
                    action: editor => {
                        new DocumentAccessRightsDialog(
                            [editor.docInfo.id],
                            editor.docInfo.collaborators,
                            editor.docInfo.owner.team_members,
                            newCollaborators => {
                                editor.docInfo.collaborators = newCollaborators
                            },
                            memberData => {
                                editor.user.team_members.push(memberData)
                            }
                        )
                    },
                    disabled: editor => {
                        return !editor.docInfo.is_owner
                    }
                },
                {
                    title: gettext('Close'),
                    icon: 'cancel-circle',
                    tooltip: gettext('Close the document and return to the document overview menu.'),
                    action: editor => {
                        window.location.href = '/'
                    }
                },
                {
                    title: gettext('Save revision'),
                    icon: 'export',
                    tooltip: gettext('Save a revision of the current document.'),
                    keys: 'Ctrl-s',
                    action: editor => {
                        let dialog = new RevisionDialog()
                        dialog.init().then(
                            note => {
                                let saver = new SaveRevision(
                                    editor.getDoc(),
                                    editor.mod.db.imageDB,
                                    editor.mod.db.bibDB,
                                    note
                                )
                                return saver.init()
                            }
                        )
                    },
                    disabled: editor => READ_ONLY_ROLES.includes(editor.docInfo.access_rights)
                },
                {
                    title: gettext('Create Copy'),
                    icon: 'floppy',
                    tooltip: gettext('Create copy of the current document.'),
                    action: editor => {
                        let doc = editor.getDoc(),
                            copier = new SaveCopy(
                                doc,
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB,
                                editor.user
                            )
                        copier.init().then(({doc, docInfo}) =>
                            window.location.href = `/document/${docInfo.id}/`
                        )
                    }
                },
                {
                    title: gettext('Download'),
                    icon: 'download',
                    tooltip: gettext('Download the current document.'),
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
                    icon: 'print',
                    tooltip: gettext('Either print or create a PDF using your browser print dialog.'),
                    keys: 'Ctrl-p',
                    action: editor => {
                        editor.mod.tools.print.print()
                    }
                }
            ]
        },
        {
            id: 'export',
            title: gettext('Export'),
            tooltip: gettext('Export of the document contents'),
            content: [
                {
                    title: gettext('HTML'),
                    tooltip: gettext('Export the document to an HTML file.'),
                    action: editor => {
                        new HTMLExporter(
                            editor.getDoc(),
                            editor.mod.db.bibDB,
                            editor.mod.db.imageDB,
                            editor.mod.styles.citationStyles,
                            editor.mod.styles.citationLocales
                        )
                    }
                },
                {
                    title: gettext('Epub'),
                    tooltip: gettext('Export the document to an Epub electronic reader file.'),
                    action: editor => {
                        new EpubExporter(
                            editor.getDoc(),
                            editor.mod.db.bibDB,
                            editor.mod.db.imageDB,
                            editor.mod.styles.citationStyles,
                            editor.mod.styles.citationLocales
                        )
                    }
                },
                {
                    title: gettext('LaTeX'),
                    tooltip: gettext('Export the document to an LaTeX file.'),
                    action: editor => {
                        new LatexExporter(
                            editor.getDoc(),
                            editor.mod.db.bibDB,
                            editor.mod.db.imageDB
                        )
                    }
                }
            ]
        },
        {
            id: 'citation_style',
            title: gettext('Citation Style'),
            tooltip: gettext('Choose your preferred citation style.'),
            disabled: editor => {
                return READ_ONLY_ROLES.includes(editor.docInfo.access_rights)
            },
            content: []
        },
        {
            id: 'document_style',
            title: gettext('Document Style'),
            tooltip: gettext('Choose your preferred document style.'),
            disabled: editor => {
                return READ_ONLY_ROLES.includes(editor.docInfo.access_rights)
            },
            content: []
        },
        {
            id: 'paper_size',
            title: gettext('Paper Size'),
            tooltip: gettext('Choose a papersize for printing and PDF generation.'),
            disabled: editor => {
                return READ_ONLY_ROLES.includes(editor.docInfo.access_rights)
            },
            content: [
                {
                    title: gettext('DIN A4'),
                    tooltip: gettext('A4 (DIN A4/ISO 216) which is used in most of the world.'),
                    action: editor => {
                        let article = editor.view.state.doc.firstChild
                        let attrs = Object.assign({}, article.attrs)
                        attrs.papersize = 'A4'
                        editor.view.dispatch(
                            editor.view.state.tr.setNodeType(0, false, attrs)
                        )
                    },
                    selected: editor => {
                        return editor.view.state.doc.firstChild.attrs.papersize === 'A4'
                    }
                },
                {
                    title: gettext('US Letter'),
                    tooltip: gettext('The format used by the USA and some other American countries.'),
                    action: editor => {
                        let article = editor.view.state.doc.firstChild
                        let attrs = Object.assign({}, article.attrs)
                        attrs.papersize = 'US Letter'
                        editor.view.dispatch(
                            editor.view.state.tr.setNodeType(0, false, attrs)
                        )
                    },
                    selected: editor => {
                        return editor.view.state.doc.firstChild.attrs.papersize === 'US Letter'
                    }
                }
            ]
        },
        {
            id: 'metadata',
            title: gettext('Metadata'),
            tooltip: gettext('Choose which metadata to enable.'),
            disabled: editor => {
                return READ_ONLY_ROLES.includes(editor.docInfo.access_rights)
            },
            content: [
                {
                    title: gettext('Subtitle'),
                    tooltip: gettext('Define a subtitle in addition to the title of the document.'),
                    action: editor => {
                        let offset = 1, // We need to add one as we are looking at offset values within the firstChild
                            attrs
                        editor.view.state.doc.firstChild.forEach((node, nodeOffset) => {
                            if (node.type.name==='subtitle') {
                                offset += nodeOffset
                                attrs = Object.assign({}, node.attrs)
                                attrs.hidden = (!attrs.hidden)
                            }
                        })
                        editor.view.dispatch(
                            editor.view.state.tr.setNodeType(offset, false, attrs)
                        )
                    },
                    selected: editor => {
                        return !editor.view.state.doc.firstChild.child(1).attrs.hidden
                    }
                },
                {
                    title: gettext('Author(s)'),
                    tooltip: gettext('Specify the authors of the document.'),
                    action: editor => {
                        let offset = 1, // We need to add one as we are looking at offset values within the firstChild
                            attrs
                        editor.view.state.doc.firstChild.forEach((node, nodeOffset) => {
                            if (node.type.name==='authors') {
                                offset += nodeOffset
                                attrs = Object.assign({}, node.attrs)
                                attrs.hidden = (!attrs.hidden)
                            }
                        })
                        editor.view.dispatch(
                            editor.view.state.tr.setNodeType(offset, false, attrs)
                        )
                    },
                    selected: editor => {
                        return !editor.view.state.doc.firstChild.child(2).attrs.hidden
                    }
                },
                {
                    title: gettext('Abstract'),
                    tooltip: gettext('Add an abstract to the document.'),
                    action: editor => {
                        let offset = 1, // We need to add one as we are looking at offset values within the firstChild
                            attrs
                        editor.view.state.doc.firstChild.forEach((node, nodeOffset) => {
                            if (node.type.name==='abstract') {
                                offset += nodeOffset
                                attrs = Object.assign({}, node.attrs)
                                attrs.hidden = (!attrs.hidden)
                            }
                        })
                        editor.view.dispatch(
                            editor.view.state.tr.setNodeType(offset, false, attrs)
                        )
                    },
                    selected: editor => {
                        return !editor.view.state.doc.firstChild.child(3).attrs.hidden
                    }
                },
                {
                    title: gettext('Keywords'),
                    tooltip: gettext('Add keywords to facilitate categorization.'),
                    action: editor => {
                        let offset = 1, // We need to add one as we are looking at offset values within the firstChild
                            attrs
                        editor.view.state.doc.firstChild.forEach((node, nodeOffset) => {
                            if (node.type.name==='keywords') {
                                offset += nodeOffset
                                attrs = Object.assign({}, node.attrs)
                                attrs.hidden = (!attrs.hidden)
                            }
                        })
                        editor.view.dispatch(
                            editor.view.state.tr.setNodeType(offset, false, attrs)
                        )
                    },
                    selected: editor => {
                        return !editor.view.state.doc.firstChild.child(4).attrs.hidden
                    }
                }
            ]
        },
        {
            id: 'tools',
            title: gettext('Tools'),
            tooltip: gettext('Select document editing tool.'),
            content: [
                {
                    title: gettext('Word counter'),
                    tooltip: gettext('See document statistics.'),
                    action: editor => {
                        editor.mod.tools.wordCount.wordCountDialog()
                    }
                },
                {
                    title: gettext('Keyboard shortcuts'),
                    tooltip: gettext('Show an overview of available keyboard shortcuts.'),
                    keys: 'Shift-Ctrl-/',
                    action: editor => {
                        editor.mod.tools.showKeyBindings.show()
                    }
                }
            ]
        }
    ]
}
