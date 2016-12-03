import {BibFieldTypes, BibTypes} from "biblatex-csl-converter/lib/const"
import {bibDialog} from "./tmp"
import {LitFieldForm} from "./fields/literal"
import {LitListForm} from "./fields/literal-list"

const FIELD_FORMS = {
    'f_literal': LitFieldForm,
    'l_literal': LitListForm
}

export class BibEntryForm {
    constructor(itemId, bibDB) {
        this.itemId = itemId
        if (itemId) {
            this.dialogHeader = gettext('Edit Source')
        } else {
            this.dialogHeader = gettext('Register New Source')
        }
        this.bibDB = bibDB
        this.required = {}
        this.optional = {}
        this.eitheror = {}
        this.bibType = false
        this.cats = []
        this.values = {}
    }

    init() {
        if (this.itemId) {
            let bibEntry = this.bibDB.db[this.itemId]
            this.bibType = bibEntry.bib_type
            this.values = JSON.parse(JSON.stringify(bibEntry.fields)) // copy current values
        }
        this.createForm()
    }

    addDialogToDom() {
        // Add form to DOM
        let dialogBody = bibDialog({
            'dialogHeader': this.dialogHeader,
            'bibType': this.bibType
        })
        jQuery('body').append(dialogBody)

        let diaButtons = {}
        diaButtons[gettext('Submit')] = function() {
            if (type) {
                that.onCreateBibEntrySubmitHandler(id)
            }
        }
        diaButtons[gettext('Cancel')] = function() {
            jQuery(this).dialog('close')
        }

        jQuery("#bib-dialog").dialog({
            draggable: false,
            resizable: false,
            width: 730,
            height: 500,
            modal: true,
            buttons: diaButtons,
            create: function() {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-dialog-buttonpane").addClass('createbook')
                theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass("fw-button fw-orange")
            },
            close: function() {
                jQuery("#bib-dialog").dialog('destroy').remove()
            }
        })

        // init ui tabs
        jQuery('#bib-dialog-tabs').tabs()
    }

    // Add a field to required, optional or either-or fields
    addField(fieldName, category, categoryDom) {
        let fieldType = BibFieldTypes[fieldName].type
        let initialValue = this.values[fieldName] ? this.values[fieldName] : false
        categoryDom.insertAdjacentHTML('beforeend', `<tr><th><h4 class="fw-tablerow-title">${gettext(fieldName)}</h4></th><td class="entry-field"></td></tr>`)
        let fieldDom = categoryDom.lastChild.lastChild
        let FieldClass = FIELD_FORMS[fieldType]
        if (FieldClass) {
            let fieldHandler = new FieldClass(initialValue, fieldDom)
            fieldHandler.init()
            category[fieldName] = fieldHandler
        }
    }

    createForm() {
        let that = this
        this.addDialogToDom()
        let eitherOrFields = document.getElementById('eo-fields')
        BibTypes[this.bibType].eitheror.forEach(fieldName=>{
            that.addField(fieldName, that.eitheror, eitherOrFields)
        })
        let reqFields = document.getElementById('req-fields')
        BibTypes[this.bibType].required.forEach(fieldName=>{
            that.addField(fieldName, that.required, reqFields)
        })
        let optFields = document.getElementById('opt-fields')
        BibTypes[this.bibType].optional.forEach(fieldName=>{
            that.addField(fieldName, that.optional, optFields)
        })
    }

}
