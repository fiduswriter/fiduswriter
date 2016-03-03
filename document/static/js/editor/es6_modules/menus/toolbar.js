/* Bindings for the toolbar menu */
export class ModMenusToolbar {
    constructor(mod) {
        mod.toolbar = this
        this.mod = mod
        this.bindEvents()
    }

    bindEvents() {}
}
