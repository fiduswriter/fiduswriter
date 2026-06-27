import {toggleMark} from "prosemirror-commands"

import {InlineInput, icon} from "fwtoolkit"

import {titleSchema} from "../../schema/title"

export class TitleFieldForm {
    constructor(dom, initialValue) {
        this.inlineInput = new InlineInput(dom, {
            schema: titleSchema,
            nodeType: "literal",
            initialValue,
            tools: [
                {
                    command: toggleMark(titleSchema.marks.strong),
                    dom: icon("strong", gettext("Strong"))
                },
                {
                    command: toggleMark(titleSchema.marks.em),
                    dom: icon("em", gettext("Emphasis"))
                },
                {
                    command: toggleMark(titleSchema.marks.smallcaps),
                    dom: icon("smallcaps", gettext("Small caps"))
                },
                {
                    command: toggleMark(titleSchema.marks.sub),
                    dom: icon("sub", gettext("Subscript₊"))
                },
                {
                    command: toggleMark(titleSchema.marks.sup),
                    dom: icon("sup", gettext("Supscript²"))
                },
                {
                    command: toggleMark(titleSchema.marks.nocase),
                    dom: icon("nocase", gettext("CasE ProTecT"))
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
