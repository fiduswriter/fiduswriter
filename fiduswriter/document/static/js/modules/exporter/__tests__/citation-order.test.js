import {beforeAll, describe, expect, it} from "@jest/globals"

describe("Citation ordering with footnotes", () => {
    let DOCXExporterCitations, ODTExporterCitations
    let mockCsl, mockBibDB, mockSettings, mockStyles

    beforeAll(async () => {
        const docxMod = await import("../../exporter/docx/citations.js")
        DOCXExporterCitations = docxMod.DOCXExporterCitations
        const odtMod = await import("../../exporter/odt/citations.js")
        ODTExporterCitations = odtMod.ODTExporterCitations

        mockCsl = {
            getEngine: () =>
                Promise.resolve({
                    cslXml: {dataObj: {attrs: {class: "in-text"}}},
                    updateItems: () => {},
                    appendCitationCluster: citation => {
                        const index = citation.properties.noteIndex - 1
                        return [[index, `(Citation ${index})`]]
                    },
                    makeCitationCluster: () => "",
                    makeBibliography: () => false
                })
        }
        mockBibDB = {}
        mockSettings = {citationstyle: "apa", language: "en-US"}
        mockStyles = {addReferenceStyle: () => {}}
    })

    it("splices citInfos parallel to citationTexts for ODT footnote citations", async () => {
        const docContent = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        {type: "citation", attrs: {references: [{id: 1}]}},
                        {type: "citation", attrs: {references: [{id: 2}]}}
                    ]
                },
                {
                    type: "footnote",
                    attrs: {
                        footnote: [
                            {type: "citation", attrs: {references: [{id: 3}]}}
                        ]
                    }
                }
            ]
        }

        const bodyCitations = new ODTExporterCitations(
            docContent,
            mockSettings,
            mockStyles,
            mockBibDB,
            mockCsl
        )
        // Avoid DOM-dependent conversion; we only need to verify array splicing.
        bodyCitations.convertCitations = () => {}
        await bodyCitations.init()

        expect(bodyCitations.citInfos.map(c => c.references[0].id)).toEqual([
            1, 2
        ])
        expect(bodyCitations.citationTexts.length).toBe(2)

        const footnoteDocContent = {
            type: "doc",
            content: [
                {
                    type: "footnotecontainer",
                    content: [
                        {type: "citation", attrs: {references: [{id: 3}]}}
                    ]
                }
            ]
        }

        const fnCitations = new ODTExporterCitations(
            footnoteDocContent,
            mockSettings,
            mockStyles,
            mockBibDB,
            mockCsl,
            bodyCitations.citInfos
        )
        fnCitations.convertCitations = () => {}
        await fnCitations.init()

        // After splicing, footnote citInfos should only contain footnote citations
        expect(fnCitations.citInfos.map(c => c.references[0].id)).toEqual([3])
        expect(fnCitations.citationTexts.length).toBe(1)

        // The arrays must be parallel
        expect(fnCitations.citInfos.length).toBe(
            fnCitations.citationTexts.length
        )
    })

    it("splices citInfos parallel to citationTexts for DOCX footnote citations", async () => {
        const docContent = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        {type: "citation", attrs: {references: [{id: 1}]}},
                        {type: "citation", attrs: {references: [{id: 2}]}}
                    ]
                },
                {
                    type: "footnote",
                    attrs: {
                        footnote: [
                            {type: "citation", attrs: {references: [{id: 3}]}}
                        ]
                    }
                }
            ]
        }

        const mockXml = {
            getXml: () =>
                Promise.resolve({
                    query: () => null
                })
        }

        const bodyCitations = new DOCXExporterCitations(
            docContent,
            mockSettings,
            mockBibDB,
            mockCsl,
            mockXml
        )
        bodyCitations.convertCitations = () => {}
        await bodyCitations.init()

        expect(bodyCitations.citInfos.map(c => c.references[0].id)).toEqual([
            1, 2
        ])
        expect(bodyCitations.citationTexts.length).toBe(2)

        const footnoteDocContent = {
            type: "doc",
            content: [
                {
                    type: "footnotecontainer",
                    content: [
                        {type: "citation", attrs: {references: [{id: 3}]}}
                    ]
                }
            ]
        }

        const fnCitations = new DOCXExporterCitations(
            footnoteDocContent,
            mockSettings,
            mockBibDB,
            mockCsl,
            mockXml,
            bodyCitations.citInfos
        )
        fnCitations.convertCitations = () => {}
        await fnCitations.init()

        expect(fnCitations.citInfos.map(c => c.references[0].id)).toEqual([3])
        expect(fnCitations.citationTexts.length).toBe(1)
        expect(fnCitations.citInfos.length).toBe(
            fnCitations.citationTexts.length
        )
    })
})
