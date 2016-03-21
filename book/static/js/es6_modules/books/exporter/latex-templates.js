/** A template to create the latex book index. */
let latexBookIndexTemplate = _.template('\
    <%= latexStart %>\
    <% _.each(aBook.chapters,function(chapter){ %>\
        <% if(chapter.part && chapter.part != "") { %>\
            \n\t\\part{<%= chapter.part %>}\
         <% } %>\
        \n\t\\include{chapter-<%= chapter.number%>}\
    <% }); %>\
    <%= latexEnd %>\
')
