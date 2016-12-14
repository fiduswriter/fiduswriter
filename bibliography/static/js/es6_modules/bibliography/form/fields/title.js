import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {commands} from "prosemirror-old/dist/edit/commands"

import {titleSchema} from "../../schema/title"

export class TitleFieldForm{
    constructor(dom, initialValue) {
        this.initialValue = initialValue
        this.dom = dom
    }

    init() {
        this.pm = new ProseMirror({
            place: this.dom,
            schema: titleSchema
        })
        this.pm.addKeymap(buildKeymap(titleSchema))
        if (this.initialValue) {
            let pmDoc = titleSchema.nodeFromJSON({
                type: 'doc',
                content:[{
                    type: 'literal',
                    content: this.initialValue
                }]
            })
            this.pm.setDoc(pmDoc)
        }
        this.pm.on.blur.add(function(){
            jQuery('.ui-dialog-buttonset .fw-edit').addClass('disabled')
        })
        this.pm.on.focus.add(function(){
            jQuery('.ui-dialog-buttonset .fw-edit').removeClass('disabled')
        })
        let supportedMarks = ['em', 'strong', 'sub', 'sup', 'smallcaps', 'nocase']
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
        let titleContents = this.pm.doc.firstChild.content.toJSON()
        return titleContents && titleContents.length ? titleContents : false
    }

    check() {
        return true
    }
}
