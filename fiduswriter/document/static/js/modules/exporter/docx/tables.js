import {noSpaceTmp} from "../../common"

const DEFAULT_TABLENORMAL_XML = noSpaceTmp`
    <w:style w:type="table" w:default="1" w:styleId="TableNormal">
        <w:name w:val="Normal Table"/>
        <w:uiPriority w:val="99"/>
        <w:semiHidden/>
        <w:unhideWhenUsed/>
        <w:tblPr>
          <w:tblInd w:w="0" w:type="dxa"/>
          <w:tblCellMar>
            <w:top w:w="0" w:type="dxa"/>
            <w:left w:w="108" w:type="dxa"/>
            <w:bottom w:w="0" w:type="dxa"/>
            <w:right w:w="108" w:type="dxa"/>
          </w:tblCellMar>
        </w:tblPr>
    </w:style>
    `

const DEFAULT_TABLEGRID_XML = tableNormalStyle => noSpaceTmp`
    <w:style w:type="table" w:styleId="TableGrid">
        <w:name w:val="Table Grid"/>
        <w:basedOn w:val="${tableNormalStyle}"/>
        <w:uiPriority w:val="39"/>
        <w:pPr>
            <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        </w:pPr>
        <w:tblPr>
            <w:hMerge/>
            <w:vMerge/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>

            </w:tblBorders>
        </w:tblPr>


    </w:style>
    `

export class DocxExporterTables {
    constructor(exporter) {
        this.exporter = exporter
        this.sideMargins = false
        this.tableGridStyle = false
        this.tableNormalStyle = false
        this.styleXml = false
        this.styleFilePath = 'word/styles.xml'
    }

    init() {
        return this.exporter.xml.getXml(this.styleFilePath).then(
            styleXml => {
                this.styleXml = styleXml
                return Promise.resolve()
            }
        )
    }

    addTableNormalStyle() {
        if (this.tableNormalStyle) {
            // already added
            return
        }
        const tableNormalEl = this.styleXml.querySelector(`style[*|type="table"][*|default="1"]`)
        if (tableNormalEl) {
            this.tableNormalStyle = tableNormalEl.getAttribute('w:styleId')
        } else {
            const stylesEl = this.styleXml.querySelector('styles')
            stylesEl.insertAdjacentHTML('beforeEnd', DEFAULT_TABLENORMAL_XML)
            this.tableNormalStyle = 'TableNormal'
        }
    }

    addTableGridStyle() {
        if (this.tableGridStyle) {
            // already added
            return
        }
        this.addTableNormalStyle()
        const tableGridEl = this.styleXml.querySelector('style[*|type="table"][*|customStyle="1"]')
        if (tableGridEl) {
            this.tableGridStyle = tableGridEl.getAttribute('w:styleId')
        } else {
            const stylesEl = this.styleXml.querySelector('styles')
            stylesEl.insertAdjacentHTML('beforeEnd', DEFAULT_TABLEGRID_XML(this.tableNormalStyle))
            this.tableGridStyle = 'TableGrid'
        }
    }

    getSideMargins() {
        if (!this.sideMargins) {
            const marginsEl = this.styleXml.querySelector(`style[*|styleId="${this.tableGridStyle}"]`)
            const leftEl = marginsEl.querySelector('left')
            const rightEl = marginsEl.querySelector('right')
            const left = parseInt(leftEl.getAttribute('w:w'))
            const right = parseInt(rightEl.getAttribute('w:w'))
            this.sideMargins = (left + right) * 635
        }
        return this.sideMargins
    }

}
