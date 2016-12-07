import {BibFieldTypes, BibTypes} from "biblatex-csl-converter/lib/const"
import {BibFieldTitles, BibTypeTitles} from "./titles"
import {bibDialog} from "./tmp"
import {addDropdownBox} from "../../common/common"
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
    constructor(itemId, bibDB) {
        this.itemId = itemId
        this.bibDB = bibDB
        this.required = {}
        this.optional = {}
        this.eitheror = {}
        this.cats = []
        this.values = {}
    }

    init() {
        if (this.itemId) {
            this.dialogHeader = gettext('Edit Source')
            let bibEntry = this.bibDB.db[this.itemId]
            this.bibType = bibEntry.bib_type
            this.values = JSON.parse(JSON.stringify(bibEntry.fields)) // copy current values
        } else {
            this.dialogHeader = gettext('Register New Source')
            this.bibType = false
        }
        this.createForm()
    }

    addDialogToDOM() {
        // Add form to DOM
        let dialogBody = bibDialog({
            'dialogHeader': this.dialogHeader,
            'sourceTitle': this.bibType ? BibTypeTitles[this.bibType] : gettext('Select source type'),
            BibTypes,
            BibTypeTitles
        })
        jQuery('body').append(dialogBody)

        let diaButtons = {}
        diaButtons[gettext('Submit')] = function() {
            //if (type) {
            //    that.onCreateBibEntrySubmitHandler(id)
            //}
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

        //open dropdown for selecting source type
        addDropdownBox(jQuery('#source-type-selection'), jQuery('#source-type-selection > .fw-pulldown'))

        // init ui tabs
        jQuery('#bib-dialog-tabs').tabs()
    }

    // Add a field to required, optional or either-or fields
    addField(fieldName, category, categoryDOM) {
        let fieldType = BibFieldTypes[fieldName]
        categoryDOM.insertAdjacentHTML('beforeend', `<tr><th><h4 class="fw-tablerow-title">${BibFieldTitles[fieldName]}</h4></th><td class="entry-field"></td></tr>`)
        let fieldDOM = categoryDOM.lastChild.lastChild
        let FieldClass = FIELD_FORMS[fieldType.type]
        if (FieldClass) {
            let fieldHandler = new FieldClass(fieldDOM, this.values[fieldName], undefined, fieldType)
            fieldHandler.init()
            category[fieldName] = fieldHandler
        } else {
            console.warn(`Unknown fieldtype: ${fieldType.type}`)
        }
    }

    createForm() {
        let that = this
        this.addDialogToDOM()
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
