import {ModSettingsLayout} from "./layout"
import {ModSettingsSet} from "./set"

/* A Module relted to setting document settings such as citation style and
papersize and making needed changes to the DOM when settings are set/change.*/

export class ModSettings {
    constructor(editor) {
        editor.mod.settings = this
        this.editor = editor
        new ModSettingsSet(this)
        new ModSettingsLayout(this)
    }

}
