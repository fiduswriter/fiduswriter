import {BibFieldTypes, BibTypes} from "biblatex-csl-converter/lib/const"
import {BibFieldTitles, BibTypeTitles} from "./titles"
import {bibDialog} from "./templates"
import {addAlert} from "../../common/common"
import {EntryCatForm} from "./entry-cat"
import {DateFieldForm} from "./fields/date"
import {LiteralFieldForm} from "./fields/literal"
import {LiteralLongFieldForm} from "./fields/literal-long"
import {LiteralListForm} from "./fields/literal-list"
import {TitleFieldForm} from "./fields/title"
import {NameListForm} from "./fields/name-list"
import {RangeListForm} from "./fields/range-list"
import {URIFieldForm} from "./fields/uri"
import {VerbatimFieldForm} from "./fields/verbatim"
import {TagListForm} from "./fields/tag-list"
import {KeyFieldForm} from "./fields/key"
import {KeyListForm} from "./fields/key-list"
import {nameToText} from "../tools"

const FIELD_FORMS = {
    'f_date': DateFieldForm,
    'f_integer': LiteralFieldForm,
    'f_literal': LiteralFieldForm,
    'l_literal': LiteralListForm,
    'f_long_literal': LiteralLongFieldForm,
    'f_key': KeyFieldForm,
    'l_key': KeyListForm,
    'l_name': NameListForm,
    'l_range': RangeListForm,
    'l_tag': TagListForm,
    'f_title': TitleFieldForm,
    'f_uri': URIFieldForm,
    'f_verbatim': VerbatimFieldForm
}

export class BibEntryForm {
    constructor(itemId, bibDB, callback) {
        if (itemId === undefined) {
            this.itemId = false
        } else {
            this.itemId = parseInt(itemId)
        }
        this.bibDB = bibDB
        this.callback = callback
        this.fields = {}
        this.currentValues = {}
    }

    init() {
        if (this.itemId) {
            this.dialogHeader = gettext('Edit Source')
            let bibEntry = this.bibDB.db[this.itemId]
            this.currentValues = JSON.parse(JSON.stringify(bibEntry)) // copy current values
        } else {
            this.dialogHeader = gettext('Register New Source')
            this.currentValues = {
                bib_type: false,
                entry_cat: [],
                entry_key: 'FidusWriter',
                fields: {}
            }
        }
        this.createForm()
    }

    addDialogToDOM() {
        let that = this
        // Add form to DOM
        let dialogEl = bibDialog({
            'dialogHeader': this.dialogHeader,
            'bib_type': this.currentValues.bib_type,
            BibTypes,
            BibTypeTitles
        })
        jQuery('body').append(dialogEl)

        let diaButtons = {}
        diaButtons[gettext('Submit')] = function() {
            if (that.check()) {
                that.save()
                jQuery(this).dialog('close')
            }
        }
        diaButtons[gettext('Cancel')] = function() {
            jQuery(this).dialog('close')
        }

        jQuery("#bib-dialog").dialog({
            draggable: false,
            resizable: false,
            width: 940,
            height: 700,
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

        document.getElementById('select-bibtype').addEventListener('change', () => {
            that.changeBibType()
        })
    }


    addField(fieldName, dom) {
        let fieldType = BibFieldTypes[fieldName]
        dom.insertAdjacentHTML('beforeend', `<tr><th><h4 class="fw-tablerow-title">${BibFieldTitles[fieldName]}</h4></th><td class="entry-field ${fieldName}"></td></tr>`)
        let fieldDOM = dom.lastChild.lastChild
        let FieldClass = FIELD_FORMS[fieldType.type]
        if (FieldClass) {
            let fieldHandler = new FieldClass(fieldDOM, this.currentValues.fields[fieldName], undefined, fieldType)
            fieldHandler.init()
            this.fields[fieldName] = fieldHandler
        } else {
            console.warn(`Unknown fieldtype: ${fieldType.type}`)
        }
    }

    createForm() {
        let that = this
        this.addDialogToDOM()
        if (this.currentValues.bib_type !== false) {
            let eitherOrFields = document.getElementById('eo-fields')
            BibTypes[this.currentValues.bib_type].eitheror.forEach(fieldName=>{
                that.addField(fieldName, eitherOrFields)
            })
            let reqFields = document.getElementById('req-fields')
            BibTypes[this.currentValues.bib_type].required.forEach(fieldName=>{
                that.addField(fieldName, reqFields)
            })
            let optFields = document.getElementById('opt-fields')
            BibTypes[this.currentValues.bib_type].optional.forEach(fieldName=>{
                that.addField(fieldName, optFields)
            })
            let entryCatField = document.getElementById('categories-field')
            this.entryCatForm = new EntryCatForm(entryCatField, this.currentValues.entry_cat, this.bibDB.cats)
            this.entryCatForm.init()
        }
    }

    changeBibType() {
        // Add all current values into temporary currentValues, in case the
        // user still wants them.
        let formValue = this.value
        Object.assign(this.currentValues.fields, formValue.fields)
        this.currentValues.entry_cat = formValue.entry_cat
        this.currentValues.bib_type = formValue.bib_type
        // Reset fields and close dialog.
        this.fields = {}
        jQuery('#bib-dialog').dialog('close')
        this.createForm()
    }

    createEntryKey(bibItem) {
        // We attempt to create a biblatex compatible entry key if there is no entry
        // key so far.
        let entryKey = ''
        if (bibItem.fields.author) {
            entryKey += nameToText(bibItem.fields.author).replace(/\s|,|=|;|:|{|}/g,'')
        } else if (bibItem.fields.editor) {
            entryKey += nameToText(bibItem.fields.editor).replace(/\s|,|=|;|:|{|}/g,'')
        }
        if (bibItem.fields.date) {
            entryKey += bibItem.fields.date.split('/')[0].replace(/\?|\*|u|\~|-/g,'')
        }
        if (entryKey.length) {
            bibItem.entry_key = entryKey
        }
    }

    get value() {
        let that = this
        let returnObj = {
            bib_type: document.querySelector('#select-bibtype').value,
            entry_cat: this.entryCatForm ? this.entryCatForm.value : [],
            entry_key: this.currentValues.entry_key, // is never updated.
            fields: {}
        }
        Object.keys(this.fields).forEach(fieldName=>{
            let fieldValue = that.fields[fieldName].value
            if (fieldValue !== false) {
                returnObj['fields'][fieldName] = fieldValue
            }
        })
        return returnObj
    }

    save() {
        let isNew = this.itemId===false ? true : false
        let itemId = this.itemId===false ? 0 : this.itemId
        let saveObj = {}
        saveObj[itemId] = this.value

        if (saveObj[itemId].entry_key==='FidusWriter') {
            this.createEntryKey(saveObj[itemId])
        }
        this.bibDB.saveBibEntries(
            saveObj,
            isNew,
            this.callback
        )
    }

    check() {
        let that = this, passed = true
        if (!this.currentValues.bib_type) {
            return false
        }
        Object.keys(this.fields).forEach(fieldName=>{
            if(that.fields[fieldName].check() !== true) {
                passed = false
            }
        })
        if (!passed) {
            addAlert('error', gettext('Error in form, check highlighted values!'))
        }
        return passed
    }

}
