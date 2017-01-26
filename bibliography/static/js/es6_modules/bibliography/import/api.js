import {searchApiTemplate, sowidaraTemplate} from "./templates"


export class BibLatexApiImporter {
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
        let dialogEl = searchApiTemplate({
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


        jQuery("#sowidaraSearch").dialog({
            draggable: false,
            resizable: false,
            width: 940,
            height: 700,
            modal: true,
            buttons: diaButtons,
            close: function() {
                jQuery("#sowidaraSearch").dialog('destroy').remove()
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
                    jQuery('#sowidaraSearch').append(sowidaraTemplate({items:list.docs}))
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
        txt= txt.toLowerCase()
        let number = 0
        return txt.split('').map(function(c){
            number = parseInt(number) + parseInt('abcdefghijklmnopqrstuvwxyz'.indexOf(c))
            return parseInt(number)
        })
    }



}
