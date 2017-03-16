import {searchApiResultWorldCatTemplate} from "./templates"

export class WorldcatSearcher {
    constructor(importer) {
        this.importer = importer
    }

    bind() {
        let that = this
        jQuery('#bibimport-search-result-worldcat .api-import').on('click', function() {
            let isbn = jQuery(this).attr('data-isbn')
            that.getBibtex(isbn)
        })
    }

    lookup(searchTerm) {
        return new Promise(resolve => {
            jQuery.ajax({
                data: {
                    'q': searchTerm
                },
                dataType: "xml",
                url: '/proxy/http://www.worldcat.org/webservices/catalog/search/opensearch?/select/',
                success: result => {
                    if (result === null) {
                        // No result -- likely due to missing API key.
                        resolve()
                        return
                    }
                    let jsonResult = this.xmlToJson(result)
                    let items = jsonResult.feed.entry
                    jQuery("#bibimport-search-result-worldcat").empty()
                    if (items.length) {
                        jQuery("#bibimport-search-result-worldcat").html('<h3>Worldcat</h3>')
                    }
                    jQuery('#bibimport-search-result-worldcat').append(
                        searchApiResultWorldCatTemplate({items})
                    )
                    this.bind()
                    resolve()
                }
            })
        })
    }

    getBibtex(isbn) {
        isbn = isbn.replace('urn:ISBN:', '')
        jQuery.ajax({
            dataType: 'text',
            method: 'GET',

            url: `/proxy/http://xisbn.worldcat.org/webservices/xid/isbn/${isbn}?method=getMetadata&format=json&fl=*`,

            success: response => {
                let bibStr = this.isbnToBibtex(response)
                this.importer.importBibtex(bibStr)
            },
            error: function(xhr) {
                console.error(xhr.status)
            }
        })
    }

    isbnToBibtex(results) {
        let objJSON = JSON.parse(JSON.stringify(results))
        //var objJSON = eval(`(function(){return ${temp};})()`);

        let title = objJSON.list[0].title
        let isbn = objJSON.list[0].isbn
        let year = objJSON.list[0].year
        let editor = objJSON.list[0].ed
        let author = objJSON.list[0].author
        let location = objJSON.list[0].city
        let language = objJSON.list[0].lang
        let publisher = objJSON.list[0].publisher
        let url = objJSON.list[0].url[0]
        let bibStr = ''
        bibStr = bibStr.concat(
            `@book{worldcat,`,
            `title={${title}},`,
            `isbn={${isbn}},`,
            `year={${year}},`,
            `editor={${editor}},`,
            `author={${author}},`,
            `location={${location}},`,
            `language={${language}},`,
            `publisher={${publisher}},`,
            `url={${url}}`,
            `}`
        )
        return bibStr

    }

    // xmlToJson: David Walsh 2011 MIT licensed, https://davidwalsh.name/convert-xml-json
    xmlToJson(xml) {
        // Create the return object
        let obj = {}

        if (xml.nodeType == 1) { // element
            // do attributes
            if (xml.attributes.length > 0) {
                obj["@attributes"] = {}
                for (let j = 0; j < xml.attributes.length; j++) {
                    let attribute = xml.attributes.item(j)
                    obj["@attributes"][attribute.nodeName] = attribute.nodeValue
                }
            }
        } else if (xml.nodeType == 3) { // text
            obj = xml.nodeValue
        }

        // do children
        if (xml.hasChildNodes()) {
            for (let i = 0; i < xml.childNodes.length; i++) {
                let item = xml.childNodes.item(i)
                let nodeName = item.nodeName
                if (nodeName === 'dc:identifier') {
                    nodeName = 'dcIdentifier'
                }
                if (typeof(obj[nodeName]) == "undefined") {
                    obj[nodeName] = this.xmlToJson(item)
                } else {
                    if (typeof(obj[nodeName].push) == "undefined") {
                        let old = obj[nodeName]
                        obj[nodeName] = []
                        obj[nodeName].push(old)
                    }
                    obj[nodeName].push(this.xmlToJson(item))
                }
            }
        }
        return obj
    }
}
