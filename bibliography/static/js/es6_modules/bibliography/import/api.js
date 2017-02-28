import {BibLatexParser} from "biblatex-csl-converter"
import {searchApiTemplate, searchApiResultTemplate, searchApiResultTemplateDara, searchApiResultTemplateCrossref, searchApiResultTemplateWorldCat} from "./templates"
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
                    doi = encodeURIComponent(doi)
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

    //worldcat
        jQuery.ajax({
            data: {
                'q': searchTerm,
                wskey : '2RasCcWIc9xSPR02RgNKfs6VXBoq7Oi579XWZTNFhDEd8cZlFDg8Yp7at1OTMXVBo6coPbvjJGmnHEQU'
            },
            dataType: "xml",
            url: '/proxy/http://www.worldcat.org/webservices/catalog/search/opensearch?/select/',//q=civil&,
            success: function(result) {
                let jsonResult = xmlToJson(result)
                console.log("jsonResult")
                console.log(jsonResult.feed.entry[0]['dcIdentifier'])

                let list = $(result).find("entry")//.find("title")
                let isbn = $('dc\\:identifier, identifier', (list))
                //console.log(isbn[0].innerHTML)
                jQuery("#import-api-search-result-worldcat").empty()
                jQuery("#import-api-search-result-worldcat").html('Worldcat')
                jQuery('#import-api-search-result-worldcat').append(
                    searchApiResultTemplateWorldCat({items: jsonResult.feed.entry })//
                )

               jQuery('#import-api-search-result-worldcat .api-import').on('click', function() {
                    let isbn = jQuery(this).attr('data-isbn')
                    //isbn = isbn[0].innerHTML.replace('urn:ISBN:','')
                    alert(isbn)
                    that.downloadBibtexWorldCat(isbn)
                    that.dialog.dialog('close')
               })

            },

            error : function formatErrorMessage(jqXHR, exception) {
                console.log((JSON.stringify(jqXHR)))
                if (jqXHR.status === 0) {
                    return ('Not connected.\nPlease verify your network connection.');
                } else if (jqXHR.status == 404) {
                    return ('The requested page not found. [404]');
                } else if (jqXHR.status == 500) {
                    return ('Internal Server Error [500].');
                } else if (exception === 'parsererror') {
                    return ('Requested JSON parse failed.');
                } else if (exception === 'timeout') {
                    return ('Time out error.');
                } else if (exception === 'abort') {
                    return ('Ajax request aborted.');
                } else {
                    return ('Uncaught Error.\n' + jqXHR.responseText);
                }
            }
        })


    }

    downloadBibtex(id) {
        jQuery.ajax({
            dataType: 'text',
            method: 'GET',
            url: `/proxy/http://sowiportbeta.gesis.org/Record/${id}/Export?style=BibTeX`,
            success: response => {
                //console.log(response)
                this.importBibtex(response)

            }
        })
    }

    downloadBibtexDara(doi) {
        jQuery.ajax({
            dataType: 'text',
            method: 'GET',
            url: 'https://search.datacite.org/citation?format=bibtex&doi='+doi,//10.14469%2FCH%2F193083',

            success: response => {
                //console.log(response)
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
            url: 'http://api.crossref.org/works/'+doi+'/transform/application/x-bibtex',

            success: response => {
                //console.log(response)
                this.importBibtex(response)

            },
            error: function (request, status, error) {
                alert(request.responseText);
            }

        })
    }

    downloadBibtexWorldCat(isbn){
        isbn = isbn.replace('urn:ISBN:','')
        jQuery.ajax({
                dataType: 'text',
                method: 'GET',

                url: '/proxy/http://xisbn.worldcat.org/webservices/xid/isbn/'+isbn+'?method=getMetadata&format=json&fl=*',

                success: response => {
                    console.log(response)
                    let bibStr = this.isbnToBibtex(response)
                    this.importBibtex(bibStr)

                },

                error: function (xhr) {
                    alert(xhr.status)

                    //The message added to Response object in Controller can be retrieved as following.
                    console.log(xhr.responseText)
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

    isbnToBibtex(results){

        let temp = JSON.parse(JSON.stringify(results))
        var objJSON = eval("(function(){return " + temp + ";})()");


        let oclcnum = objJSON.list[0].oclcnum
        let title = objJSON.list[0].title
        let isbn = objJSON.list[0].isbn
        let year = objJSON.list[0].year
        let ed = objJSON.list[0].ed
        let author = objJSON.list[0].author
        let city = objJSON.list[0].city
        let lang = objJSON.list[0].lang
        let lccn = objJSON.list[0].lccn
        let form = objJSON.list[0].form
        let publisher = objJSON.list[0].publisher
        let url = objJSON.list[0].url[0]
        let bibStr = "@book{,"
        bibStr = bibStr.concat("oclcnum={",oclcnum,"},",
                                "title={",title,"},",
                                "isbn={",isbn,"},",
                                "year={",year,"},",
                                "ed={",ed,"},",
                                "author={",author,"},",
                                "city={",city,"},",
                                "lang={",lang,"},",
                                "lccn={",lccn,"},",
                                "form={",form,"},",
                                "publisher={",publisher,"},",
                                "url={",url,"}")
        return bibStr

    }

}


function    xmlToJson(xml) {

        // Create the return object
        var obj = {};

        if (xml.nodeType == 1) { // element
            // do attributes
            if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
                for (var j = 0; j < xml.attributes.length; j++) {
                    var attribute = xml.attributes.item(j);
                    obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                }
            }
        } else if (xml.nodeType == 3) { // text
            obj = xml.nodeValue;
        }

        // do children
        if (xml.hasChildNodes()) {
            for(var i = 0; i < xml.childNodes.length; i++) {
                var item = xml.childNodes.item(i);
                var nodeName = item.nodeName;
                if(nodeName == 'dc:identifier'){
                    nodeName = 'dcIdentifier'
                }
                if (typeof(obj[nodeName]) == "undefined") {
                    obj[nodeName] = xmlToJson(item);
                } else {
                    if (typeof(obj[nodeName].push) == "undefined") {
                        var old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xmlToJson(item));
                }
            }
        }
        return obj;
    }

