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
                    'format': 'json',
                    'q': searchTerm,
                    'do': 'overall',
                    'rows': 5,
                    'start': 0,
                    'fl': 'id title doi description'
                },
                dataType: "text", // DataType is an empty text string in case there is no api key.
                url: '/proxy/http://sowiportbeta.gesis.org/devwork/service/solr/solr_query.php',
                success: result => {
                    if (result === '') {
                        // No result -- likely due to missing API key.
                        resolve()
                        return
                    }
                    let json = JSON.parse(result)
                    let items = json['response']['docs']
                    jQuery("#bibimport-search-result-sowiport").empty()
                    if (items.length) {
                        jQuery("#bibimport-search-result-sowiport").html('<h3>Sowiport</h3>')
                    }
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
