import {DocxExporter} from "../../exporter/docx"
import {OdtExporter} from "../../exporter/odt"

export class ModStyles {
    constructor(editor) {
        editor.mod.styles = this
        this.editor = editor
        this.export_templates = []
        this.document_styles = []
        this.citation_styles = []
    }


    setStyles(styles) {
        this.export_templates = styles.export_templates
        this.document_styles = styles.document_styles
        this.citation_styles = styles.citation_styles
        this.addExportTemplateMenuEntries()
        if (this.editor.menu.headerView) {
            this.editor.menu.headerView.update()
        }
    }

    addExportTemplateMenuEntries() {
        let exportMenu = this.editor.menu.headerModel.find(menu => menu.id==='export')
        // Remove any previous entries in case we run this a second time
        exportMenu.content = exportMenu.content.filter(menuItem => menuItem.type!=='export_template')
        let exportMenuEntries = this.export_templates.map(template => {
            if(template.file_type==='docx') {
                return {
                    type: 'export_template',
                    title: `${template.file_name} (DOCX)`,
                    tooltip: gettext('Export the document to a DOCX file with the given template.'),
                    action: editor => {
                        editor.save().then(() => {
                            new DocxExporter(
                                editor.doc,
                                template.template_file,
                                editor.bibDB,
                                editor.imageDB
                            )
                        })
                    }
                }
            } else {
                return {
                    type: 'export_template',
                    title: `${template.file_name} (ODT)`,
                    tooltip: gettext('Export the document to an ODT file with the given template.'),
                    action: editor => {
                        editor.save().then(() => {
                            new OdtExporter(
                                editor.doc,
                                template.template_file,
                                editor.bibDB,
                                editor.imageDB
                            )
                        })
                    }
                }
            }
        })
        exportMenu.content = exportMenu.content.concat(exportMenuEntries)
    }


}
