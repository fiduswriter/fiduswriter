import {ModSettingsLayout} from "./layout"
import {ModSettingsSet} from "./set"
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
        let that = this
        Object.keys(newSettings).forEach(function(key){
            if(that.settings[key] !== newSettings[key]) {
                that.settings[key] = newSettings[key]
                switch(key) {
                    case 'documentstyle':
                        that.updateDocumentStyleCSS()
                        break
                    case 'citationstyle':
                        that.editor.mod.citations.resetCitations()
                        break
                }
            }
        })
    }


    /** Update the stylesheet used for the documentstyle
     */
    updateDocumentStyleCSS() {

        let that = this

        let documentStyleLink = document.getElementById('document-style-link')

        // Remove previous style.
        documentStyleLink.parentElement.removeChild(documentStyleLink.previousElementSibling)

        let stylesheet = loadCSS(
            staticUrl + `css/document/${this.editor.doc.settings.documentstyle}.css`,
            documentStyleLink
        )
        stylesheet.addEventListener( "load", function() {
            // We layout the comments 250 ms after the stylesheet has been loaded.
            // This should usually be enough to make the layout work correctly.
            //
            // TODO: Find a way that is more reliable than a timeout to check
            // for font loading.
            window.setTimeout(function() {
                that.editor.mod.comments.layout.layoutComments()
                that.editor.mod.footnotes.layout.layoutFootnotes()
            }, 250)
        })

    }

}
