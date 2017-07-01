import keyName from "w3c-keyname"

export class ModMenusKeyBindings {
    constructor(mod) {
        mod.keyBindings = this
        this.mod = mod
        this.bind()
    }

    keydown(event) {
        let name = keyName(event)

        switch(name) {
            case "Ctrl-P":
                this.mod.actions.print()
                event.preventDefault()
                break
            case "Ctrl-S":
                this.mod.actions.saveRevision()
                event.preventDefault()
                break
            case "Shift-Ctrl-/":
                this.mod.actions.showKeyBindings()
                event.preventDefault()
                break
        }
    }

    bind() {
        document.addEventListener('keydown', event => this.keydown(event))
    }
}
