import {Plugin, PluginKey} from "prosemirror-state"

import {LANGUAGES} from "../common"
import {setDocTitle} from "../../common"

const key = new PluginKey('settings')

let settings = {}

export let settingsPlugin = function(options) {

    let fixSettings = function(settings) {
        let fixedSettings = Object.assign({}, settings), changed = false

        Object.keys(settings).forEach(key => {
            let value = settings[key]
            switch(key) {
                case 'documentstyle':
                    if (
                        !options.editor.mod.styles.documentStyles.find(d => d.filename === value) &&
                        options.editor.mod.styles.documentStyles.length
                    ) {
                        fixedSettings[key] = options.editor.mod.styles.documentStyles[0].filename
                        changed = true
                    }
                    break
                case 'citationstyle':
                    if (
                        !options.editor.mod.styles.citationStyles.find(d => d.short_title === value) &&
                        options.editor.mod.styles.citationStyles.length
                    ) {
                        fixedSettings[key] = options.editor.mod.styles.citationStyles[0].short_title
                        changed = true
                    }
                    break
            }

        })
        if (changed) {
            return fixedSettings
        } else {
            return false
        }
    }

    let updateSettings = function(newSettings, oldSettings) {
        let settingsValid = true
        Object.keys(newSettings).forEach(key => {
            let newValue = newSettings[key]
            if(oldSettings[key] !== newValue) {
                switch(key) {
                    case 'documentstyle':
                        if (newValue.length) {
                            updateDocStyleCSS(newValue)
                        } else {
                            settingsValid = false
                        }
                        break
                    case 'citationstyle':
                        if (newValue.length) {
                            options.editor.mod.citations.resetCitations()
                        } else {
                            settingsValid = false
                        }
                        break
                    case 'language':
                        if (newValue.length) {
                            const lang = LANGUAGES.find(lang => lang[0] === newValue)
                            document.querySelectorAll('.ProseMirror').forEach(el => el.dir = lang[2])
                            options.editor.docInfo.dir = lang[2]
                        } else {
                            settingsValid = false
                        }
                        break
                }
            }
        })
        return settingsValid
    }

    /** Update the stylesheet used for the docStyle
     */
    let updateDocStyleCSS = function(docStyleId) {

        let docStyle = options.editor.mod.styles.documentStyles.find(doc_style => doc_style.filename===docStyleId)

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
            document.body.appendChild(docStyleEl)
        }

        docStyleEl.innerHTML = docStyleCSS

        // TODO: Find a way that is more reliable than a timeout to check
        // for font loading.
        window.setTimeout(() => {
            options.editor.mod.marginboxes.updateDOM()
            options.editor.mod.footnotes.layout.layoutFootnotes()
        }, 250)

    }


    return new Plugin({
        key,
        appendTransaction(trs, oldState, newState) { // Ensure that there are always settings set.
            if (
                trs.every(tr => tr.getMeta('remote') || tr.from > 0 )
            ) {
                // All transactions are remote. Give up.
                return false
            }
            let lastTr = trs[trs.length-1]
            let attrs = lastTr.doc.firstChild.attrs
            let fixedSettings = fixSettings(attrs)

            if (!fixedSettings) {
                return false
            }

            let tr = newState.tr

            tr.setNodeMarkup(0, false, fixedSettings)
            tr.setMeta('settings', true)

            return tr

        },
        view(view) {
            if(!updateSettings(view.state.doc.firstChild.attrs, {})) {
                let tr = view.state.tr
                tr.setNodeMarkup(0, false, fixSettings(view.state.doc.firstChild.attrs))
                tr.setMeta('settings', true)
                setTimeout(
                    () => view.dispatch(tr),
                    0
                )

            }
            return {
                update: (view, prevState) => {
                    updateSettings(view.state.doc.firstChild.attrs, prevState.doc.firstChild.attrs)
                    setDocTitle(view.state.doc.firstChild.firstChild.textContent)
                }
            }
        }
    })
}
