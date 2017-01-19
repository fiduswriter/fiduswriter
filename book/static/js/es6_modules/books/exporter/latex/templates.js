import {noSpaceTmp} from "../../../common"

/** A template to create the latex book.tex file. */
export let bookTexTemplate = _.template(`
    \\documentclass[11pt]{book}
    \n<%=preamble%>
    \n\\usepackage{docmute}
    \n\\title{<%=book.title%>}
    \n\\author{<%=book.metadata.author%>}
    \n\\begin{document}
    \n\\maketitle
    \n\\def\\title#1{\\chapter{#1}}
    \n\\tableofcontents
    <% _.each(book.chapters,function(chapter){ %>\
        <% if(chapter.part && chapter.part != "") { %>\
            \n\\part{<%= chapter.part %>}\
         <% } %>\
        \n\\input{chapter-<%= chapter.number%>}\
    <% }); %>\
    \n<%= epilogue %>
    \n\\end{document}
`)
