/** A template for each item in an HTML export of a Fidus Writer document. */
let  cssItemTemplatePart = '\t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />'

/** A template for the MathJax parts to include in the header of a HTML/XHTML document if it includes MathJax. */
export let mathjaxHtmlHeaderTemplatePart = '\
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
    '
/** A template to initiate MathJax execution in the header of a HTML document if it includes MathJax. */
let mathjaxHtmlHeaderStarterTemplatePart = '\
    <script type="text/javascript">\
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
                        mjQueue.Push(["Typeset",MathJax.Hub,fequations[i]]);\
                    }\
                }\
            });\
    </script>\
    '


/** A template for HTML export of a document. */
export let htmlExportTemplate = _.template('<!DOCTYPE html>\n\
    <html>\n<head><title><%= title %></title>\
        <% var tempNode; %>\
        <% _.each(styleSheets,function(item){ %>'
            + cssItemTemplatePart +
        '<% }); %>\
        <% if (mathjax) { %>'
            + mathjaxHtmlHeaderTemplatePart +
            + mathjaxHtmlHeaderStarterTemplatePart +
        '<% } %>\
        </head><body \
        class="tex2jax_ignore">\
        <% if (mathjax) { %>\
            <%= mathjax %>\
        <% } %>\
        <% if (part && part !="") { %>\
            <h1 class="part"><%= part %></h1>\
        <% } %>\
        <h1 class="title"><%= title %></h1>\
        <% if (settings["metadata-subtitle"] && metadata.subtitle) { %>\
            <% tempNode = exporter.obj2Node(metadata.subtitle); %>\
            <% if (tempNode.textContent.length > 0) { %>\
                <h2 class="subtitle"><%= tempNode.textContent %></h2>\
            <% } %>\
        <% } %>\
        <% if (settings["metadata-abstract"] && metadata.abstract) { %>\
            <% tempNode = exporter.obj2Node(metadata.abstract); %>\
            <% if (tempNode.textContent.length > 0) { %>\
                <div class="abstract"><%= tempNode.textContent %></div>\
            <% } %>\
        <% } %>\
        <% if (settings["metadata-authors"] && metadata.authors) { %>\
            <% tempNode = exporter.obj2Node(metadata.authors); %>\
            <% if (tempNode.textContent.length > 0) { %>\
                <div class="authors"><%= tempNode.textContent %></div>\
            <% } %>\
        <% } %>\
        <% if (settings["metadata-keywords"] && metadata.keywords) { %>\
            <% tempNode = exporter.obj2Node(metadata.keywords); %>\
            <% if (tempNode.textContent.length > 0) { %>\
                <div class="keywords"><%= tempNode.textContent %></div>\
            <% } %>\
        <% } %>\
        <%= contents %></body></html>')
