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
import {
    documentConstructorTemplate,
    templateEditorValueTemplate,
    toggleEditorButtonTemplate,
    footnoteTemplate,
    languagesTemplate,
    papersizesTemplate
} from "./templates"
import {whenReady, ensureCSS, findTarget} from "../common"
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
    contributorsPartSchema,
    templateHash
} from "./schema"

// from https://codeburst.io/throttling-and-debouncing-in-javascript-646d076d0a44
function debounced(delay, fn) {
    let timerId
    return function(...args) {
        if (timerId) {
            clearTimeout(timerId)
        }
        timerId = setTimeout(() => {
            fn(...args)
            timerId = null
        }, delay)
    }
}

export class DocumentTemplateDesigner {
    constructor({staticUrl}) {
        this.staticUrl = staticUrl
        this.definitionTextarea = false
        this.templateEditor = false
        this.errors = {}
        this.value = []

        this.editors = []
        this.listeners = {
            onScroll: debounced(200, () => this.onScroll())
        }
    }

    init() {
        ensureCSS([
            'common.css',
            'dialog.css',
            'prosemirror.css',
            'prosemirror-menu.css',
            'prosemirror-example-setup.css',
            'document_template_designer.css',
            'tags.css',
            'contributors.css'
        ], this.staticUrl)
        whenReady().then(() => {
            this.definitionTextarea = document.querySelector('textarea[name=definition]')
            this.definitionHashInput = document.querySelector('#id_definition_hash')
            this.definitionHashInputBlock = document.querySelector('div.field-definition_hash')
            this.getInitialValue()
            this.modifyDOM()
            this.bind()
        })

    }

    modifyDOM() {
        this.definitionTextarea.style.display='none'
        this.definitionHashInputBlock.style.display='none'
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
        const ids = []
        this.errors = {}
        this.value = {
            type: 'article',
            content: [{type: 'title'}].concat(
                Array.from(document.querySelectorAll('.to-container .doc-part:not(.fixed)')).map(
                    el => {
                        const type = el.dataset.type,
                            id = el.querySelector('input.id').value,
                            title = el.querySelector('input.title').value,
                            help = this.getEditorValue(el.querySelector('.instructions')),
                            initial = this.getEditorValue(
                                el.querySelector('.initial'),
                                true
                            ),
                            locking = el.querySelector('.locking option:checked') ? el.querySelector('.locking option:checked').value : 'false',
                            optional = el.querySelector('.optional option:checked').value,
                            attrs = {id, title},
                            node = {type, attrs}
                        if (help) {
                            attrs.help = help
                        }
                        if (initial) {
                            attrs.initial = initial
                            node.content = JSON.parse(JSON.stringify(initial))
                        }
                        if (optional !== 'false') {
                            attrs.optional = optional
                        }
                        if (optional === 'hidden') {
                            attrs.hidden = true
                        }
                        if (locking !== 'false') {
                            attrs.locking = locking
                        }
                        let language
                        switch (type) {
                            case 'richtext_part':
                            case 'heading_part':
                                attrs.elements = Array.from(el.querySelectorAll('.elements:checked')).map(el => el.value)
                                if (!attrs.elements.length) {
                                    attrs.elements = ['paragraph']
                                }
                                attrs.marks = Array.from(el.querySelectorAll('.marks:checked')).map(el => el.value)
                                language = el.querySelector('.language').value
                                if (language !== 'false') {
                                    attrs.language = language
                                }
                                if (!node.content) {
                                    node.content = [{type: attrs.elements[0]}]
                                }
                                break
                            case 'table_part':
                                attrs.elements = Array.from(el.querySelectorAll('.elements:checked')).map(el => el.value)
                                if (!attrs.elements.includes('paragraph')) {
                                    // tables need to allow paragraphs
                                    attrs.elements.push('paragraph')
                                }
                                attrs.marks = Array.from(el.querySelectorAll('.marks:checked')).map(el => el.value)
                                language = el.querySelector('.language').value
                                if (language !== 'false') {
                                    attrs.language = language
                                }
                                if (!node.content) {
                                    node.content = [{type: 'table', content: [{type: 'table_row', content: [{type: 'table_cell', content: [{type: 'paragraph'}]}]}]}]
                                }
                                break
                            case 'contributors_part':
                            case 'tags_part':
                                attrs.item_title = el.querySelector('input.item_title').value
                                break
                            default:
                                break
                        }

                        if (!id.length) {
                            valid = false
                            this.errors.missing_id = gettext('All document parts need an ID.')
                        }
                        if (/\s/.test(id)) {
                            valid = false
                            this.errors.no_spaces = gettext('IDs cannot contain spaces.')
                        }
                        if (ids.includes(id)) {
                            valid = false
                            this.errors.unique_id = gettext('IDs have to be unique.')
                        }
                        ids.push(id)
                        return node
                    }
                )
            ),
            attrs: {
                footnote_elements: Array.from(document.querySelectorAll('.footnote-value .elements:checked')).map(el => el.value),
                footnote_marks: Array.from(document.querySelectorAll('.footnote-value .marks:checked')).map(el => el.value),
                languages: Array.from(document.querySelectorAll('.languages-value option:checked')).map(el => el.value),
                papersizes: Array.from(document.querySelectorAll('.papersizes-value option:checked')).map(el => el.value),
                template: document.querySelector('#id_title').value
            }
        }
        if (!this.value.attrs.papersizes.length) {
            this.value.attrs.papersizes = ['A4']
        }
        this.value.attrs.papersize = this.value.attrs.papersizes[0]
        if (!this.value.attrs.footnote_elements.length) {
            this.value.attrs.footnote_elements = ['paragraph']
        }
        if (!this.value.attrs.languages.length) {
            this.value.attrs.languages = ['en-US']
        }
        this.value.attrs.language = this.value.attrs.languages[0]

        this.definitionTextarea.value = JSON.stringify(this.value)
        this.definitionHashInput.value = templateHash(this.value)
        this.showErrors()
        return valid
    }

    showErrors() {
        this.definitionTextarea.parentElement.querySelector('ul.errorlist').innerHTML =
            Object.values(this.errors).map(error => `<li>${error}</li>`).join('')
    }

    setupInitialEditors() {
        Array.from(document.querySelectorAll('.to-container .doc-part:not(.fixed)')).forEach((el, index) => {
            const value = this.value.content[index+1], // offset by title
                help = value.attrs.help,
                initial = value.attrs.initial,
                type = value.type
            this.setupEditors(el, type, help, initial)
        })
    }

    setupEditors(el, type, help = false, initial = false) {
        const helpEl = el.querySelector('.instructions')
        if (!helpEl) {
            return
        }
        const helpDoc = help ?
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
        const plugins = []
        let menuContent = [], schema
        switch (type) {
            case 'richtext_part':
                schema = richtextPartSchema
                menuContent = richtextMenuContent
                break
            case 'table_part':
                schema = tablePartSchema
                menuContent = tableMenuContent
                break
            case 'heading_part':
                schema = headingPartSchema
                menuContent = headingMenuContent
                break
            case 'tags_part':
                schema = tagsPartSchema
                plugins.push(new Plugin({
                    props: {
                        nodeViews: {
                            tags_part: (node, view, getPos) => new TagsView(node, view, getPos)
                        }
                    }
                }))
                break
            case 'contributors_part':
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
                        type: type,
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

    getEditorValue(el, inline = false) {
        const editor = this.editors.find(editor => editor[0]===el)
        if (!editor) {
            return false
        }
        const state = editor[1].state
        // Only return if there is more content that a recently initiated doc
        // would have. The number varies between part types.
        if (state.doc.nodeSize > state.schema.nodes.doc.createAndFill().nodeSize) {
            return inline ? state.doc.firstChild.toJSON().content : state.doc.toJSON().content
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
                handle: '.doc-part-header'
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
                handle: '.doc-part-header',
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
                handle: '.doc-part-header',
                onAdd: event => event.to.removeChild(event.to.firstElementChild) // Remove the item that was just added
            }
        )

        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '#toggle-editor', el):
                    event.preventDefault()
                    if (this.definitionTextarea.style.display==='none') {
                        this.definitionTextarea.style.display=''
                        this.definitionHashInputBlock.style.display=''
                        this.templateEditor.style.display='none'
                        this.setCurrentValue()
                    } else {
                        this.definitionTextarea.style.display='none'
                        this.definitionHashInputBlock.style.display='none'
                        this.templateEditor.style.display=''
                        this.getInitialValue()
                        this.templateEditor.querySelector('.to-container').innerHTML =
                            templateEditorValueTemplate({content: this.value.content.slice(1) || []})
                        this.templateEditor.querySelector('.footnote-value').innerHTML =
                            footnoteTemplate(this.value.attrs)
                        this.templateEditor.querySelector('.languages-value').innerHTML =
                            languagesTemplate(this.value.attrs)
                        this.templateEditor.querySelector('.papersizes-value').innerHTML =
                            papersizesTemplate(this.value.attrs)
                        this.setupInitialEditors()
                    }
                    break
                case findTarget(event, 'div.submit-row input[type=submit]', el):
                    if (this.definitionTextarea.style.display==='none' && !this.setCurrentValue()) {
                        event.preventDefault()
                    }
                    break
                case findTarget(event, '.doc-part .configure', el):
                    event.preventDefault()
                    el.target.closest('.doc-part').querySelector('.attrs').classList.toggle('hidden')
                    break
                default:
                    break
            }
        })

        document.addEventListener('scroll', this.listeners.onScroll)
    }

    onScroll() {
        const fromContainer = this.templateEditor.querySelector('.from-container'),
            rect = fromContainer.getBoundingClientRect()

        if (rect.height + rect.top > 0) {
            const contentSize = 6 * 61, // 61px for each content type.
                maxPadding = rect.height - contentSize - 10 // 10px for padding bottom
            fromContainer.style.paddingTop = `${Math.min(8-Math.min(rect.top, 0), maxPadding)}px`
        }

    }
}
