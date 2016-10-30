export class ModSettingsSet {
    constructor(mod) {
        mod.set = this
        this.mod = mod
        this.settings = {}
    }


    check(newSettings) {
        let that = this
        Object.keys(newSettings).forEach(function(key){
            if(that.settings[key] !== newSettings[key]) {
                that.settings[key] = newSettings[key]
                switch(key) {
                    case 'documentstyle':
                        this.mod.layout.displayDocumentstyle()
                        break
                    case 'citationstyle':
                        this.mod.layout.displayCitationstyle()
                        break
                }
            }
        })
    }

    /** Sets a variable in this.mod.editor.doc.settings to a value and sends
     * a change notification to other editors.
     */

    setSetting(variable, newValue, sendChange) {

        let currentValue = this.mod.editor.doc.settings[variable]

        if (currentValue === newValue) {
            return false
        }

        this.mod.editor.doc.settings[variable] = newValue

        if (sendChange) {
            this.mod.editor.mod.serverCommunications.send({
                type: 'setting_change',
                variable: variable,
                value: newValue
            })
        }

        switch (variable.split('-')[0]) { // Split so that the various metadata- settings all trigger 'metadata'
            case 'documentstyle':
                this.mod.layout.displayDocumentstyle()
                break
            case 'citationstyle':
                this.mod.layout.displayCitationstyle()
                break
            case 'papersize':
                //this.mod.layout.displayPapersize()
                break
            case 'metadata':
                //this.mod.layout.layoutMetadata()
                break
        }

        return true
    }


}
