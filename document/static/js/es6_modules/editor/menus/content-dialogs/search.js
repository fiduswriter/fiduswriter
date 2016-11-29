import {searchTemplate,sowidaraTemplate} from "./templates"

/**
 * Class to search in dara and sowiport
 */
export class SearchDialog {
    constructor(mod) {
        this.editor = mod.editor
        this.dialog()
    }

    dialog() {
        let search = searchTemplate()
        jQuery('#search-box-container').append(search)

        jQuery('#search').bind('click', function() {
            jQuery.ajax({
                data: {'wt':'json', 'q':jQuery("#text-search").val()},
                dataType: "jsonp",
                jsonp: 'json.wrf',
                //url: 'http://www.da-ra.de/solr/dara/select?q=geld&isPublic_b:true&fq=isReference_s:registered&fl=doi,title,title_de,title_en,principalInvestigator,publicationDate,description,description_en,description_de,id&wt=json&indent=true&start=0&rows=10',
                url: 'http://sowiportbeta.gesis.org/solr/select/?rows=50&start=51&indent=false&qf=title_full^700+title_sub^700+title_de_txt^450+title_en_txt^450+title_es_txt^450+Satit_str^500+Sseries_str_mv^300+journal_title_txt_mv^150+zsabk_str^200+publications_str^400+conf_str_mv+description_de_txt_mv^450+description_en_txt_mv^450+description_es_txt_mv^450+person_author_txtP_mv^700+person_editor_txtP_mv^600+person_supervisor_txtP_mv^450+person_projectmanager_txtP_mv^450+person_other_txtP_mv^450+Shrsg_str_mv^650+proj_editor_txtP_mv^700+proj_supervisor_txtP_mv^450+proj_tutor_txtP_mv^450+proj_other_txtP_mv^450+corp_research_isn_str_mv^450+id^450+entryId_str^450+anum_no_str^250+isbn^450+zsissn_str_mv^450+issn^450+recorddoi_str_mv^450+recordurn_str_mv^450+recordurl_str_mv^450+classification_no_str_mv^450+topic_no_str_mv^250+classification_txtP_mv^400+meth_str_mv^300+topic^650+topic_free_str_mv^650+topic_geogr_str^650+topic_de_str_mv^650+topic_en_str_mv^650+search_schlagwoerter_txtP_mv^300+corp_research_txtP_mv^500+corp_funder_txtP_mv^150+corp_author_txtP_mv^700+corp_editor_txtP_mv^600+corp_other_txtP_mv^150+proj_editor_affil_str_mv+proj_projectmanager_affil_str_mv+proj_supervisor_affil_str_mv+proj_tutor_affil_str_mv+proj_other_affil_str_mv+person_author_affil_str_mv+person_editor_affil_str_mv+person_other_affil_str_mv+search_date_str_mv+Sverl_str^300+approach_str^300+dataaquisition_str^300+search_nummern_txt_mv^650+duplicate_id_link_str_mv^650&defType=edismax&boost=recip(ms(NOW%2CpublishDate_date)%2C3.16e-11%2C1%2C1)&mm=4<-1+7<80%25&fl=*%2Cscore&fq=informationtype_str%3A"literature"&spellcheck=true&spellcheck.q=armut&spellcheck.dictionary=basicSpell&hl=true&hl.fl=*&hl.simple.pre={{{{START_HILITE}}}}&hl.simple.post={{{{END_HILITE}}}}&wt=json&json.nl=arrarr',
                success: function (result) {
                    let list =result['response']
                    jQuery("#sowoDaraResult").remove()
                    jQuery('#sowidaraSearch').append(sowidaraTemplate({items:list.docs}))
                    console.log(list.docs)
                    //console.log(result)
                }
            })

        })

    }

}
