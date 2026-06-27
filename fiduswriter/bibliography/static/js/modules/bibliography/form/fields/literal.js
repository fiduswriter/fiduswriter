import {toggleMark} from "prosemirror-commands"

import {InlineInput, icon} from "fwtoolkit"

import {litSchema} from "../../schema/literal"

export class LiteralFieldForm {
    constructor(dom, initialValue = [], placeHolder = false) {
        this.inlineInput = new InlineInput(dom, {
            schema: litSchema,
            nodeType: "literal",
            initialValue,
            placeholder: placeHolder,
            tools: [
                {
                    command: toggleMark(litSchema.marks.strong),
                    dom: icon("strong", gettext("Strong"))
                },
                {
                    command: toggleMark(litSchema.marks.em),
                    dom: icon("em", gettext("Emphasis"))
                },
                {
                    command: toggleMark(litSchema.marks.smallcaps),
                    dom: icon("smallcaps", gettext("Small caps"))
                },
                {
                    command: toggleMark(litSchema.marks.sub),
                    dom: icon("sub", gettext("Subscript₊"))
                },
                {
                    command: toggleMark(litSchema.marks.sup),
                    dom: icon("sup", gettext("Supscript²"))
                }
            ]
        })
    }

    init() {}

    get value() {
        return this.inlineInput.value
    }

    check() {
        return this.inlineInput.check()
    }
}
