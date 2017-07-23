import {loadCSS} from "fg-loadcss/src/loadCSS"

/* A Module relted to setting document settings such as citation style and
papersize and making needed changes to the DOM when settings are set/change.*/

export class ModSettings {
    constructor(editor) {
        editor.mod.settings = this
        this.editor = editor
        this.settings = {}
    }

    check(newSettings) {
        Object.keys(newSettings).forEach(key => {
            if(this.settings[key] !== newSettings[key]) {
                this.settings[key] = newSettings[key]
                switch(key) {
                    case 'documentstyle':
                        // Check if doc style is valid. Otherwise pick first possible style
                        if (this.editor.mod.styles.documentStyles.map(d => d.filename).includes(newSettings[key])) {
                            this.updateDocStyleCSS(newSettings[key])
                        } else {
                            let documentStyleMenu = this.editor.menu.headerbarModel.content.find(menu => menu.id==='document_style')
                            if (documentStyleMenu.content.length) {
                                documentStyleMenu.content[0].action(this.editor)
                            }
                        }
                        break
                    case 'citationstyle':
                        // Check if cite style is valid. Otherwise pick first possible style
                        if (this.editor.mod.styles.citationStyles.map(d => d.short_title).includes(newSettings[key])) {
                            this.editor.mod.citations.resetCitations()
                        } else {
                            let citationStyleMenu = this.editor.menu.headerbarModel.content.find(menu => menu.id==='citation_style')
                            if (citationStyleMenu.content.length) {
                                citationStyleMenu.content[0].action(this.editor)
                            }
                        }
                        break
                }
            }
        })
    }


    /** Update the stylesheet used for the docStyle
     */
    updateDocStyleCSS(docStyleId) {

        let docStyle = this.editor.mod.styles.documentStyles.find(doc_style => doc_style.filename===docStyleId)

        let docStyleCSS = `
        ${docStyle.fonts.map(font => {
            return `@font-face {${
                font[1].replace('[URL]', font[0])
            }}`
        }).join('\n')}

        ${docStyle.contents}
        `

        let docStyleEl = document.getElementById('document-style')

        if (!docStyleEl) {
            docStyleEl = document.createElement('style')
            docStyleEl.id = 'document-style'
            document.head.appendChild(docStyleEl)
        }

        docStyleEl.innerHTML = docStyleCSS

        // TODO: Find a way that is more reliable than a timeout to check
        // for font loading.
        window.setTimeout(() => {
            this.editor.mod.comments.layout.layoutComments()
            this.editor.mod.footnotes.layout.layoutFootnotes()
        }, 250)

    }

}
