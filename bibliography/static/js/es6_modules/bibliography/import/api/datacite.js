import {searchApiResultDataciteTemplate} from "./templates"

export class DataciteSearcher {

    constructor(importer) {
        this.importer = importer
    }

    bind() {
        let that = this
        jQuery('#bibimport-search-result-datacite .api-import').on('click', function() {
            let doi = jQuery(this).attr('data-doi')
            that.getBibtex(doi)
        })
    }

    lookup(searchTerm) {

        return new Promise(resolve => {
            jQuery.ajax({
                data: {
                    'query': searchTerm,
                    'member-id' : 'gesis'
                },
                dataType: "json",
                url: '/proxy/https://api.datacite.org/works?/select',
                success: result => {
                    let items = result['data']
                    jQuery("#bibimport-search-result-datacite").empty()
                    jQuery("#bibimport-search-result-datacite").html(gettext('Dara'))
                    jQuery('#bibimport-search-result-datacite').append(
                        searchApiResultDataciteTemplate({items})
                    )
                    this.bind()
                    resolve()
                }
            })
        })
    }

    getBibtex(doi) {
        doi = encodeURIComponent(doi)
        jQuery.ajax({
            dataType: 'text',
            method: 'GET',
            url: 'https://search.datacite.org/citation?format=bibtex&doi='+doi,
            success: response => {
                this.importer.importBibtex(response)
            }

        })
    }

}
