import {BibFieldTypes, BibTypes} from "biblatex-csl-converter/lib/const"
import {BibFieldTitles, BibTypeTitles, BibFieldHelp} from "./strings"
import {bibDialog, Cite, searchTemplate, sowidaraTemplate} from "./templates"
import {addAlert, noSpaceTmp} from "../../common/common"
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
import {nameToText, litToText} from "../tools"


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

        let diaButtons = {
            submit: {
                class: "fw-button fw-dark",
                text: gettext('Submit'),
                click: function() {
                    if (that.check()) {
                        that.save()
                        jQuery(this).dialog('close')
                    }
                }
            },
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

        jQuery("#bib-dialog").dialog({
            draggable: false,
            resizable: false,
            width: 940,
            height: 700,
            modal: true,
            buttons: diaButtons,
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



export class CiteForm {
    constructor(mod, itemId, bibDB, callback) {
        if (itemId === undefined) {
            this.itemId = false
        } else {
            this.itemId = parseInt(itemId)
        }
        this.bibDB = bibDB
        this.callback = callback
        this.fields = {}
        this.currentValues = {}
        this.editor = mod.editor
        this.mod = mod
    }

    init() {
        if (this.itemId) {
            this.dialogHeader = gettext('Edit Source')
            let bibEntry = this.bibDB.db[this.itemId]
            this.currentValues = JSON.parse(JSON.stringify(bibEntry)) // copy current values
        } else {

            this.dialogHeader = gettext('Import New Source from Database')
            this.currentValues = {
                bib_type: false,
                entry_cat: [],
                entry_key: 'FidusWriter',
                fields: {}
            }
        }
        this.addDialogToDOM()
    }

    addDialogToDOM() {
        let that = this
        // Add form to DOM
        let dialogEl = Cite({
            'dialogHeader': this.dialogHeader,
            'bib_type': this.currentValues.bib_type,
            BibTypes,
            BibTypeTitles
        })

        jQuery('body').append(dialogEl)

        let diaButtons = {

            cancel: {
                class: "fw-button fw-orange",
                text: gettext('Cancel'),
                click: function() {
                    jQuery(this).dialog('close')
                }
            }

        }


        jQuery("#sowidaraSearch1").dialog({
            draggable: false,
            resizable: false,
            width: 940,
            height: 700,
            modal: true,
            buttons: diaButtons,
            close: function() {
                jQuery("#sowidaraSearch1").dialog('destroy').remove()
            }
        })
        // init ui tabs
        //jQuery('#bib-dialog-tabs').tabs()

        document.getElementById('text-search').addEventListener('change', () => {
          that.searching()
        })
    }



     searching() {
        let that = this
           jQuery.ajax({
                data: {'wt':'json', 'q':jQuery("#text-search").val()},
                dataType: "jsonp",
                jsonp: 'json.wrf',
                url: 'http://sowiportbeta.gesis.org/solr/select/?rows=50&start=51&indent=false&qf=title_full^700+title_sub^700+title_de_txt^450+title_en_txt^450+title_es_txt^450+Satit_str^500+Sseries_str_mv^300+journal_title_txt_mv^150+zsabk_str^200+publications_str^400+conf_str_mv+description_de_txt_mv^450+description_en_txt_mv^450+description_es_txt_mv^450+person_author_txtP_mv^700+person_editor_txtP_mv^600+person_supervisor_txtP_mv^450+person_projectmanager_txtP_mv^450+person_other_txtP_mv^450+Shrsg_str_mv^650+proj_editor_txtP_mv^700+proj_supervisor_txtP_mv^450+proj_tutor_txtP_mv^450+proj_other_txtP_mv^450+corp_research_isn_str_mv^450+id^450+entryId_str^450+anum_no_str^250+isbn^450+zsissn_str_mv^450+issn^450+recorddoi_str_mv^450+recordurn_str_mv^450+recordurl_str_mv^450+classification_no_str_mv^450+topic_no_str_mv^250+classification_txtP_mv^400+meth_str_mv^300+topic^650+topic_free_str_mv^650+topic_geogr_str^650+topic_de_str_mv^650+topic_en_str_mv^650+search_schlagwoerter_txtP_mv^300+corp_research_txtP_mv^500+corp_funder_txtP_mv^150+corp_author_txtP_mv^700+corp_editor_txtP_mv^600+corp_other_txtP_mv^150+proj_editor_affil_str_mv+proj_projectmanager_affil_str_mv+proj_supervisor_affil_str_mv+proj_tutor_affil_str_mv+proj_other_affil_str_mv+person_author_affil_str_mv+person_editor_affil_str_mv+person_other_affil_str_mv+search_date_str_mv+Sverl_str^300+approach_str^300+dataaquisition_str^300+search_nummern_txt_mv^650+duplicate_id_link_str_mv^650&defType=edismax&boost=recip(ms(NOW%2CpublishDate_date)%2C3.16e-11%2C1%2C1)&mm=4<-1+7<80%25&fl=*%2Cscore&fq=informationtype_str%3A"literature"&spellcheck=true&spellcheck.q=armut&spellcheck.dictionary=basicSpell&hl=true&hl.fl=*&hl.simple.pre={{{{START_HILITE}}}}&hl.simple.post={{{{END_HILITE}}}}&wt=json&json.nl=arrarr',

                success: function (result) {
                    let list =result['response']
                    jQuery("#sowoDaraResult").remove()
                    jQuery('#sowidaraSearch1').append(sowidaraTemplate({items:list.docs}))
                    console.log("list.docs[0]")
                    console.log(list.docs[0])
                         jQuery('.citing').bind('click', function() {
                        var id = jQuery(this).parent().find("a.title").attr('id')
                        var result = that.getByValue(list.docs, id)
                        var itemTitle = result.title_full
                        var author    = jQuery(this).parent().find("a.title").attr('itemAuthor')

                        var date      = result.publishDate_date
                        let bib_type = 'article'
                        var bibFormat = "autocite"
                        let editor = that.mod.editor
                        let nodeType = editor.currentPm.schema.nodes['citation']

                        that.save((id), bib_type, author,date, editor, itemTitle)

                        let bibEntry =  editor.bibDB.getID()

                        editor.currentPm.tr.replaceSelection(nodeType.createAndFill({
                            format: bibFormat,
                            references: [{id: (bibEntry)}]
                        })).apply()
                    })
                },
           })
        }


      getByValue(arr, value) {

      for (var i=0, iLen=arr.length; i<iLen; i++) {

        if (arr[i].id == value){

         return arr[i];}
      }
    }


    save(itemId, bib_type, author, date, editor, itemTitle) {
        let entry_key = 'FidusWriter'
        let that = this
        let isNew = itemId===undefined ? false : true
        let Id = itemId===false ? 0 : itemId
        let returnObj = {
                bib_type: bib_type,

                entry_cat:  [],
                entry_key: entry_key, // is never updated.
                fields: {}

            }

        returnObj['fields']['author'] =  [{"family":[{"type":"text","text":author}],"given":[{"type":"text","text":author}]}]
        returnObj['fields']['date'] = date
        returnObj['fields']['title'] =  [{type: 'text', text: itemTitle}]
        //returnObj['fields']['journaltitle'] =  [{type: 'text', text: "journal"}]

        let saveObj = {}
        saveObj[Id] = returnObj

        if (saveObj[Id].entry_key==='FidusWriter') {
            this.createEntryKey(saveObj[itemId],author,date)
        }

         editor.bibDB.saveBibEntries(
            saveObj,
            isNew,
            this.callback
        )

    }


    createEntryKey(bibItem,author,date) {
            // We attempt to create a biblatex compatible entry key if there is no entry
            // key so far.
            let that = this
            let entryKey = ''


            if (author.length) {
                entryKey += nameToText(author).replace(/\s|,|=|;|:|{|}/g,'')
            } /*else if (bibItem.editor) {
                entryKey += nameToText(bibItem.editor).replace(/\s|,|=|;|:|{|}/g,'')
            }*/
            if (date.length) {
                entryKey += date.split('-')[0].replace(/\?|\*|u|\~|-/g,'')
            }

            if (entryKey.length) {
                bibItem.entry_key = entryKey
            }
        }


    textToInt(txt){
        txt= txt.toLowerCase();
        let number = 0
        return txt.split('').map(function(c){
         number = parseInt(number) + parseInt('abcdefghijklmnopqrstuvwxyz'.indexOf(c))
         return parseInt(number);
    });
    }



}


