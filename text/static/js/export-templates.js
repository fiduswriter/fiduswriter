/**
 * This file is part of Fidus Writer <http://www.fiduswriter.org>
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

var tmp_epub_opf = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="<%= idType %>" xml:lang="<%= language %>" prefix="cc: http://creativecommons.org/ns#">\n\
    \t<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n\
    \t\t<dc:identifier id="<%= idType %>"><%= id %></dc:identifier>\n\
    \t\t<dc:title><%= title %></dc:title>\n\
    <% _.each(authors,function(author){ %>\
        \t\t<dc:creator><%= author %></dc:creator>\n\
    <% }); %>\
    <% _.each(keywords,function(keyword){ %>\
        \t\t<dc:subject><%= keyword %></dc:subject>\n\
    <% }); %>\
    \t\t<dc:language><%= language %></dc:language>\n\
    \t\t<dc:date><%= date %></dc:date>\n\
    \t\t<meta property="dcterms:modified"><%= modified %></meta>\n\
    \t</metadata>\n\
    \t<manifest>\n\
    \t\t<item id="t1" href="document.xhtml" <% if (mathjax) { %>properties="scripted svg" <% } %>media-type="application/xhtml+xml" />\n\
    \t\t<item id="nav" href="document-nav.xhtml" properties="nav" media-type="application/xhtml+xml" />\n\
        <% _.each(images,function(item, index){ %>\
            <%= tmp_epub_opf_image_item({"item":item, "index": index})%>\
        <% }); %>\
        <% _.each(styleSheets,function(item, index){ %>\
            <%= tmp_epub_opf_css_item({"item":item, "index": index})%>\
        <% }); %>\
        <% if (mathjax) {%>\
            <%= tmp_epub_opf_mathjax_items({})%>\
        <% }%>\
    \t\t<!-- ncx included for 2.0 reading system compatibility: -->\n\
    \t\t<item id="ncx" href="document.ncx" media-type="application/x-dtbncx+xml" />\n\
    \t</manifest>\n\
    \t<spine toc="ncx">\n\
    \t\t<itemref idref="t1" />\n\
    \t</spine>\n\
    </package>');

var tmp_epub_opf_css_item = _.template('\t\t\t<item id="css<%= index %>" href="<%= item.filename %>" media-type="text/css" />\n');     

var tmp_epub_opf_image_item = _.template('\t\t\t<item <% if (item.coverImage) { %>id="cover-image" properties="cover-image"<% } else { %>id="img<%= index %>"<% } %> href="<%= item.filename %>" media-type="image/<% if (item.filename.split(".")[1]==="png") { %>png<% } else if (item.filename.split(".")[1]==="svg") { %>svg+xml<% } else { %>jpeg<% } %>" />\n');     

var tmp_epub_container = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">\n\
    \t<rootfiles>\n\
    \t\t<rootfile full-path="EPUB/document.opf" media-type="application/oebps-package+xml"/>\n\
    \t</rootfiles>\n\
    </container>');
    
var tmp_epub_ncx = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <ncx xmlns:ncx="http://www.daisy.org/z3986/2005/ncx/" xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="<%= shortLang %>">\n\
        \t<head>\n\
                \t\t<meta name="dtb:<%= idType %>" content="<%= id %>"/>\n\
        \t</head>\n\
        \t<docTitle>\n\
            \t\t<text><%= title %></text>\n\
        \t</docTitle>\n\
        \t<navMap>\n\
                \t\t<!-- 2.01 NCX: playOrder is optional -->\n\
            <% _.each(contentItems,function(item){ %>\
               <%= tmp_epub_ncx_item({"item":item})%>\
            <% }); %>\
        \t</navMap>\n\
    </ncx>');
    
var tmp_epub_ncx_item = _.template('\
\t\t<navPoint id="<%= item.id %><% if (item.docNum) {print("-"+item.docNum);}%>">\n\
        \t\t\t<navLabel>\n\
            \t\t\t\t<text><%= item.title %></text>\n\
        \t\t\t</navLabel>\n\
        \t\t\t<content src="<% if (item.link) {print(item.link);} else { %>document<% if (item.docNum) {print("-"+item.docNum);}%>.xhtml#<% print(item.id) } %>"/>\n\
        <% _.each(item.subItems, function(item) { %>\
            <%= tmp_epub_ncx_item({"item":item})%>\
        <% }); %>\
    \t\t</navPoint>\n');
    
var tmp_epub_xhtml = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="<%= shortLang %>" lang="<%= shortLang %>"\
        xmlns:epub="http://www.idpf.org/2007/ops">\n<head><title><%= title %></title>\
        <% _.each(styleSheets,function(item){ %>\
            <%= _.template(tmp_epub_xhtml_css_item, {"item":item})%>\
        <% }); %>\
        <% if (mathjax) { %>\
            <%= tmp_mathjax_html_header({})%>\
            <%= tmp_mathjax_xhtml_header_starter({})%>\
        <% } %>\
        </head><body \
        <% if (mathjax) { %>\
            class="tex2jax_ignore">\
            <%= mathjax %>\
        <% } else { %>\
            >\
        <% } %>\
        <% if (part && part !="") {%>\
            <h1 class="part"><%= part %></h1>\
        <% } %>\
        <%= body %></body></html>');

var tmp_epub_xhtml_css_item = _.template('\t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />');


var tmp_epub_nav = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="<%= shortLang %>" lang="<%= shortLang %>" xmlns:epub="http://www.idpf.org/2007/ops">\n\
    \t<head>\n\
    \t\t<meta charset="utf-8"></meta>\n\
    \t</head>\n\
    \t<body>\n\
    \t\t<nav epub:type="toc" id="toc">\n\
    \t\t\t<ol>\n\
        <% _.each(contentItems,function(item){ %>\
            <%= tmp_epub_nav_item({"item":item})%>\
        <% }); %>\
    \t\t\t</ol>\n\
    \t\t</nav>\n\
    \t</body>\n\
    </html>');
    
var tmp_epub_nav_item = _.template('\t\t\t\t<li><a href="<% if (item.link) {print(item.link);} else { %>document<% if (item.docNum) {print("-"+item.docNum);}%>.xhtml#<% print(item.id); } %>"><%= item.title %></a>\
    <% if (item.subItems.length > 0) { %>\
        <ol>\
            <% _.each(item.subItems,function(item){ %>\
                <%= tmp_epub_nav_item({"item":item})%>\
            <% }); %>\
        </ol>\
    <% } %>\
</li>\n');

var tmp_html_export = _.template('<!DOCTYPE html>\n\
    <html>\n<head><title><%= title %></title>\
        <% _.each(styleSheets,function(item){ %>\
            <%= tmp_html_css_item({"item":item})%>\
        <% }); %>\
        <% if (mathjax) { %>\
            <%= tmp_mathjax_html_header({})%>\
            <%= tmp_mathjax_html_header_starter({})%>\
        <% } %>\
        </head><body \
        class="tex2jax_ignore">\
        <% if (mathjax) { %>\
            <%= mathjax %>\
        <% } else { %>\
            >\
        <% } %>\
        <% if (part && part !="") { %>\
            <h1 class="part"><%= part %></h1>\
        <% } %>\
        <h1 class="title"><%= title %></h1>\
        <% if (metadataSettings.subtitle && metadata.subtitle && metadata.subtitle != "") { %>\
            <h2 class="subtitle"><%= metadata.subtitle %></h2>\
        <% } %>\
        <% if (metadataSettings.abstract && metadata.abstract && metadata.abstract != "") { %>\
            <div class="abstract"><%= metadata.abstract %></div>\
        <% } %>\
        <% if (metadataSettings.authors && metadata.authors && metadata.authors != "") { %>\
            <div class="authors"><%= metadata.authors %></div>\
        <% } %>\
        <% if (metadataSettings.keywords && metadata.keywords && metadata.keywords != "") { %>\
            <div class="keywords"><%= metadata.keywords %></div>\
        <% } %>\
        <%= contents %></body></html>');

var tmp_html_css_item = _.template('\t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />');

var tmp_mathjax_html_header = _.template('\
    <script type="text/x-mathjax-config">\
        MathJax.Hub.Config({\
            jax: ["input/TeX","output/SVG"],\
            tex2jax: {\
                    inlineMath: [ ["[MATH]","[/MATH]"]],\
                    displayMath: [ ["[DMATH]","[/DMATH]"]],\
                processEscapes: true\
            },\
            extensions: ["tex2jax.js"],\
            TeX: {\
                extensions: ["noErrors.js","noUndefined.js","autoload-all.js"]\
            },\
            showMathMenu: false,\
            messageStyle: "none"\
        });\
    </script>\
    <script type="text/javascript" src="mathjax/MathJax.js">\
    </script>\
    ');
    
var tmp_mathjax_html_header_starter = _.template('\
    <script type="text/javascript">\
            document.addEventListener("DOMContentLoaded", function () {\
                if (window.hasOwnProperty("MathJax")) {\
                    var mjQueue = MathJax.Hub.queue;\
                    var equations = document.body.querySelectorAll(".equation");\
                    for (var i = 0; i < equations.length; i++) {\
                        equations[i].innerHTML = "[MATH]"+equations[i].getAttribute("data-equation")+"[/MATH]";\
                        mjQueue.Push(["Typeset",MathJax.Hub,equations[i[]);\
                    }\
                    var fequations = document.body.querySelectorAll(".figure-equation");\
                    for (var i = 0; i < fequations.length; i++) {\
                        fequations[i].innerHTML = "[DMATH]"+fequations[i].getAttribute("data-equation")+"[/DMATH]";\
                        mjQueue.Push(["Typeset",MathJax.Hub,fequations[i[]);\
                    }\
                }\
            });\
    </script>\
    ');

var tmp_mathjax_xhtml_header_starter = _.template('\
    <script type="text/javascript">\
        <![CDATA[\
            document.addEventListener("DOMContentLoaded", function () {\
                if (window.hasOwnProperty("MathJax")) {\
                    var mjQueue = MathJax.Hub.queue;\
                    var equations = document.body.querySelectorAll(".equation");\
                    for (var i = 0; i < equations.length; i++) {\
                        equations[i].innerHTML = "[MATH]"+equations[i].getAttribute("data-equation")+"[/MATH]";\
                        mjQueue.Push(["Typeset",MathJax.Hub,equations[i]]);\
                    }\
                    var fequations = document.body.querySelectorAll(".figure-equation");\
                    for (var i = 0; i < fequations.length; i++) {\
                        fequations[i].innerHTML = "[DMATH]"+fequations[i].getAttribute("data-equation")+"[/DMATH]";\
                        mjQueue.Push(["Typeset",MathJax.Hub,fequations[i[]);\
                    }\
                }\
            });\
        ]]>\
    </script>\
    ');    
    
    
var tmp_epub_opf_mathjax_items = _.template('\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/BasicLatin.js" id="id0" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/MiscMathSymbolsB.js" id="id1" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/d.js" id="id2" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/jax.js" id="id3" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/cancel.js" id="id4" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/a.js" id="id5" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/AsciiMath/jax.js" id="id6" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/ms.js" id="id7" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/mathchoice.js" id="id8" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Script/Regular/Main.js" id="id9" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/extpfeil.js" id="id10" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/AsciiMath/config.js" id="id11" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/Arrows.js" id="id12" media-type="application/x-javascript"/>\
        <item href="mathjax/images/CloseX-31.png" id="id13" media-type="image/png"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/LatinExtendedA.js" id="id14" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Italic/Other.js" id="id15" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Size3/Regular/Main.js" id="id16" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Size2/Regular/Main.js" id="id17" media-type="application/x-javascript"/>\
        <item href="mathjax/images/MenuArrow-15.png" id="id18" media-type="image/png"/>\
        <item href="mathjax/jax/input/TeX/jax.js" id="id19" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Size1/Regular/Main.js" id="id20" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/h.js" id="id21" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/l.js" id="id22" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Bold/PUA.js" id="id23" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/AMSsymbols.js" id="id24" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/CombDiacritMarks.js" id="id25" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Regular/PUA.js" id="id26" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/GreekAndCoptic.js" id="id27" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/LatinExtendedB.js" id="id28" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/LatinExtendedA.js" id="id29" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/MiscSymbols.js" id="id30" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/scr.js" id="id31" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/MiscSymbols.js" id="id32" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MiscTechnical.js" id="id33" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/newcommand.js" id="id34" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/mmultiscripts.js" id="id35" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/p.js" id="id36" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Typewriter/Regular/Main.js" id="id37" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/o.js" id="id38" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/annotation-xml.js" id="id39" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/u.js" id="id40" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Bold/BasicLatin.js" id="id41" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Regular/BasicLatin.js" id="id42" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Size4/Regular/Main.js" id="id43" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/noUndefined.js" id="id44" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/k.js" id="id45" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/LetterlikeSymbols.js" id="id46" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/HTML.js" id="id47" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Regular/Main.js" id="id49" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MiscSymbolsAndArrows.js" id="id50" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Bold/BasicLatin.js" id="id51" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/GeometricShapes.js" id="id52" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/GeometricShapes.js" id="id53" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/config.js" id="id54" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/enclose.js" id="id55" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/EnclosedAlphanum.js" id="id56" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/mhchem.js" id="id57" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/verb.js" id="id58" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/GeneralPunctuation.js" id="id59" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/MathMenu.js" id="id60" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/GeometricShapes.js" id="id61" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/PUA.js" id="id62" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/LetterlikeSymbols.js" id="id63" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/z.js" id="id64" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Bold/Main.js" id="id65" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/SpacingModLetters.js" id="id66" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Bold/Other.js" id="id67" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/autoload-all.js" id="id68" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Bold/CombDiacritMarks.js" id="id69" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/noErrors.js" id="id70" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/g.js" id="id71" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Regular/BasicLatin.js" id="id72" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/SpacingModLetters.js" id="id73" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/MiscSymbols.js" id="id74" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/GreekAndCoptic.js" id="id75" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/Main.js" id="id76" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/mml2jax.js" id="id77" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/GeometricShapes.js" id="id78" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/i.js" id="id79" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/q.js" id="id80" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/toMathML.js" id="id81" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/NativeMML/config.js" id="id82" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/BasicLatin.js" id="id83" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/boldsymbol.js" id="id84" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Typewriter/Regular/Other.js" id="id85" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/BoxDrawing.js" id="id86" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/begingroup.js" id="id87" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/v.js" id="id88" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MiscMathSymbolsA.js" id="id89" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Math/BoldItalic/Main.js" id="id90" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Bold/Other.js" id="id91" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/menclose.js" id="id92" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/LetterlikeSymbols.js" id="id93" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Typewriter/Regular/CombDiacritMarks.js" id="id94" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/GeneralPunctuation.js" id="id95" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MiscMathSymbolsB.js" id="id96" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/x.js" id="id97" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Regular/Other.js" id="id98" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/j.js" id="id99" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/MathZoom.js" id="id100" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/MiscMathSymbolsA.js" id="id101" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/unicode.js" id="id102" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/c.js" id="id103" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/NativeMML/jax.js" id="id104" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/SupplementalArrowsB.js" id="id105" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/autobold.js" id="id106" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/SuppMathOperators.js" id="id107" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Regular/Main.js" id="id108" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/action.js" id="id109" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/fr.js" id="id110" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/Dingbats.js" id="id111" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/Dingbats.js" id="id112" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Italic/CombDiacritMarks.js" id="id113" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/Arrows.js" id="id114" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/MathEvents.js" id="id115" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/MathOperators.js" id="id116" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Caligraphic/Bold/Main.js" id="id117" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/MathOperators.js" id="id118" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/Latin1Supplement.js" id="id119" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/CombDiacritMarks.js" id="id120" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/f.js" id="id121" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/Main.js" id="id122" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/bbox.js" id="id123" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/config.js" id="id124" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/CombDiactForSymbols.js" id="id125" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Regular/CombDiacritMarks.js" id="id126" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/Arrows.js" id="id127" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/SupplementalArrowsA.js" id="id128" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/r.js" id="id129" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/GeneralPunctuation.js" id="id130" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Italic/BasicLatin.js" id="id131" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/SuppMathOperators.js" id="id132" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/opf.js" id="id133" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/fontdata.js" id="id134" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/SpacingModLetters.js" id="id135" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/mglyph.js" id="id136" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MathOperators.js" id="id137" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/GreekAndCoptic.js" id="id138" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/CombDiactForSymbols.js" id="id139" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Bold/Main.js" id="id140" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/w.js" id="id141" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/MiscTechnical.js" id="id142" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/Latin1Supplement.js" id="id143" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/MathOperators.js" id="id144" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/LetterlikeSymbols.js" id="id146" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/m.js" id="id147" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/GeneralPunctuation.js" id="id148" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/multiline.js" id="id149" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/LatinExtendedA.js" id="id150" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/mtable.js" id="id151" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/LatinExtendedA.js" id="id152" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Italic/Main.js" id="id153" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/asciimath2jax.js" id="id154" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/jax.js" id="id155" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/AMSmath.js" id="id156" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/b.js" id="id157" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/fontdata-extra.js" id="id158" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/SuppMathOperators.js" id="id159" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/MathOperators.js" id="id160" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/s.js" id="id161" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Script/Regular/BasicLatin.js" id="id162" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Caligraphic/Regular/Main.js" id="id163" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/SpacingModLetters.js" id="id164" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/GreekAndCoptic.js" id="id165" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/BasicLatin.js" id="id166" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/SupplementalArrowsA.js" id="id167" media-type="application/x-javascript"/>\
        <item href="mathjax/MathJax.js" id="id168" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/TeX/config.js" id="id169" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/BasicLatin.js" id="id170" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/CombDiacritMarks.js" id="id171" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/color.js" id="id172" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/Main.js" id="id173" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/LatinExtendedB.js" id="id174" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/CombDiacritMarks.js" id="id175" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Regular/Other.js" id="id176" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/tex2jax.js" id="id177" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/MiscTechnical.js" id="id178" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/maction.js" id="id179" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/GreekAndCoptic.js" id="id180" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/LatinExtendedB.js" id="id181" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/n.js" id="id182" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/t.js" id="id183" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Typewriter/Regular/BasicLatin.js" id="id184" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/SuppMathOperators.js" id="id185" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/y.js" id="id186" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/jax.js" id="id187" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/e.js" id="id188" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/LetterlikeSymbols.js" id="id189" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/Latin1Supplement.js" id="id190" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/CombDiacritMarks.js" id="id191" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Math/Italic/Main.js" id="id192" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/Main.js" id="id193" media-type="application/x-javascript"/>');
        