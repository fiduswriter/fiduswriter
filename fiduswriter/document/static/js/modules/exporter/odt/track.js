import {noSpaceTmp, escapeText} from "../../common"

export class OdtExporterTracks {
    constructor(exporter) {
        this.exporter = exporter
        this.contentXml = false
        this.trackChangesSection = false
        this.counter = 0
    }

    init() {
        return this.exporter.xml.getXml("content.xml").then(
            contentXml => {
                this.contentXml = contentXml
            }
        )
    }

    checkTrackedChangesSection() {
        const trackChangesSection = this.contentXml.querySelector("tracked-changes")
        if (trackChangesSection) {
            this.trackChangesSection = trackChangesSection
        } else {
            const textElement = this.contentXml.querySelector("text")
            if (!textElement) {
                throw new Error("No text element found in content.xml")
            }
            textElement.insertAdjacentHTML("afterbegin", "<text:tracked-changes></text:tracked-changes>")
            this.trackChangesSection = this.contentXml.querySelector("tracked-changes")
        }
    }

    addChange(trackInfo, deletionString = "") {
        if (!this.trackChangesSection) {
            this.checkTrackedChangesSection()
        }
        const trackId = `ct${Date.now() + this.counter++}`
        const changeXml = noSpaceTmp`
        <text:changed-region xml:id="${trackId}" text:id="${trackId}">
            ${
    trackInfo.type === "deletion" ?
        noSpaceTmp`<text:deletion>
                    <office:change-info>
                        <dc:creator>${escapeText(trackInfo.username)}</dc:creator>
                        <dc:date>${new Date((trackInfo.date) * 60000).toISOString().slice(0, 19)}</dc:date>
                    </office:change-info>
                    ${deletionString}
                </text:deletion>` :
        trackInfo.type === "insertion" ?
            noSpaceTmp`<text:insertion>
        <office:change-info>
            <dc:creator>${escapeText(trackInfo.username)}</dc:creator>
            <dc:date>${new Date((trackInfo.date) * 60000).toISOString().slice(0, 19)}</dc:date>
        </office:change-info>
    </text:insertion>` :
            ""
}
        </text:changed-region>`
        this.trackChangesSection.insertAdjacentHTML(
            "beforeend",
            changeXml
        )
        return trackId
    }
}
