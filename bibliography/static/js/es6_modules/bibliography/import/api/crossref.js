import {searchApiResultCrossrefTemplate} from "./templates"

export class CrossrefSearcher {

    constructor(importer) {
        this.importer = importer
    }

    bind() {
        let that = this
        jQuery('#bibimport-search-result-crossref .api-import').on('click', function() {
             let doi = jQuery(this).attr('data-doi')
             that.getBibtex(doi)
         })
    }

    lookup(searchTerm) {
        return new Promise(resolve => {
            jQuery.ajax({
                data: {
                    'q': searchTerm,
                    "startPage": 1
                },
                "itemsPerPage": 5,
                dataType: "json",
                url: 'http://search.crossref.org/dois?q=q&header=true',

                success: result => {
                    let items = result['items']
                    jQuery("#bibimport-search-result-crossref").empty()
                    jQuery("#bibimport-search-result-crossref").html('Crossref')

                    jQuery('#bibimport-search-result-crossref').append(
                        searchApiResultCrossrefTemplate({items})
                    )
                    this.bind()
                    resolve()
                }
            })
        })
    }

    getBibtex(doi) {
        doi = doi.replace('http://dx.doi.org/','')
        jQuery.ajax({
            dataType: 'text',
            method: 'GET',
            url: `http://api.crossref.org/works/${doi}/transform/application/x-bibtex`,
            success: response => {
                this.importer.importBibtex(response)
            },
            error: (request, status, error) => {
                console.error(request.responseText)
            }

        })
    }

}
