import {BibLatexParser} from "biblatex-csl-converter"
import {searchApiTemplate, searchApiResultTemplate, searchApiResultTemplateDara, searchApiResultTemplateCrossref} from "./templates"
import {activateWait, deactivateWait, addAlert, csrfToken} from "../../common"

export class BibLatexApiImporter {
    constructor(bibDB, addToListCall) {
        this.bibDB = bibDB
        this.addToListCall = addToListCall
        this.dialog = false
    }

    init() {
        // Add form to DOM
        let that = this
        this.dialog = jQuery(searchApiTemplate({}))
        this.dialog.dialog({
            draggable: false,
            resizable: false,
            width: 940,
            height: 700,
            modal: true,
            buttons: {
                close: {
                    class: "fw-button fw-orange",
                    text: gettext('Close'),
                    click: () => {
                        this.dialog.dialog('close')
                    }
                }
            },
            close: () => {
                this.dialog.dialog('destroy').remove()
            }
        })

        document.getElementById('text-search').addEventListener('input', () => {

            let searchTerm = jQuery("#text-search").val()
            jQuery("#import-api-search-result").empty()
            jQuery('.api-search').bind('click', function() {
                if(searchTerm.length == 2 && searchTerm != ''){
                    jQuery("#import-api-search-result").html('Looking...')
                    that.search(searchTerm)
                }
        })

        if (searchTerm.length > 3 ) {
                jQuery("#import-api-search-result").html('Looking...')
                that.search(searchTerm)
            }
        })
    }

    search(searchTerm) {
        let that = this
        //Dara
        jQuery.ajax({
                data: {
                    'query': searchTerm,
                    'member-id' : 'gesis',
                },
                dataType: "json",
                url: 'https://api.datacite.org/works?/select',
                success: function(result) {

                    let list = result['data']
                    jQuery("#import-api-search-result-dara").empty()
                    jQuery("#import-api-search-result-dara").html('Dara')
                    jQuery('#import-api-search-result-dara').append(
                        searchApiResultTemplateDara({items: list})
                    )
                jQuery('#import-api-search-result-dara .api-import').on('click', function() {
                    let doi = jQuery(this).attr('data-doi')
                    that.downloadBibtexDara(doi)
                    that.dialog.dialog('close')
                })


                }
        })
        //sowiport
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
            url: '/proxy/http://sowiportbeta.gesis.org/solr/select/',

            success: function(result) {
                let list = result['response']
                jQuery("#import-api-search-result").empty()
                jQuery("#import-api-search-result").html('Sowiport')
                jQuery('#import-api-search-result').append(
                    searchApiResultTemplate({items: list.docs})
                )
                jQuery('#import-api-search-result .api-import').on('click', function() {
                    let id = jQuery(this).attr('data-id')
                    that.downloadBibtex(id)
                    that.dialog.dialog('close')
                })
            }
        })

    //http://search.crossref.org/help/api
        jQuery.ajax({
            data: {
                'q': searchTerm,
                "startPage": 1
            },
            "itemsPerPage": 5,
            dataType: "json",
            url: 'http://search.crossref.org/dois?q=q&header=true',

            success: function(result) {
                let list = result['items']
                jQuery("#import-api-search-result-crossref").empty()
                jQuery("#import-api-search-result-crossref").html('Crossref')

                jQuery('#import-api-search-result-crossref').append(
                    searchApiResultTemplateCrossref({items: list})
                )
               jQuery('#import-api-search-result-crossref .api-import').on('click', function() {
                    let doi = jQuery(this).attr('data-doi')
                    alert(doi)
                    that.downloadBibtexCrossref(doi)
                    that.dialog.dialog('close')
                })
            }
        })

    }

    downloadBibtex(id) {
        jQuery.ajax({
            dataType: 'text',
            method: 'GET',
            url: `/proxy/http://sowiportbeta.gesis.org/Record/${id}/Export?style=BibTeX`,
            success: response => {
                console.log(response)
                this.importBibtex(response)

            }
        })
    }

    downloadBibtexDara(doi) {
        jQuery.ajax({
            dataType: 'text',
            method: 'GET',
            url: 'https://search.datacite.org/citation?format=bibtex&doi=10.14469%2FCH%2F193083',

            success: response => {
                console.log(response)
                this.importBibtex(response)

            }

        })
    }


    downloadBibtexCrossref(doi1){
        let doi = doi1.replace('http://dx.doi.org/','')
        alert(doi)
        jQuery.ajax({
            dataType: 'text',
            method: 'GET',
            url: 'http://api.crossref.org/works/10.5555/12345678/transform/application/x-bibtex',

            success: response => {
                console.log(response)
                this.importBibtex(response)

            },
            error: function (request, status, error) {
                alert(request.responseText);
            }

        })
    }

    importBibtex(bibtex) {
        // Mostly copied from ./file.js
        let bibData = new BibLatexParser(bibtex)

        let tmpDB = bibData.output

        let bibKeys = Object.keys(tmpDB)
        // There should only be one bibkey
        // We iterate anyway, just in case there is more than one.
        bibKeys.forEach(bibKey => {
            let bibEntry = tmpDB[bibKey]
            // We add an empty category list for all newly imported bib entries.
            bibEntry.entry_cat = []
            // If the entry has no title, add an empty title
            if (!bibEntry.fields.title) {
                bibEntry.fields.title = []
            }
            // If the entry has no date, add an uncertain date
            if (!bibEntry.fields.date) {

                if(bibEntry.fields.year)
                    bibEntry.fields.date = bibEntry.fields.year
                else
                    bibEntry.fields.date = 'uuuu'

            }
            // If the entry has no editor or author, add empty author
            if (!bibEntry.fields.author && !bibEntry.fields.editor) {
                bibEntry.fields.author = [{'literal': []}]
            }
        })
        this.bibDB.saveBibEntries(tmpDB, true).then(idTranslations => {
            let newIds = idTranslations.map(idTrans => idTrans[1])
            this.addToListCall(newIds)
        })
    }

}

