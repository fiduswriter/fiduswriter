import {opfImageItemTemplatePart, opfCssItemTemplatePart} from "../../../exporter/epub/templates"


/** A template to create the OPF file of book epubs. */
export let epubBookOpfTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="<%= idType %>" xml:lang="<%= language %>" prefix="cc: http://creativecommons.org/ns#">\n\
    \t<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n\
    \t\t<dc:identifier id="<%= idType %>"><%= aBook.id %></dc:identifier>\n\
    \t\t<dc:title><%= aBook.title %></dc:title>\n\
    \t\t<dc:creator><% if (aBook.metadata.author && aBook.metadata.author != "") {\
            print(aBook.metadata.author);\
        } else {\
            print(user.name);\
        } %></dc:creator>\n\
    \t\t<dc:language><%= language %></dc:language>\n\
    \t\t<dc:date><%= date %></dc:date>\n\
    <% if (aBook.metadata.copyright && aBook.metadata.copyright != "") { %>\
    \t\t<dc:rights><%- aBook.metadata.copyright %></dc:rights>\
    <% } %>\
    <% if (aBook.metadata.publisher && aBook.metadata.publisher != "") { %>\
    \t\t<dc:publisher><%- aBook.metadata.publisher %></dc:publisher>\
    <% } %>\
    \t\t<meta property="dcterms:modified"><%= modified %></meta>\n\
    <% if (aBook.metadata.keywords && aBook.metadata.keywords != "") {\
        _.each(aBook.metadata.keywords.split(","),function(keyword) { %>\
            <dc:subject><%- jQuery.trim(keyword) %></dc:subject>\
    <% }); } %>\
    \t</metadata>\n\
    \t<manifest>\n\
    <% if (coverImage) { %>\
        <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\
    <% } %>\
    <item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>\
    <% _.each(chapters, function (aChapter) { %>\
        \t\t<item id="t<%- aChapter.number %>" href="document-<%- aChapter.number %>.xhtml" media-type="application/xhtml+xml" />\n\
    <% }); %>\
    \t\t<item id="nav" href="document-nav.xhtml" properties="nav" media-type="application/xhtml+xml" />\n\
        <item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>\
        <% _.each(images,function(item, index){ %>' +
            opfImageItemTemplatePart +
        '<% }); %>\
        <% _.each(styleSheets,function(item, index){ %>' +
            opfCssItemTemplatePart +
        '<% }); %>\
        <% if (math) { %> <%= katexOpfIncludes %><% }%>\
    \t\t<!-- ncx included for 2.0 reading system compatibility: -->\n\
    \t\t<item id="ncx" href="document.ncx" media-type="application/x-dtbncx+xml" />\n\
    \t</manifest>\n\
    \t<spine toc="ncx">\n\
        <% if (coverImage) { %>\
            \t\t<itemref idref="cover" linear="no"/>\
        <% } %>\
        <itemref idref="titlepage" linear="yes"/>\
        <% _.each(chapters, function (aChapter) { %>\
            \t\t<itemref idref="t<%- aChapter.number %>" linear="yes" />\n\
        <% }); %>\
        <itemref idref="copyright" linear="yes"/>\
        <itemref idref="nav" linear="no"/>\
    \t</spine>\n\
    </package>\
    ')
/** A template to create the book epub cover XML. */
export let epubBookCoverTemplate = _.template('\
<?xml version="1.0" encoding="UTF-8"?>\
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\
    <head>\
        <title><%- aBook.title %></title>\
        <meta charset="utf-8"/>\
    </head>\
    <body>\
        <div id="cover">\
            <img src="<%= coverImage.image.split("/").pop().split("?")[0] %>" alt="'+gettext('Cover Image')+'" title="Cover Image"/>\
        </div>\
    </body>\
</html>\
')

/** A template to create the book epub titlepage XML. */
export let epubBookTitlepageTemplate = _.template('\
<?xml version="1.0" encoding="UTF-8"?>\
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\
   <head>\
      <title><%- aBook.title %></title>\
      <meta charset="utf-8"/>\
   </head>\
   <body style="text-align: center;">\
      <div id="title" epub:type="frontmatter titlepage">\
          <h1><%- aBook.title %></h1>\
          <% if (aBook.metadata.subtitle !="") { %>\
            <h2><%- aBook.metadata.subtitle %></h2>\
          <% } %>\
          <% if (aBook.metadata.author !="") { %>\
            <h3>'+gettext('by')+' <%- aBook.metadata.author %></h3>\
          <% } %>\
      </div>\
   </body>\
</html>\
')

/** A template to create the book epub copyright page XML. */
export let epubBookCopyrightTemplate = _.template('\
<?xml version="1.0" encoding="UTF-8"?>\
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\
    <head>\
        <title><%- aBook.title %></title>\
        <meta charset="utf-8"/>\
    </head>\
    <body>\
        <section epub:type="frontmatter copyright-page">\
            <div id="copyright">\
                <p>\
                    <%- aBook.title %>\
                    <% if (aBook.metadata.author !="") { %>\
                        '+gettext('by')+' <%- aBook.metadata.author %>\
                    <% } %>\
                </p>\
                <% if (aBook.metadata.copyright !="") { %>\
                    <p><%- aBook.metadata.copyright %></p>\
                <% } %>\
                <p>'+gettext('Title')+': <% aBook.title %></p>\
                <% if (aBook.metadata.author && aBook.metadata.author !="") { %>\
                    <p>'+gettext('Author')+': <%- aBook.metadata.author %></p>\
                <% } %>\
                <% if (aBook.metadata.publisher && aBook.metadata.publisher !="") { %>\
                    <p>'+gettext('Published by')+': <%- aBook.metadata.publisher %></p>\
                <% } %>\
                <p>'+gettext('Last Updated')+': <%= aBook.updated %></p>\
                <p>'+gettext('Created')+': <%= aBook.added %></p>\
                <p>'+gettext('Language')+': <%= language %></p>\
                <p>'+gettext('Created by')+': <%= creator %></p>\
            </div>\
        </section>\
    </body>\
</html>\
')
