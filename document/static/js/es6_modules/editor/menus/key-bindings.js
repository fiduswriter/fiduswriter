import {Keymap} from "prosemirror/dist/edit"

export class ModMenusKeyBindings {
    constructor(mod) {
        mod.keyBindings = this
        this.mod = mod

        this.keymap = this.mapKeys()
        this.bind()
    }

    mapKeys() {
        let that = this
        return new Keymap({
            "Ctrl-P": function(){that.mod.actions.print()},
            "Ctrl-S": function(){that.mod.actions.saveRevision()},
            "Shift-Ctrl-/": function(){that.mod.actions.showKeyBindings()}
        })
    }

    keydown(event) {
        let name = Keymap.keyName(event)
        let action = this.keymap.lookup(name)
        if (action) {
            event.preventDefault()
            action()
        }
    }

    bind() {
        let that = this
        document.addEventListener('keydown',function(event) {that.keydown(event)})
    }
}
