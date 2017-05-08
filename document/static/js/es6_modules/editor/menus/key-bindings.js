import {Keymap} from "prosemirror-old/dist/edit"

export class ModMenusKeyBindings {
    constructor(mod) {
        mod.keyBindings = this
        this.mod = mod

        this.keymap = this.mapKeys()
        this.bind()
    }

    mapKeys() {
        return new Keymap({
            "Ctrl-P": () => {this.mod.actions.print()},
            "Ctrl-S": () => {this.mod.actions.saveRevision()},
            "Shift-Ctrl-/": () => {this.mod.actions.showKeyBindings()}
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
        document.addEventListener('keydown', event => this.keydown(event))
    }
}
