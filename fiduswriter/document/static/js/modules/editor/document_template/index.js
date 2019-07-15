import bowser from "bowser"
import {Dialog} from "../../common"

export class ModDocumentTemplate {
    constructor(editor) {
        editor.mod.documentTemplate = this
        this.editor = editor
        this.exportTemplates = []
        this.documentStyles = []
        this.citationStyles = []
        this.citationLocales = []
    }


    setStyles(styles) {
        this.exportTemplates = styles.export_templates
        this.documentStyles = styles.document_styles
        this.citationStyles = styles.citation_styles
        this.citationLocales = styles.citation_locales
        this.addExportTemplateMenuEntries()
        this.addDocumentStylesMenuEntries()
        this.addCitationStylesMenuEntries()
        if (this.editor.menu.headerView) {
            this.editor.menu.headerView.update()
        }
    }

    addDocPartSettings() {
        const hideableDocParts = []
        this.editor.view.state.doc.firstChild.forEach((child, offset, index) => {
            if (child.attrs.optional) {
                hideableDocParts.push([child, index])
            }
        })
        if (!hideableDocParts.length) {
            return
        }
        const metadataMenu = {
            id: 'metadata',
            title: gettext('Optional sections'),
            type: 'menu',
            tooltip: gettext('Choose which optional sections to enable.'),
            order: 0,
            disabled: editor => editor.docInfo.access_rights !== 'write',
            content: hideableDocParts.map(([node, index]) => ({
                title: node.attrs.title,
                type: 'setting',
                tooltip: `${gettext('Show/hide')} ${node.attrs.title}`,
                order: index,
                action: editor => {
                    let offset = 1, // We need to add one as we are looking at offset values within the firstChild
                        attrs
                    editor.view.state.doc.firstChild.forEach((docNode, docNodeOffset) => {
                        if (docNode.attrs.id===node.attrs.id) {
                            offset += docNodeOffset
                            attrs = Object.assign({}, docNode.attrs)
                            attrs.hidden = (!attrs.hidden)
                        }
                    })
                    editor.view.dispatch(
                        editor.view.state.tr.setNodeMarkup(offset, false, attrs).setMeta('settings', true)
                    )
                },
                selected: editor => !editor.view.state.doc.firstChild.child(index).attrs.hidden
            }))
        }
        const settingsMenu = this.editor.menu.headerbarModel.content.find(menu => menu.id==='settings')
        settingsMenu.content.unshift(metadataMenu)
    }

    showSafariErrorMessage() {
        const dialog = new Dialog({
            title: gettext('Safari bug warning'),
            height: 100,
            body: gettext('Unfortunately Safari has a bug which makes it impossible to export to this format. Please use Chrome or Firefox (on a desktop computer).'),
            buttons: [{type: 'close'}]
        })
        dialog.open()
    }

    addExportTemplateMenuEntries() {
        const exportMenu = this.editor.menu.headerbarModel.content.find(menu => menu.id==='export')
        // Remove any previous entries in case we run this a second time
        exportMenu.content = exportMenu.content.filter(menuItem => menuItem.class!=='export_template')
        const exportMenuEntries = this.exportTemplates.map(template => {
            if (template.file_type==='docx') {
                return {
                    class: 'export_template',
                    title: `${template.file_name} (DOCX)`,
                    type: 'action',
                    tooltip: gettext('Export the document to a DOCX file with the given template.'),
                    action: editor => {
                        if (bowser.safari) {
                            this.showSafariErrorMessage()
                            return
                        }
                        import("../../exporter/docx").then(({DocxExporter}) => {
                            const exporter = new DocxExporter(
                                editor.getDoc({changes: 'acceptAllNoInsertions'}),
                                template.template_file,
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB,
                                editor.mod.documentTemplate.citationStyles,
                                editor.mod.documentTemplate.citationLocales,
                                editor.staticUrl
                            )
                            exporter.init()
                        })
                    }
                }
            } else {
                return {
                    class: 'export_template',
                    title: `${template.file_name} (ODT)`,
                    type: 'action',
                    tooltip: gettext('Export the document to an ODT file with the given template.'),
                    action: editor => {
                        if (bowser.safari) {
                            this.showSafariErrorMessage()
                            return
                        }
                        import("../../exporter/odt").then(({OdtExporter}) => {
                            const exporter = new OdtExporter(
                                editor.getDoc({changes: 'acceptAllNoInsertions'}),
                                template.template_file,
                                editor.mod.db.bibDB,
                                editor.mod.db.imageDB,
                                editor.mod.documentTemplate.citationStyles,
                                editor.mod.documentTemplate.citationLocales
                            )
                            exporter.init()
                        })
                    }
                }
            }
        })
        exportMenu.content = exportMenu.content.concat(exportMenuEntries)
    }

    addDocumentStylesMenuEntries() {
        const settingsMenu = this.editor.menu.headerbarModel.content.find(menu => menu.id==='settings'),
            documentStyleMenu = settingsMenu.content.find(menu => menu.id==='document_style')

        documentStyleMenu.content = this.documentStyles.map(docStyle => {
            return {
                title: docStyle.title,
                type: 'setting',
                action: editor => {
                    const article = editor.view.state.doc.firstChild
                    const attrs = Object.assign({}, article.attrs)
                    attrs.documentstyle = docStyle.filename
                    editor.view.dispatch(
                        editor.view.state.tr.setNodeMarkup(0, false, attrs).setMeta('settings', true)
                    )
                },
                selected: editor => {
                    return editor.view.state.doc.firstChild.attrs.documentstyle === docStyle.filename
                }
            }
        })
    }

    addCitationStylesMenuEntries() {
        const settingsMenu = this.editor.menu.headerbarModel.content.find(menu => menu.id==='settings'),
            citationStyleMenu = settingsMenu.content.find(menu => menu.id==='citation_style')

        citationStyleMenu.content = this.citationStyles.map(citeStyle => {
            return {
                title: citeStyle.title,
                type: 'setting',
                action: editor => {
                    const article = editor.view.state.doc.firstChild
                    const attrs = Object.assign({}, article.attrs)
                    attrs.citationstyle = citeStyle.short_title
                    editor.view.dispatch(
                        editor.view.state.tr.setNodeMarkup(0, false, attrs).setMeta('settings', true)
                    )
                },
                selected: editor => {
                    return editor.view.state.doc.firstChild.attrs.citationstyle === citeStyle.short_title
                }
            }
        })
    }

}
