import {DocxExporterRels} from "./rels"
import {DocxExporterCitations} from "./citations"
import {DocxExporterImages} from "./images"
import {DocxExporterLists} from "./lists"
import {DocxExporterRichtext} from "./richtext"
import {noSpaceTmp} from "../../common"
import {descendantNodes} from "../tools/doc_content"

const DEFAULT_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + noSpaceTmp`
    <w:footnotes xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" mc:Ignorable="w14 wp14">
        <w:footnote w:id="0" w:type="separator">
            <w:p>
                <w:r>
                    <w:separator />
                </w:r>
            </w:p>
        </w:footnote>
        <w:footnote w:id="1" w:type="continuationSeparator">
            <w:p>
                <w:r>
                    <w:continuationSeparator />
                </w:r>
            </w:p>
        </w:footnote>
    </w:footnotes>
    `

const DEFAULT_SETTINGS_XML = noSpaceTmp`
    <w:footnotePr>
        <w:numFmt w:val="decimal"/>
        <w:footnote w:id="0"/>
        <w:footnote w:id="1"/>
    </w:footnotePr>
    `

const DEFAULT_STYLE_FOOTNOTE = noSpaceTmp`
    <w:style w:type="paragraph" w:styleId="Footnote">
        <w:name w:val="Footnote Text" />
        <w:basedOn w:val="Normal" />
        <w:pPr>
            <w:suppressLineNumbers />
            <w:ind w:left="339" w:hanging="339" />
        </w:pPr>
        <w:rPr>
            <w:sz w:val="20" />
            <w:szCs w:val="20" />
        </w:rPr>
    </w:style>
    `

const DEFAULT_STYLE_FOOTNOTE_ANCHOR = noSpaceTmp`
    <w:style w:type="character" w:styleId="FootnoteAnchor">
        <w:name w:val="Footnote Anchor" />
        <w:rPr>
            <w:vertAlign w:val="superscript" />
        </w:rPr>
    </w:style>
    `


export class DocxExporterFootnotes {
    constructor(exporter, docContent) {
        this.exporter = exporter
        this.docContent = docContent
        this.fnPmJSON = false
        this.images = false
        this.citations = false
        this.footnotes = [] // footnotes
        this.fnXml = false
        this.ctXml = false
        this.styleXml = false
        this.filePath = 'word/footnotes.xml'
        this.ctFilePath = "[Content_Types].xml"
        this.settingsFilePath = 'word/settings.xml'
        this.styleFilePath = 'word/styles.xml'
    }

    init() {
        this.findFootnotes()
        if (this.footnotes.length || (this.exporter.citations.citFm.citationType === 'note' && this.exporter.citations.citInfos.length)) {
            this.convertFootnotes()
            this.rels = new DocxExporterRels(this.exporter, 'footnotes')
            // Include the citinfos from the main body document so that they will be
            // used for calculating the bibliography as well
            this.citations = new DocxExporterCitations(
                this.exporter,
                this.exporter.bibDB,
                this.exporter.csl,
                this.fnPmJSON,
                this.exporter.citations.citInfos
            )

            this.images = new DocxExporterImages(
                this.exporter,
                this.exporter.imageDB,
                this.rels,
                this.fnPmJSON
            )
            this.lists = new DocxExporterLists(
                this.exporter,
                this.rels,
                this.fnPmJSON
            )

            return this.citations.init().then(
                () => {
                    // Replace the main bibliography with the new one that
                    // includes both citations in main document
                    // and in the footnotes.
                    this.exporter.pmBib = this.citations.pmBib
                    return this.rels.init()
                }
            ).then(
                () => this.images.init()
            ).then(
                () => this.lists.init()
            ).then(
                () => this.initCt()
            ).then(
                () => this.setSettings()
            ).then(
                () => this.addStyles()
            ).then(
                () => this.createXml()
            )
        } else {
            // No footnotes were found.
            return Promise.resolve()
        }
    }

    initCt() {
        return this.exporter.xml.getXml(this.ctFilePath).then(ctXml => {
            this.ctXml = ctXml
            this.addRelsToCt()
            return Promise.resolve()
        })
    }

    addRelsToCt() {
        const override = this.ctXml.querySelector(`Override[PartName="/${this.filePath}"]`)
        if (!override) {
            const types = this.ctXml.querySelector('Types')
            types.insertAdjacentHTML('beforeEnd', `<Override PartName="/${this.filePath}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>`)
        }
    }

    addStyles() {
        return this.exporter.xml.getXml(this.styleFilePath).then(
            styleXml => {
                this.styleXml = styleXml
                this.addStyle('Footnote', DEFAULT_STYLE_FOOTNOTE)
                this.addStyle('FootnoteAnchor', DEFAULT_STYLE_FOOTNOTE_ANCHOR)
                return Promise.resolve()
            }
        )
    }

    addStyle(styleName, xml) {
        if (!this.styleXml.querySelector(`style[*|styleId="${styleName}"]`)) {
            const stylesEl = this.styleXml.querySelector('styles')
            stylesEl.insertAdjacentHTML('beforeEnd', xml)
        }
    }

    findFootnotes() {
        descendantNodes(this.docContent).forEach(
            node => {
                if (node.type === 'footnote') {
                    this.footnotes.push(node.attrs.footnote)
                }
            }
        )
    }

    convertFootnotes() {
        const fnContent = []
        this.footnotes.forEach(
            footnote => {
                fnContent.push({
                    type: 'footnotecontainer',
                    content: footnote
                })
            }
        )
        this.fnPmJSON = {
            type: 'doc',
            content: fnContent
        }
    }

    createXml() {
        this.richtext = new DocxExporterRichtext(
            this.exporter,
            this.rels,
            this.citations,
            this.images
        )
        this.fnXml = this.richtext.transformRichtext(this.fnPmJSON)
        // TODO: add max dimensions
        this.exporter.rels.addFootnoteRel()
        return this.exporter.xml.getXml(this.filePath, DEFAULT_XML).then(
            xml => {
                const footnotesEl = xml.querySelector('footnotes')
                footnotesEl.insertAdjacentHTML('beforeEnd', this.fnXml)
                this.xml = xml
            }
        )
    }

    setSettings() {
        return this.exporter.xml.getXml(this.settingsFilePath).then(
            settingsXml => {
                const footnotePr = settingsXml.querySelector('footnotePr')
                if (!footnotePr) {
                    const settingsEl = settingsXml.querySelector('settings')
                    settingsEl.insertAdjacentHTML('beforeEnd', DEFAULT_SETTINGS_XML)
                }
                this.settingsXml = settingsXml
                return Promise.resolve()
            }
        )
    }

}
