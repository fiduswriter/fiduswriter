import {noSpaceTmp} from "../../common/common"
import {descendantNodes} from "../tools/pmJSON"

let DEFAULT_LISTPARAGRAPH_XML = noSpaceTmp`
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

let DEFAULT_NUMBERING_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + noSpaceTmp`
    <w:numbering xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se wp14">
    </w:numbering>
    `


export class DocxExporterLists {
    constructor(exporter, rels, pmJSON) {
        this.exporter = exporter
        this.rels = rels
        this.pmJSON = pmJSON
        this.useBulletList = false
        this.usedNumberedList = 0
        this.styleXml = false
        this.numberingXml = false
        this.maxAbstractNumId = -1
        this.maxNumId = 0
        // We only need one bulletType for all bullet lists, but a new
        // numberedType for each numbered list so that the numbering starts in 1
        // each time.
        this.bulletType = false
        this.numberedAbstractType = false
        this.numberedTypes = []
        this.styleFilePath = 'word/styles.xml'
        this.numberingFilePath = 'word/numbering.xml'
    }

    init() {
        let that = this
        this.findLists()
        if (this.usedNumberedList > 0 || this.useBulletList) {
            let p = []

            p.push(
                new window.Promise((resolve) => {
                    that.addNumberingXml().then(function(){
                        resolve()
                    })
                })
            )


            p.push(
                new window.Promise((resolve) => {
                    that.addListParagraphStyle().then(function(){
                        resolve()
                    })
                })
            )
            return window.Promise.all(p)
        } else {
            return window.Promise.resolve()
        }
    }

    findLists() {
        let that = this
        descendantNodes(this.pmJSON).forEach(
            function(node) {
                if (node.type==='bullet_list') {
                    that.useBulletList = true
                } else if (node.type==='ordered_list') {
                    that.usedNumberedList += 1
                }
            }
        )
    }

    addNumberingXml() {
        let that = this
        return this.exporter.xml.getXml(this.numberingFilePath, DEFAULT_NUMBERING_XML).then(function(numberingXml) {
            that.numberingXml = numberingXml
            that.rels.addNumberingRel()
            that.addUsedListTypes()
            return window.Promise.resolve()
        })
    }

    addListParagraphStyle() {
        let that = this
        return this.exporter.xml.getXml(this.styleFilePath).then(function(styleXml) {
            that.styleXml = styleXml
            if (!that.styleXml.querySelector(`style[*|styleId="ListParagraph"]`)) {
                let stylesEl = that.styleXml.querySelector('styles')
                stylesEl.insertAdjacentHTML('beforeEnd', DEFAULT_LISTPARAGRAPH_XML)
            }
            return window.Promise.resolve()
        })
    }

    addUsedListTypes() {
        let that = this
        let allAbstractNum = [].slice.call(this.numberingXml.querySelectorAll('abstractNum'))
        allAbstractNum.forEach((abstractNum) => {
            // We check the format for the lowest level list and use the first one we find  for 'bullet' or 'decimal'.
            let levelZeroFormat = abstractNum.querySelector('lvl[*|ilvl="0"] numFmt').getAttribute('w:val')
            let abstractNumId = parseInt(abstractNum.getAttribute('w:abstractNumId'))
            if(levelZeroFormat==='bullet' && !(that.bulletAbstractType)) {
                let numEl = that.numberingXml.querySelector(`abstractNumId[*|val="${abstractNumId}"]`).parentElement
                let numId = parseInt(numEl.getAttribute('w:numId'))
                that.bulletType = numId
            } else if(levelZeroFormat==='decimal' && !(that.numberedAbstractType)) {
                that.numberedAbstractType = abstractNumId
            }
            if(that.maxAbstractNumId < abstractNumId) {
                that.maxAbstractNumId = abstractNumId
            }

        })
        let allNum = [].slice.call(this.numberingXml.querySelectorAll('num'))
        allNum.forEach((numEl) => {
            let numId = parseInt(numEl.getAttribute('w:val'))
            if(that.maxNumId < numId) {
                that.maxNumId = numId
            }
        })

        if(!(this.bulletType) && this.useBulletList) {
            this.maxNumId++
            this.maxAbstractNumId++
            this.addBulletNumType(this.maxNumId, this.maxAbstractNumId)
            this.bulletType = this.maxNumId
        }
        if(!(this.numberedAbstractType) && this.usedNumberedList > 0) {
            this.maxAbstractNumId++
            this.addNumberedAbstractNumType(this.maxAbstractNumId)
            this.numberedAbstractType = this.maxAbstractNumId
        }
        for(let i=0;i<this.usedNumberedList;i++) {
            this.maxNumId++
            let numId = this.maxNumId
            this.addNumberedNumType(numId, this.numberedAbstractType)
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
        let numberingEl = this.numberingXml.querySelector('numbering')
        numberingEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <w:abstractNum w:abstractNumId="${abstractNumId}" w15:restartNumberingAfterBreak="0">
                <w:nsid w:val="3620195A" />
                <w:multiLevelType w:val="hybridMultilevel" />
                <w:tmpl w:val="A74C9E6A" />
                <w:lvl w:ilvl="0" w:tplc="04090001">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="720" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default" />
                    </w:rPr>
                </w:lvl>
                <w:lvl w:ilvl="1" w:tplc="04090003" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="o" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="1440" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default" />
                    </w:rPr>
                </w:lvl>
                <w:lvl w:ilvl="2" w:tplc="04090005" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="2160" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default" />
                    </w:rPr>
                </w:lvl>
                <w:lvl w:ilvl="3" w:tplc="04090001" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="2880" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default" />
                    </w:rPr>
                </w:lvl>
                <w:lvl w:ilvl="4" w:tplc="04090003" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="o" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="3600" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default" />
                    </w:rPr>
                </w:lvl>
                <w:lvl w:ilvl="5" w:tplc="04090005" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="4320" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default" />
                    </w:rPr>
                </w:lvl>
                <w:lvl w:ilvl="6" w:tplc="04090001" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="5040" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default" />
                    </w:rPr>
                </w:lvl>
                <w:lvl w:ilvl="7" w:tplc="04090003" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="o" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="5760" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default" />
                    </w:rPr>
                </w:lvl>
                <w:lvl w:ilvl="8" w:tplc="04090005" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="bullet" />
                    <w:lvlText w:val="" />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="6480" w:hanging="360" />
                    </w:pPr>
                    <w:rPr>
                        <w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default" />
                    </w:rPr>
                </w:lvl>
                </w:abstractNum>
            <w:num w:numId="${numId}">
                <w:abstractNumId w:val="${abstractNumId}" />
            </w:num>
        `)
    }

    addNumberedNumType(numId, abstractNumId) {
        let numberingEl = this.numberingXml.querySelector('numbering')
        numberingEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <w:num w:numId="${numId}">
                <w:abstractNumId w:val="${abstractNumId}" />
            </w:num>
        `)
    }

    addNumberedAbstractNumType(abstractNumId) {
        let numberingEl = this.numberingXml.querySelector('numbering')
        numberingEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <w:abstractNum w:abstractNumId="${abstractNumId}" w15:restartNumberingAfterBreak="0">
                <w:nsid w:val="7F6635F3" />
                <w:multiLevelType w:val="hybridMultilevel" />
                <w:tmpl w:val="BFFEF214" />
                <w:lvl w:ilvl="0" w:tplc="0409000F">
                    <w:start w:val="1" />
                    <w:numFmt w:val="decimal" />
                    <w:lvlText w:val="%1." />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="720" w:hanging="360" />
                    </w:pPr>
                </w:lvl>
                <w:lvl w:ilvl="1" w:tplc="04090019" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="lowerLetter" />
                    <w:lvlText w:val="%2." />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="1440" w:hanging="360" />
                    </w:pPr>
                </w:lvl>
                <w:lvl w:ilvl="2" w:tplc="0409001B" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="lowerRoman" />
                    <w:lvlText w:val="%3." />
                    <w:lvlJc w:val="right" />
                    <w:pPr>
                        <w:ind w:left="2160" w:hanging="180" />
                    </w:pPr>
                </w:lvl>
                <w:lvl w:ilvl="3" w:tplc="0409000F" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="decimal" />
                    <w:lvlText w:val="%4." />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="2880" w:hanging="360" />
                    </w:pPr>
                </w:lvl>
                <w:lvl w:ilvl="4" w:tplc="04090019" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="lowerLetter" />
                    <w:lvlText w:val="%5." />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="3600" w:hanging="360" />
                    </w:pPr>
                </w:lvl>
                <w:lvl w:ilvl="5" w:tplc="0409001B" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="lowerRoman" />
                    <w:lvlText w:val="%6." />
                    <w:lvlJc w:val="right" />
                    <w:pPr>
                        <w:ind w:left="4320" w:hanging="180" />
                    </w:pPr>
                </w:lvl>
                <w:lvl w:ilvl="6" w:tplc="0409000F" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="decimal" />
                    <w:lvlText w:val="%7." />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="5040" w:hanging="360" />
                    </w:pPr>
                </w:lvl>
                <w:lvl w:ilvl="7" w:tplc="04090019" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="lowerLetter" />
                    <w:lvlText w:val="%8." />
                    <w:lvlJc w:val="left" />
                    <w:pPr>
                        <w:ind w:left="5760" w:hanging="360" />
                    </w:pPr>
                </w:lvl>
                <w:lvl w:ilvl="8" w:tplc="0409001B" w:tentative="1">
                    <w:start w:val="1" />
                    <w:numFmt w:val="lowerRoman" />
                    <w:lvlText w:val="%9." />
                    <w:lvlJc w:val="right" />
                    <w:pPr>
                        <w:ind w:left="6480" w:hanging="180" />
                    </w:pPr>
                </w:lvl>
            </w:abstractNum>
        `)
    }


}
