import {noSpaceTmp} from "../../common/common"

let DEFAULT_TABLENORMAL_XML = noSpaceTmp`
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

let DEFAULT_TABLEGRID_XML = noSpaceTmp`
    <w:style w:type="table" w:styleId="TableGrid">
        <w:name w:val="Table Grid"/>
        <w:basedOn w:val="TableNormal"/>
        <w:uiPriority w:val="39"/>
        <w:pPr>
            <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        </w:pPr>
        <w:tblPr>
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
        this.addedTableGridStyle = false
        this.addedTableNormalStyle = false
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
        if (this.addTableNormalStyle) {
            // already added
            return
        }
        if (!this.styleXml.querySelector(`style[*|styleId="TableNormal"]`)) {
            let stylesEl = this.styleXml.querySelector('styles')
            stylesEl.insertAdjacentHTML('beforeEnd', DEFAULT_TABLENORMAL_XML)
        }
        this.addTableNormalStyle = true
    }

    addTableGridStyle() {
        this.addTableNormalStyle()

        if (this.addTableGridStyle) {
            // already added
            return
        }
        if (!this.styleXml.querySelector('style[*|styleId="TableGrid"]')) {
            let stylesEl = this.styleXml.querySelector('styles')
            stylesEl.insertAdjacentHTML('beforeEnd', DEFAULT_TABLEGRID_XML)
        }
        this.addTableGridStyle = true
    }

    getSideMargins() {
        if (!this.sideMargins) {
            let marginsEl = this.styleXml.querySelector('style[*|styleId="TableGrid"]')
            if (!marginsEl) {
                marginsEl = this.styleXml.querySelector('style[*|styleId="TableNormal"] tblCellMar')
            }
            let leftEl = marginsEl.querySelector('left')
            let rightEl = marginsEl.querySelector('right')
            let left = parseInt(leftEl.getAttribute('w:w'))
            let right = parseInt(rightEl.getAttribute('w:w'))
            this.sideMargins = (left + right) * 635
        }
        return this.sideMargins
    }

}
