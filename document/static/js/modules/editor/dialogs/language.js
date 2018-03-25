import {Dialog} from "../../common"

import {languageTemplate} from "./templates"

let languages =[
    ['af-ZA', gettext('Afrikaans')],
    ['sq-AL', gettext('Albanian')],
    ['ar', gettext('Arabic')],
    ['ast', gettext('Asturian')],
    ['be', gettext('Belarusian')],
    ['br', gettext('Breton')],
    ['bg', gettext('Bulgarian')],
    ['ca', gettext('Catalan')],
    ['ca-ES-Valencia', gettext('Catalan (Valencia)')],
    ['zh-CN', gettext('Chinese (Simplified)')],
    ['da', gettext('Danish')],
    ['nl', gettext('Dutch')],
    ['en-AU', gettext('English (Australia)')],
    ['en-CA', gettext('English (Canada)')],
    ['en-NZ', gettext('English (New Zealand)')],
    ['en-ZA', gettext('English (South Africa)')],
    ['en-GB', gettext('English (United Kingdom)')],
    ['en-US', gettext('English (United States)')],
    ['eo', gettext('Esperanto')],
    ['fr', gettext('French')],
    ['gl', gettext('Galician')],
    ['de-DE', gettext('German (Germany)')],
    ['de-AU', gettext('German (Austria)')],
    ['de-CH', gettext('German (Switzerland)')],
    ['el', gettext('Greek')],
    ['is', gettext('Icelandic')],
    ['it', gettext('Italian')],
    ['ja', gettext('Japanese')],
    ['km', gettext('Khmer')],
    ['lt', gettext('Lithuanian')],
    ['ml', gettext('Malayalam')],
    ['nb-NO', gettext('Norwegian (bokmål)')],
    ['nn-NO', gettext('Norwegian (nynorsk)')],
    ['fa', gettext('Persian')],
    ['pl', gettext('Polish')],
    ['pt-BR', gettext('Portuguese (Brazil)')],
    ['pt-PT', gettext('Portuguese (Portugal)')],
    ['ro', gettext('Romanian')],
    ['ru', gettext('Russian')],
    ['tr', gettext('Turkish')],
    ['sr-SP-Cy', gettext('Serbian (Cyrillic)')],
    ['sr-SP-Lt', gettext('Serbian (Latin)')],
    ['sk', gettext('Slovak')],
    ['sl', gettext('Slovenian')],
    ['es', gettext('Spanish')],
    ['sv', gettext('Swedish')],
    ['ta', gettext('Tamil')],
    ['tl', gettext('Tagalog')],
    ['uk', gettext('Ukrainian')]
]


export class LanguageDialog {
    constructor(editor, language) {
        this.editor = editor
        this.language = language
        this.dialog = false
    }

    init() {
        let buttons = []
        buttons.push({
            text: gettext('Change'),
            classes: 'fw-dark',
            click: () => {
                let language = this.dialog.dialogEl.querySelector('select').value
                this.dialog.close()

                if (language === this.language) {
                    // No change.
                    return
                }

                let article = this.editor.view.state.doc.firstChild
                let attrs = Object.assign({}, article.attrs)
                attrs.language = language
                this.editor.view.dispatch(
                    this.editor.view.state.tr.setNodeMarkup(0, false, attrs)
                )
                return
            }
        })

        buttons.push({
            type: 'cancel'
        })

        this.dialog = new Dialog({
            width: 300,
            height: 180,
            id: 'select-document-language',
            title: gettext('Change language of the document'),
            body: languageTemplate({
                currentLanguage: this.language,
                languages
            }),
            buttons,
            onClose: () => this.editor.currentView.focus()
        })

        this.dialog.open()

    }
}
