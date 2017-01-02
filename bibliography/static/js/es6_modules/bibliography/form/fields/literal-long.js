import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {commands} from "prosemirror-old/dist/edit/commands"
import Keymap from "browserkeymap"

import {longLitSchema} from "../../schema/literal-long"

export class LiteralLongFieldForm{
    constructor(dom, initialValue = []) {
        this.dom = dom
        this.initialValue = initialValue
    }

    init() {
        let that = this
        this.pm = new ProseMirror({
            place: this.dom,
            schema: longLitSchema
        })
        this.pm.addKeymap(buildKeymap(longLitSchema), 0)
        this.pm.addKeymap(new Keymap({
            'Enter': function(pm, apply) {
                  if (apply !== false) pm.tr.typeText("\n").applyAndScroll()
                  return true
            }
        }), 1)
        let pmDoc = longLitSchema.nodeFromJSON({
            type: 'doc',
            content:[{
                type: 'longliteral',
                content: this.initialValue
            }]
        })
        this.pm.setDoc(pmDoc)
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

}
