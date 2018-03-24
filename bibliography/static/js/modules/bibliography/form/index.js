import {BibFieldTypes, BibTypes} from "biblatex-csl-converter"
import {BibFieldTitles, BibTypeTitles, BibFieldHelp} from "./strings"
import {bibDialog} from "./templates"
import {addAlert, noSpaceTmp} from "../../common"
import {EntryCatForm} from "./entry_cat"
import {DateFieldForm} from "./fields/date"
import {LiteralFieldForm} from "./fields/literal"
import {LiteralLongFieldForm} from "./fields/literal_long"
import {LiteralListForm} from "./fields/literal_list"
import {TitleFieldForm} from "./fields/title"
import {NameListForm} from "./fields/name_list"
import {RangeListForm} from "./fields/range_list"
import {URIFieldForm} from "./fields/uri"
import {VerbatimFieldForm} from "./fields/verbatim"
import {TagListForm} from "./fields/tag_list"
import {KeyFieldForm} from "./fields/key"
import {KeyListForm} from "./fields/key_list"
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
    constructor(bibDB, itemId = false) {
        this.bibDB = bibDB
        this.itemId = itemId
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
        return this.createForm()
    }

    addDialogToDOM() {
        let that = this
        // Add form to DOM
        let dialogHTML = bibDialog({
            'dialogHeader': this.dialogHeader,
            'bib_type': this.currentValues.bib_type,
            BibTypes,
            BibTypeTitles
        })

        document.body.insertAdjacentHTML('beforeend', dialogHTML)

        let diaButtons = {
            cancel: {
                class: "fw-button fw-orange",
                text: gettext('Cancel'),
                click: function() {
                    jQuery(this).dialog('close')
                }
            },
            strong: {
                class: "fw-button fw-small fw-green fw-left fw-strong fw-edit disabled",
                text: gettext('Strong'),
                click: () => {}
            },
            em: {
                class: "fw-button fw-small fw-green fw-left fw-em fw-edit disabled",
                text: gettext('Emphasis'),
                click: () => {}
            },
            smallcaps: {
                class: "fw-button fw-small fw-green fw-left fw-smallcaps fw-edit disabled",
                text: gettext('Small caps'),
                click: () => {}
            },
            sub: {
                class: "fw-button fw-small fw-green fw-left fw-sub fw-edit disabled",
                text: gettext('Subscript₊'),
                click: () => {}
            },
            sup: {
                class: "fw-button fw-small fw-green fw-left fw-sup fw-edit disabled",
                text: gettext('Supscript²'),
                click: () => {}
            },
            nocase: {
                class: "fw-button fw-small fw-green fw-left fw-nocase fw-edit disabled",
                text: gettext('CasE ProTecT'),
                click: () => {}
            }
        }

        return new Promise(resolve => {
            diaButtons.submit = {
                class: "fw-button fw-dark",
                text: gettext('Submit'),
                click: function() {
                    if (that.check()) {
                        let returnValue = that.save()
                        jQuery("#bib-dialog").dialog('close')
                        resolve(returnValue)
                    }
                }
            }

            jQuery("#bib-dialog").dialog({
                draggable: false,
                resizable: false,
                width: 940,
                height: 700,
                modal: true,
                buttons: diaButtons,
                close: () => jQuery("#bib-dialog").dialog('destroy').remove()
            })
            // init ui tabs
            jQuery('#bib-dialog-tabs').tabs()

            document.getElementById('select-bibtype').addEventListener(
                'change',
                () => resolve(this.changeBibType())
            )
        })
    }


    addField(fieldName, dom) {
        let fieldType = BibFieldTypes[fieldName]
        let fieldTitle
        if (BibFieldHelp[fieldName]) {
            fieldTitle = noSpaceTmp`
                <h4 class="fw-tablerow-title wtooltip">
                    ${BibFieldTitles[fieldName]}
                    <span class="tooltip">${BibFieldHelp[fieldName]}</span>
                </h4>
            `
        } else {
            fieldTitle = noSpaceTmp`
                <h4 class="fw-tablerow-title">
                    ${BibFieldTitles[fieldName]}
                </h4>
            `
        }

        dom.insertAdjacentHTML(
            'beforeend',
            noSpaceTmp`
                <tr>
                    <th>${fieldTitle}</th>
                    <td class="entry-field ${fieldName}"></td>
                </tr>`
        )
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
        let dialogPromise = this.addDialogToDOM()
        if (this.currentValues.bib_type !== false) {
            let eitherOrFields = document.getElementById('eo-fields')
            BibTypes[this.currentValues.bib_type].eitheror.forEach(fieldName => {
                this.addField(fieldName, eitherOrFields)
            })
            let reqFields = document.getElementById('req-fields')
            BibTypes[this.currentValues.bib_type].required.forEach(fieldName => {
                this.addField(fieldName, reqFields)
            })
            let optFields = document.getElementById('opt-fields')
            BibTypes[this.currentValues.bib_type].optional.forEach(fieldName => {
                this.addField(fieldName, optFields)
            })
            let entryCatField = document.getElementById('categories-field')
            this.entryCatForm = new EntryCatForm(entryCatField, this.currentValues.entry_cat, this.bibDB.cats)
            this.entryCatForm.init()

            if (!this.bibDB.cats.length) {
                // There are no ctaegories to select from, so remove the categories tab.
                [].slice.call(document.querySelectorAll('#categories-tab, #categories-link')).forEach(
                    el => el.parentElement.removeChild(el)
                )
            }
        }
        return dialogPromise
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
        return this.createForm()
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
        return this.bibDB.saveBibEntries(
            saveObj,
            isNew
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
