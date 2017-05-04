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
                        this.updateDocStyleCSS()
                        break
                    case 'citationstyle':
                        this.editor.mod.citations.resetCitations()
                        break
                }
            }
        })
    }


    /** Update the stylesheet used for the docStyle
     */
    updateDocStyleCSS() {
	
	if(!this.editor.styleDB.db[this.settings.documentstyle.split('_')[1]]){
            this.settings.documentstyle='style_1'
        }        

	let docStyleLink = document.getElementById('document-style-link')
	let stylesheet
        // Remove previous style.
        docStyleLink.parentElement.removeChild(docStyleLink.previousElementSibling)
	// Aquire Current DBstyle
	let style = this.editor.styleDB.db[this.settings.documentstyle.split('_')[1]]
        this.editor.currentStyle=style

	 if(style && style.css && style.css!="Undefined"){
            stylesheet = loadCSS(
                style.css,
                docStyleLink
            )
        }else{
            if(style)
            stylesheet = loadCSS(
                window.staticUrl + 'css/document/' + style.filename + '.css',
                docStyleLink
            )
        }

        stylesheet.addEventListener("load", () => {
            // We layout the comments 250 ms after the stylesheet has been loaded.
            // This should usually be enough to make the layout work correctly.
            //
            // TODO: Find a way that is more reliable than a timeout to check
            // for font loading.
            window.setTimeout(() => {
                this.editor.mod.comments.layout.layoutComments()
                this.editor.mod.footnotes.layout.layoutFootnotes()
            }, 250)
        })

    }

}
