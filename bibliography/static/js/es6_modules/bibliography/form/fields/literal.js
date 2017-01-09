import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {commands} from "prosemirror-old/dist/edit/commands"

import {litSchema} from "../../schema/literal"

export class LiteralFieldForm{
    constructor(dom, initialValue = [], placeHolder = false) {
        this.dom = dom
        this.initialValue = initialValue
        this.placeHolder = placeHolder
        this.placeHolderSet = false
    }

    init() {
        this.pm = new ProseMirror({
            place: this.dom,
            schema: litSchema
        })
        this.pm.addKeymap(buildKeymap(litSchema))
        let pmDoc = litSchema.nodeFromJSON({
            type: 'doc',
            content:[{
                type: 'literal',
                content: this.initialValue
            }]
        })
        this.pm.setDoc(pmDoc)
        if (this.placeHolder) {
            this.renderPlaceholder()
            this.pm.on.change.add(() => this.renderPlaceholder())
            this.pm.on.blur.add(() => this.renderPlaceholder(false))
            this.pm.on.focus.add(() => this.renderPlaceholder(true))
        }
        this.pm.on.blur.add(function(){
            jQuery('.ui-dialog-buttonset .fw-edit').addClass('disabled')
        })
        this.pm.on.focus.add(function(){
            jQuery('.ui-dialog-buttonset .fw-edit').removeClass('disabled')
            jQuery('.ui-dialog-buttonset .fw-nocase').addClass('disabled')
        })
        let supportedMarks = ['em', 'strong', 'sub', 'sup', 'smallcaps']
        supportedMarks.forEach(mark =>{
            this.linkMarkButton(mark)
        })
    }

    linkMarkButton(mark) {
        jQuery(`.ui-dialog-buttonset .fw-${mark}`).on("mousedown", (event)=>{
            event.preventDefault()
            event.stopPropagation()
            if (!this.pm.hasFocus()) {
                return
            }
            let sMark = this.pm.schema.marks[mark]
            let command = commands.toggleMark(sMark)
            command(this.pm, true)
        })
    }

    get value() {
        let literalContents = this.pm.doc.firstChild.content.toJSON()
        return literalContents && literalContents.length ? literalContents : false
    }

    check() {
        return true
    }

    renderPlaceholder(hasFocus = this.pm.hasFocus()) {
        let value = this.value
        if (value === false && !this.placeHolderSet && !hasFocus) {
            this.dom.querySelector('div.literal').setAttribute('data-placeholder', this.placeHolder)
            this.placeHolderSet = true
        } else if ((this.placeHolderSet && hasFocus) || value !== false) {
            this.dom.querySelector('div.literal').removeAttribute('data-placeholder')
            this.placeHolderSet = false
        }
    }
}
