/** A template for the bibliography item edit dialog. */
export let bibDialog = _.template('\
    <div id="bib-dialog" title="<%- dialogHeader %>">\
        <div class="select-container">\
            <select id="select-bibtype" class="fw-button fw-white fw-large" required>\
                <% if (bib_type===false) { %>\
                    <option class="placeholder" selected disabled value="">' + gettext('Select source type') + '</option>\
                <% } %>\
                <% Object.keys(BibTypes).forEach(function(key) { %>\
                    <option value="<%- key %>" <%= key === bib_type ? "selected" : "" %>><%= BibTypeTitles[key] %></option>\
                <% }) %>\
            </select>\
            <div class="select-arrow icon-down-dir"></div>\
        </div>\
        <div id="bib-dialog-tabs">\
            <ul>\
                <li><a href="#req-fields-tab" class="fw-button fw-large">' + gettext('Required Fields') + '</a></li>\
                <li><a href="#opt-fields-tab" class="fw-button fw-large">' + gettext('Optional Fields') + '</a></li>\
                <li><a href="#categories-tab" class="fw-button fw-large">' + gettext('Categories') + '</a></li>\
            </ul>\
            <div id="req-fields-tab">\
                <table class="fw-dialog-table"><tbody id="eo-fields"></tbody></table>\
                <table class="fw-dialog-table"><tbody id="req-fields"></tbody></table>\
            </div>\
            <div id="opt-fields-tab"><table class="fw-dialog-table"><tbody id="opt-fields"></tbody></table></div>\
            <div id="categories-tab"><table class="fw-dialog-table">\
                <tbody>\
                    <tr><th><h4 class="fw-tablerow-title">' + gettext('Categories') + '</h4></th><td id="categories-field"></td></tr>\
                </tbody>\
            </table></div>\
        </div>\
    </div>')



export let Cite =
_.template('\
    <div id="sowidaraSearch1" title="<%- dialogHeader %>">\
        <p><input id="text-search" class="linktitle" type="text" value="" placeholder="' + gettext("give the text to search") + '"/></p>\
        <p><button id="search" type="button">search</button></p><br>\
    </div>\
   ')



export let searchTemplate = _.template('\
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

