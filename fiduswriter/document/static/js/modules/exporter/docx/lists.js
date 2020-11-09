import {noSpaceTmp} from "../../common"
import {descendantNodes} from "../tools/doc_content"

const DEFAULT_LISTPARAGRAPH_XML = noSpaceTmp`
    <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:uiPriority w:val="34"/>
    <w:qFormat/>
    <w:rsid w:val="006E68A6"/>
    <w:pPr>
      <w:ind w:left="720"/>
      <w:contextualSpacing/>
    </w:pPr>
    </w:style>
    `

const DEFAULT_NUMBERING_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + noSpaceTmp`
    <w:numbering xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se wp14">
    </w:numbering>
    `


export class DocxExporterLists {
    constructor(exporter, rels, docContent) {
        this.exporter = exporter
        this.rels = rels
        this.docContent = docContent
        this.useBulletList = false
        this.usedNumberedList = []
        this.styleXml = false
        this.numberingXml = false
        this.maxAbstractNumId = -1
        this.maxNumId = 0
        // We only need one bulletType for all bullet lists, but a new
        // numberedType for each numbered list so that the numbering starts in 1
        // each time.
        this.bulletType = false
        this.numberFormat = 'decimal'
        this.numberedTypes = []
        this.styleFilePath = 'word/styles.xml'
        this.numberingFilePath = 'word/numbering.xml'
        this.ctFilePath = "[Content_Types].xml"
    }

    init() {
        this.findLists()
        if (this.usedNumberedList.length > 0 || this.useBulletList) {
            const p = []

            p.push(
                new Promise(resolve => {
                    this.initCt().then(
                        () => resolve()
                    )
                })
            )


            p.push(
                new Promise(resolve => {
                    this.addNumberingXml().then(
                        () => resolve()
                    )
                })
            )


            p.push(
                new Promise((resolve) => {
                    this.addListParagraphStyle().then(
                        () => resolve()
                    )
                })
            )
            return Promise.all(p)
        } else {
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
        const override = this.ctXml.querySelector(`Override[PartName="/${this.numberingFilePath}"]`)
        if (!override) {
            const types = this.ctXml.querySelector('Types')
            types.insertAdjacentHTML('beforeEnd', `<Override PartName="/${this.numberingFilePath}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>`)
        }
    }

    findLists() {
        descendantNodes(this.docContent).forEach(
            node => {
                if (node.type === 'bullet_list') {
                    this.useBulletList = true
                } else if (node.type === 'ordered_list') {
                    this.usedNumberedList.push(node.attrs.order)
                }
            }
        )
    }

    addNumberingXml() {
        return this.exporter.xml.getXml(this.numberingFilePath, DEFAULT_NUMBERING_XML).then(
            numberingXml => {
                this.numberingXml = numberingXml
                this.rels.addNumberingRel()
                this.addUsedListTypes()
                return Promise.resolve()
            }
        )
    }

    addListParagraphStyle() {
        return this.exporter.xml.getXml(this.styleFilePath).then(
            styleXml => {
                this.styleXml = styleXml
                if (!this.styleXml.querySelector(`style[*|styleId="ListParagraph"]`)) {
                    const stylesEl = this.styleXml.querySelector('styles')
                    stylesEl.insertAdjacentHTML('beforeEnd', DEFAULT_LISTPARAGRAPH_XML)
                }
                return Promise.resolve()
            }
        )
    }

    addUsedListTypes() {
        const allAbstractNum = this.numberingXml.querySelectorAll('abstractNum')
        allAbstractNum.forEach(
            abstractNum => {
                // We check the format for the lowest level list and use the first
                // one we find  for 'bullet' or 'not bullet'
                // This means that if a list is defined using anything else than
                // bullets, it will be accepted as the format of
                // the numeric list.
                const levelZeroFormat = abstractNum.querySelector('lvl[*|ilvl="0"] numFmt').getAttribute('w:val')
                const abstractNumId = parseInt(abstractNum.getAttribute('w:abstractNumId'))
                if (levelZeroFormat === 'bullet' && !(this.bulletAbstractType)) {
                    const numEl = this.numberingXml.querySelector(`abstractNumId[*|val="${abstractNumId}"]`).parentElement
                    const numId = parseInt(numEl.getAttribute('w:numId'))
                    this.bulletType = numId
                } else if (levelZeroFormat !== 'bullet' && !(this.numberFormat)) {
                    this.numberFormat = levelZeroFormat
                }
                if (this.maxAbstractNumId < abstractNumId) {
                    this.maxAbstractNumId = abstractNumId
                }

            }
        )
        const allNum = this.numberingXml.querySelectorAll('num')
        allNum.forEach(numEl => {
            const numId = parseInt(numEl.getAttribute('w:val'))
            if (this.maxNumId < numId) {
                this.maxNumId = numId
            }
        })

        if (!(this.bulletType) && this.useBulletList) {
            this.maxNumId++
            this.maxAbstractNumId++
            this.addBulletNumType(this.maxNumId, this.maxAbstractNumId)
            this.bulletType = this.maxNumId
        }
        if (this.usedNumberedList.length > 0) {
            this.maxAbstractNumId++

            this.numberedAbstractType = this.maxAbstractNumId
        }
        for (let i = 0;i < this.usedNumberedList.length;i++) {
            this.maxNumId++
            const numId = this.maxNumId
            this.addNumberedNumType(numId, this.usedNumberedList[i])
            this.numberedTypes.push(numId)
        }

    }

    getBulletType() {
        return this.bulletType
    }

    getNumberedType() {
        return this.numberedTypes.shift()
    }

    addBulletNumType(numId, abstractNumId) {
        const numberingEl = this.numberingXml.querySelector('numbering')
        numberingEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <w:abstractNum w:abstractNumId="${abstractNumId}" w15:restartNumberingAfterBreak="0">
                <w:nsid w:val="3620195A" />
                <w:multiLevelType w:val="hybridMultilevel" />
                <w:tmpl w:val="A74C9E6A" />
            </w:abstractNum>
            <w:num w:numId="${numId}">
                <w:abstractNumId w:val="${abstractNumId}" />
            </w:num>
        `)
        const newAbstractNum = this.numberingXml.querySelector(`abstractNum[*|abstractNumId="${abstractNumId}"]`)
        // Definition seem to always define 9 levels (0-8).
        for (let level = 0; level < 9; level++) {
            newAbstractNum.insertAdjacentHTML('beforeEnd', noSpaceTmp`
                <w:lvl w:ilvl="${level}" w:tplc="04090001" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="${(level + 1) * 720}" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default" />
                    </w:rPr>
                </w:lvl>
            `)
        }

    }

    addNumberedNumType(numId, start) {
        this.maxAbstractNumId++
        this.addNumberedAbstractNumType(this.maxAbstractNumId, start)
        const numberingEl = this.numberingXml.querySelector('numbering')
        numberingEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <w:num w:numId="${numId}">
                <w:abstractNumId w:val="${this.maxAbstractNumId}" />
            </w:num>
        `)
    }

    addNumberedAbstractNumType(abstractNumId, start) {
        const numberingEl = this.numberingXml.querySelector('numbering')
        numberingEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <w:abstractNum w:abstractNumId="${abstractNumId}" w15:restartNumberingAfterBreak="0">
                <w:nsid w:val="7F6635F3" />
                <w:multiLevelType w:val="hybridMultilevel" />
                <w:tmpl w:val="BFFEF214" />
            </w:abstractNum>
        `)
        const newAbstractNum = this.numberingXml.querySelector(`abstractNum[*|abstractNumId="${abstractNumId}"]`)
        // Definition seem to always define 9 levels (0-8).
        for (let level = 0; level < 9; level++) {
            newAbstractNum.insertAdjacentHTML('beforeEnd', noSpaceTmp`
                <w:lvl w:ilvl="${level}" w:tplc="0409000F">
                    <w:start w:val="${start}" />
                    <w:numFmt w:val="${this.numberFormat}" />
                    <w:lvlText w:val="%${level + 1}." />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="${(level + 1) * 720}" w:hanging="360" />
                    </w:pPr>
                </w:lvl>
            `)
        }
    }


}
