import Sortable from "sortablejs"
import {EditorState, Plugin} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {gapCursor} from "prosemirror-gapcursor"
import {menuBar} from "prosemirror-menu"
import {buildKeymap, buildInputRules} from "prosemirror-example-setup"
import {TagsView, ContributorsView} from "../editor/state_plugins"

import {documentConstructorTemplate, templateEditorValueTemplate, toggleEditorButtonTemplate} from "./templates"
import {whenReady, ensureCSS} from "../common"
import {
    helpSchema,
    helpMenuContent,
    richtextPartSchema,
    richtextMenuContent,
    tablePartSchema,
    tableMenuContent,
    headingPartSchema,
    headingMenuContent,
    tagsPartSchema,
    contributorsPartSchema
} from "./schema"

export class DocumentTemplateDesigner {
    constructor({staticUrl}) {
        this.staticUrl = staticUrl
        this.definitionTextarea = false
        this.templateEditor = false
        this.errors = {}
        this.value = []

        this.editors = []
    }

    init() {
        ensureCSS([
            'common.css',
            'dialog.css',
            'prosemirror.css',
            'prosemirror-menu.css',
            'document_template_designer.css',
            'tags.css',
            'contributors.css'
        ], this.staticUrl)
        whenReady().then(() => {
            this.definitionTextarea = document.querySelector('textarea[name=definition]')
            this.getInitialValue()
            this.modifyDOM()
            this.bind()
        })

    }

    modifyDOM() {
        this.definitionTextarea.style.display='none'
        this.definitionTextarea.insertAdjacentHTML(
            'beforebegin',
            toggleEditorButtonTemplate()
        )

        this.definitionTextarea.insertAdjacentHTML(
            'afterend',
            documentConstructorTemplate({value: this.value})
        )
        this.templateEditor = document.getElementById('template-editor')
        this.setupInitialEditors()
    }

    getInitialValue() {
        this.value = JSON.parse(this.definitionTextarea.value)
    }

    setCurrentValue() {
        let valid = true
        this.errors = {}
        this.value = Array.from(document.querySelectorAll('.to-container .doc-part:not(.fixed)')).map(
            el => {
                const type = el.dataset.type,
                    id = el.querySelector('input.id').value,
                    title = el.querySelector('input.title').value,
                    help = this.getEditorValue(el.querySelector('.instructions')),
                    initial = this.getEditorValue(el.querySelector('.initial')),
                    locking = el.querySelector('.locking option:checked').value,
                    optional = el.querySelector('.optional option:checked').value,
                    values = {type, id, title, locking, optional},
                    attrs = {}
                if (help) {
                    values['help'] = help
                }
                if (initial) {
                    values['initial'] = initial
                }
                let language
                switch(type) {
                    case 'richtext':
                    case 'table':
                    case 'heading':
                        attrs['elements'] = el.querySelector('.elements').value.split(' ')
                        attrs['marks'] = el.querySelector('.marks').value.split(' ')
                        language = el.querySelector('.language').value
                        if (language !== 'false') {
                            values['language'] = language
                        }
                        break
                    case 'contributors':
                    case 'tags':
                        attrs['item_title'] = el.querySelector('input.item_title').value
                        break
                    default:
                        break
                }
                values['attrs'] = attrs
                if (!id.length) {
                    valid = false
                    this.errors['missing_id'] = gettext('All document parts need an ID.')
                }
                return values
            }
        )
        this.definitionTextarea.value = JSON.stringify(this.value)
        this.showErrors()
        return valid
    }

    showErrors() {
        this.definitionTextarea.parentElement.querySelector('ul.errorlist').innerHTML =
            Object.values(this.errors).map(error => `<li>${error}</li>`).join('')
    }

    setupInitialEditors() {
        Array.from(document.querySelectorAll('.to-container .doc-part:not(.fixed)')).forEach((el, index) => {
            const value = this.value[index],
                help = value.help,
                initial = value.initial,
                type = value.type
            this.setupEditors(el, type, help, initial)
        })
    }

    setupEditors(el, type, help = false, initial = false) {
        const helpEl = el.querySelector('.instructions'),
            helpDoc = help ?
                helpSchema.nodeFromJSON({type:'doc', content: help}) :
                helpSchema.nodes.doc.createAndFill(),
            helpView = new EditorView(helpEl, {
                state: EditorState.create({
                    doc: helpDoc,
                    plugins: [
                        buildInputRules(helpSchema),
                        keymap(buildKeymap(helpSchema)),
                        keymap(baseKeymap),
                        gapCursor(),
                        menuBar({
                            floating: false,
                            content: helpMenuContent
                        }),
                        history()
                    ]
                })
            })
        this.editors.push([helpEl, helpView])
        let plugins = [], menuContent = [], schema
        switch(type) {
            case 'richtext':
                schema = richtextPartSchema
                menuContent = richtextMenuContent
                break
            case 'table':
                schema = tablePartSchema
                menuContent = tableMenuContent
                break
            case 'heading':
                schema = headingPartSchema
                menuContent = headingMenuContent
                break
            case 'tags':
                schema = tagsPartSchema
                plugins.push(new Plugin({
                    props: {
                        nodeViews: {
                            tags_part: (node, view, getPos) => new TagsView(node, view, getPos)
                        }
                    }
                }))
                break
            case 'contributors':
                schema = contributorsPartSchema
                plugins.push(new Plugin({
                    props: {
                        nodeViews: {
                            contributors_part: (node, view, getPos) => new ContributorsView(node, view, getPos)
                        }
                    }
                }))
                break
            default:
                break
        }

        if (!schema) {
           return
        }
        plugins.unshift(
            buildInputRules(schema),
            keymap(buildKeymap(schema)),
            keymap(baseKeymap),
            gapCursor(),
            menuBar({
                floating: false,
                content: menuContent
            }),
            history()
        )
        const initialEl = el.querySelector('.initial'),
            doc = initial ?
                schema.nodeFromJSON({
                    type:'doc',
                    content: [{
                        type: `${type}_part`,
                        content: initial
                    }]
                }) :
                schema.nodes.doc.createAndFill(),
            initialView = new EditorView(initialEl, {
                state: EditorState.create({
                    doc,
                    plugins
                })
            })
        this.editors.push([initialEl, initialView])

    }

    getEditorValue(el) {
        const editor = this.editors.find(editor => editor[0]===el)
        if (!editor) {
            return false
        }
        const state = editor[1].state
        // Only return if there is more content that a recently initiated doc
        // would have. The number varies between part types.
        if (state.doc.nodeSize > state.schema.nodes.doc.createAndFill().nodeSize) {
            return state.doc.firstChild.toJSON().content
        }
        return false
    }

    bind() {
        new Sortable(
            document.querySelector('.from-container'),
            {
                group: {
                    name: 'document',
                    pull: 'clone',
                    put: false
                },
                sort: false,
                handle: '.title'
            }
        )
        new Sortable(
            document.querySelector('.to-container'),
            {
                group: {
                    name: 'document',
                    pull: true,
                    put: true
                },
                handle: '.title',
                onAdd: event => {
                    this.setupEditors(
                        event.item,
                        event.item.dataset.type
                    )
                }
            }
        )
        new Sortable(
            document.querySelector('.trash'),
            {
                group: {
                    name: 'document',
                    put: true
                },
                handle: '.title',
                onAdd: event => event.to.removeChild(event.to.firstElementChild) // Remove the item that was just added
            }
        )

        Array.from(document.querySelectorAll('div.submit-row input[type=submit]')).forEach(
            button => button.addEventListener('click', event => {
                if (this.definitionTextarea.style.display==='none' && !this.setCurrentValue()) {
                    event.preventDefault()
                    }
            })
        )

        document.getElementById('toggle-editor').addEventListener('click', event => {
            event.preventDefault()
            if (this.definitionTextarea.style.display==='none') {
                this.definitionTextarea.style.display=''
                this.templateEditor.style.display='none'
                this.setCurrentValue()
            } else {
                this.definitionTextarea.style.display='none'
                this.templateEditor.style.display=''
                this.getInitialValue()
                this.templateEditor.querySelector('.to-container').innerHTML =
                    templateEditorValueTemplate({value: this.value})
                this.setupInitialEditors()
            }
        })

    }
}
