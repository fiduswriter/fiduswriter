/** a template for the BibTeX file import dialog */
export let importBibFileTemplate = _.template('<div id="importbibtex" title="' + gettext('Import a BibTex library') + '">\
        <form id="import-bib-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="bib-uploader" name="bib" required />\
            <span id="import-bib-btn" class="fw-button fw-white fw-large">' + gettext('Select a file') + '</span>\
            <label id="import-bib-name" class="ajax-upload-label"></label>\
        </form>\
    </div>')


export let searchApiTemplate = _.template('\
<div id="sowidaraSearch" title="' + gettext("Link") + '">\
        <p><input id="text-search" class="linktitle" type="text" value="" placeholder="' + gettext("give the text to search") + '"/></p>\
        <p><button id="search" type="button">search</button></p><br>\
    </div>\
')

export let sowidaraTemplate = _.template('\
    <div  id="sowoDaraResult" title="'+gettext("Result")+'"><%  _.each(items, function(item) {%>\
    <div class="item">\
        <h3 style="border-top: 1px solid #d3d3d3;margin-bottom:5px;margin-top:5px;" ><a class="title" id = <%=item.id %> itemTitle = <%=item.title %>  itemAuthor = <%=(item.person_author_normalized_str_mv) %>  itemDate = <%= item.date_imported_str %>  target="_blank" href="http://www.da-ra.de/dara/search/search_show?res_id=<%=item.id %>&lang=de&mdlang=de&detail=true"><%= item.title %></a></h3>\
        <p   style="margin-top:5px;margin-bottom:5px"><b>DOI: </b><a target="_blank" style="color:blue" href="http://dx.doi.org/<%= item.doi %>"><%= item.doi %></a></p>\
        <p><b>Description: </b><%= item.description %></p>\
        <button type="button" class="citing" >citing the article</button>\
    </div>\
   <% })  %> \
</div>\
')
