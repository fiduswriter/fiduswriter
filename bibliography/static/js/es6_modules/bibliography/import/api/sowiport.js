import {searchApiResultSowiportTemplate} from "./templates"

export class SowiportSearcher {

    constructor(importer) {
        this.importer = importer
    }

    bind() {
        let that = this
        jQuery('#bibimport-search-result-sowiport .api-import').on('click', function() {
            let id = jQuery(this).attr('data-id')
            that.getBibtex(id)
        })
    }

    lookup(searchTerm) {
        return new Promise(resolve => {
            jQuery.ajax({
                data: {
                    'wt': 'json',
                    'q': searchTerm,
                    'qf': 'title_full title_sub title_de_txt title_en_txt title_es_txt Satit_str Sseries_str_mv journal_title_txt_mv zsabk_str publications_str conf_str_mv description_de_txt_mv description_en_txt_mv description_es_txt_mv person_author_txtP_mv person_editor_txtP_mv person_supervisor_txtP_mv person_projectmanager_txtP_mv person_other_txtP_mv Shrsg_str_mv proj_editor_txtP_mv proj_supervisor_txtP_mv proj_tutor_txtP_mv proj_other_txtP_mv corp_research_isn_str_mv id entryId_str anum_no_str isbn zsissn_str_mv issn recorddoi_str_mv recordurn_str_mv recordurl_str_mv classification_no_str_mv topic_no_str_mv classification_txtP_mv meth_str_mv topic topic_free_str_mv topic_geogr_str topic_de_str_mv topic_en_str_mv search_schlagwoerter_txtP_mv corp_research_txtP_mv corp_funder_txtP_mv corp_author_txtP_mv corp_editor_txtP_mv corp_other_txtP_mv proj_editor_affil_str_mv proj_projectmanager_affil_str_mv proj_supervisor_affil_str_mv proj_tutor_affil_str_mv proj_other_affil_str_mv person_author_affil_str_mv person_editor_affil_str_mv person_other_affil_str_mv search_date_str_mv Sverl_str approach_str dataaquisition_str search_nummern_txt_mv duplicate_id_link_str_mv',
                    'rows': 5,
                    'defType': 'edismax',
                    'fl': 'id title doi description'
                },
                dataType: "jsonp",
                jsonp: 'json.wrf',
                url: 'http://sowiportbeta.gesis.org/solr/select/',

                success: result => {
                    let list = result['response']
                    let items = list.docs
                    jQuery("#bibimport-search-result-sowiport").empty()
                    jQuery("#bibimport-search-result-sowiport").html('Sowiport')
                    jQuery('#bibimport-search-result-sowiport').append(
                        searchApiResultSowiportTemplate({items})
                    )
                    this.bind()
                    resolve()
                }
            })
        })
    }

    getBibtex(id) {
        jQuery.ajax({
            dataType: 'text',
            method: 'GET',
            url: `/proxy/http://sowiportbeta.gesis.org/Record/${id}/Export?style=BibTeX`,
            success: response => {
                this.importer.importBibtex(response)
            }
        })
    }

}
