import SmoothDND from "smooth-dnd"
import {documentConstructorTemplate, templateEditorValueTemplate, toggleEditorButtonTemplate} from "./templates"
import {whenReady} from "../common"

export class DocumentTemplateConstructor {
    constructor() {
        this.definitionTextarea = false
        this.templateEditor = false
        this.errors = {}
        this.value = []
    }

    init() {
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
    }

    getInitialValue() {
        this.value = JSON.parse(this.definitionTextarea.value)
        console.log(this.value)
    }

    setCurrentValue() {
        let valid = true
        this.errors = {}
        this.value = Array.from(document.querySelectorAll('.to-container .doc-part:not(.fixed)')).map(
            el => {
                const type = el.dataset.type,
                    id = el.querySelector('input.id').value,
                    title = el.querySelector('input.title').value,
                    help = el.querySelector('.help').value,
                    initial = el.querySelector('.initial').value,
                    locking = el.querySelector('.locking option:checked').value,
                    optional = el.querySelector('.optional option:checked').value,
                    values = {type, id, title, help, initial, locking, optional},
                    attrs = {}
                switch(type) {
                    case 'richtext':
                        attrs['elements'] = el.querySelector('.elements').value
                        attrs['marks'] = el.querySelector('.marks').value
                        values['attrs'] = attrs
                        break
                    case 'contributors':
                    case 'tags':
                        attrs['item_title'] = el.querySelector('input.item_title').value
                        values['attrs'] = attrs
                        break
                    default:
                        break
                }
                if (!id.length) {
                    valid = false
                    this.errors['missing_id'] = gettext('All document parts need an ID.')
                }
                return values
            }
        )
        console.log(this.value)
        this.definitionTextarea.value = JSON.stringify(this.value)
        this.showErrors()
        return valid
    }

    showErrors() {
        this.definitionTextarea.parentElement.querySelector('ul.errorlist').innerHTML =
            Object.values(this.errors).map(error => `<li>${error}</li>`).join('')
    }

    bind() {
        const fromContainerEl = document.querySelector('.from-container'),
            toContainerEl = document.querySelector('.to-container'),
            trashEl = document.querySelector('.trash'),
            fromContainer = SmoothDND(fromContainerEl, {
                behaviour: 'copy',
                groupName: 'document',
                shouldAcceptDrop: () => false,
                dragHandleSelector: '.title'
            }),
            fromContainerHTML = fromContainerEl.innerHTML,
            toContainer = SmoothDND(toContainerEl, {
                groupName: 'document',
                dragHandleSelector: '.title',
                onDrop: () => fromContainerEl.innerHTML = fromContainerHTML
            }),
            trash = SmoothDND(trashEl, {
                behaviour: 'move',
                groupName: 'document',
                dragHandleSelector: '.title',
                onDrop: () => {
                    trashEl.innerHTML = ''
                    trashEl.classList.remove('selected')
                },
                onDragEnter: () => trashEl.classList.add('selected'),
                onDragLeave: () => trashEl.classList.remove('selected')
            }),
            submitButtons = Array.from(document.querySelectorAll('div.submit-row input[type=submit]')),
            toggleEditorButton = document.getElementById('toggle-editor')

        submitButtons.forEach(button => button.addEventListener('click', event => {
            if (this.definitionTextarea.style.display==='none' && !this.setCurrentValue()) {
                event.preventDefault()
            }
        }))

        toggleEditorButton.addEventListener('click', event => {
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
            }
        })

    }
}
