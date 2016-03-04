import {obj2Node} from "./json"
import {createSlug, findImages} from "./tools"
import {zipFileCreator} from "./zip"

export let findLatexDocumentFeatures = function(htmlCode, title, author,
    subtitle, keywords, specifiedAuthors,
    metadata, documentClass) {
    var includePackages, documentEndCommands = '',
        latexStart, latexEnd, tempNode;

    includePackages = '\\usepackage[utf8]{luainputenc}';

    if (subtitle && metadata.subtitle) {
        tempNode = obj2Node(metadata.subtitle);
        if (tempNode.textContent.length > 0) {
            includePackages +=
                '\n\\usepackage{titling}\
                \n\\newcommand{\\subtitle}[1]{%\
                \n\t\\posttitle{%\
                \n\t\t\\par\\end{center}\
                \n\t\t\\begin{center}\\large#1\\end{center}\
                \n\t\t\\vskip 0.5em}%\
                \n}'
        }
    }

    if (keywords && metadata.keywords) {
        tempNode = obj2Node(metadata.keywords);
        if (tempNode.textContent.length > 0) {
            includePackages +=
                '\n\\def\\keywords{\\vspace{.5em}\
                \n{\\textit{Keywords}:\\,\\relax%\
                \n}}\
                \n\\def\\endkeywords{\\par}'
        }
    }



    if (jQuery(htmlCode).find('a').length > 0) {
        includePackages += '\n\\usepackage{hyperref}';
    }
    if (jQuery(htmlCode).find('.citation').length > 0) {
        includePackages +=
            '\n\\usepackage[backend=biber,hyperref=false,citestyle=authoryear,bibstyle=authoryear]{biblatex}\n\\bibliography{bibliography}';
        documentEndCommands += '\n\n\\printbibliography';
    }

    if (jQuery(htmlCode).find('figure').length > 0) {
        if (htmlCode.innerHTML.search('.svg">') !== -1) {
            includePackages += '\n\\usepackage{svg}';
        }
        if (htmlCode.innerHTML.search('.png">') !== -1 || htmlCode.innerHTML
            .search('.jpg">') !== -1 || htmlCode.innerHTML.search(
                '.jpeg">') !== -1) {
            includePackages += '\n\\usepackage{graphicx}';
            // The following scales graphics down to text width, but not scaling them up if they are smaller
            includePackages +=
                '\
\n\\usepackage{calc}\
\n\\newlength{\\imgwidth}\
\n\\newcommand\\scaledgraphics[1]{%\
\n\\settowidth{\\imgwidth}{\\includegraphics{#1}}%\
\n\\setlength{\\imgwidth}{\\minof{\\imgwidth}{\\textwidth}}%\
\n\\includegraphics[width=\\imgwidth,height=\\textheight,keepaspectratio]{#1}%\
\n}';

        }
    }
    if (documentClass === 'book') {
        //TODO: abstract environment should possibly only be included if used
        includePackages +=
            '\n\\newenvironment{abstract}{\\rightskip1in\\itshape}{}';
    }

    latexStart = '\\documentclass{' + documentClass + '}\n' +
        includePackages +
        '\n\\begin{document}\n\n\\title{' + title + '}';

    if (specifiedAuthors && metadata.authors) {
        tempNode = obj2Node(metadata.authors);
        if (tempNode.textContent.length > 0) {
            author = tempNode.textContent;
        }
    }

    latexStart += '\n\\author{' + author + '}\n';

    if (subtitle && metadata.subtitle) {
        tempNode = obj2Node(metadata.subtitle);
        if (tempNode.textContent.length > 0) {
            latexStart += '\\subtitle{' + tempNode.textContent + '}\n';
        }
    }

    latexStart += '\n\\maketitle\n\n';

    if (keywords && metadata.keywords) {
        tempNode = obj2Node(metadata.keywords);
        if (tempNode.textContent.length > 0) {
            latexStart += '\\begin{keywords}\n' + tempNode.textContent + '\\end{keywords}\n';
        }
    }


    if (documentClass === 'book') {
        if (metadata.publisher) {
            tempNode = obj2Node(metadata.publisher);
            if (tempNode.textContent.length > 0) {
                latexStart += tempNode.textContent + '\n\n';
            }
        }

        if (metadata.copyright) {
            tempNode = obj2Node(metadata.copyright);
            if (tempNode.textContent.length > 0) {
                latexStart += tempNode.textContent + '\n\n';
            }
        }

        latexStart += '\n\\tableofcontents';
    }

    latexEnd = documentEndCommands + '\n\n\\end{document}';




    return {
        latexStart: latexStart,
        latexEnd: latexEnd
    };
};

export let htmlToLatex = function(title, author, htmlCode, aBibDB,
    settings, metadata, isChapter, listedWorksList) {
    var latexStart = '',
        latexEnd = '',
        documentFeatures,
        bibExport, returnObject;
    if (!listedWorksList) {
        listedWorksList = [];
    }
    console.log(htmlCode.outerHTML);
    // Remove sections that are marked as deleted
    /*jQuery(htmlCode).find('.del').each(function() {
        this.outerHTML = '';
    });*/


    if (isChapter) {
        latexStart += '\\chapter{' + title + '}\n';
        //htmlCode.innerHTML =  '<div class="title">' + title + '</div>' + htmlCode.innerHTML;
        if (settings['metadata-subtitle'] && metadata.subtitle) {
            tempNode = obj2Node(metadata.subtitle);
            if (tempNode.textContent.length > 0) {
                latexStart += '\\section{' + tempNode.textContent + '}\n';
            }
        }
    } else {
        documentFeatures = exporter.findLatexDocumentFeatures(
            htmlCode, title, author, settings['metadata-subtitle'], settings['metadata-keywords'], settings['metadata-authors'], metadata,
            'article');
        latexStart += documentFeatures.latexStart;
        latexEnd += documentFeatures.latexEnd;
    }


    if (settings['metadata-abstract'] && metadata.abstract) {
        tempNode = obj2Node(metadata.abstract);
        if (tempNode.textContent.length > 0) {

            htmlCode.innerHTML = '<div class="abstract">' + tempNode.innerHTML +
                '</div>' + htmlCode.innerHTML;
        }
    }
    console.log(['2',htmlCode.outerHTML]);

    var footnotes = htmlCode.querySelectorAll('.footnote');

    jQuery(htmlCode).find('.footnote').each(function() {
        console.log(['footnote',this, this.outerHTML])
        jQuery(this).replaceWith('\\footnote{' + this.innerHTML + '}');
    });
    // Replace nbsp spaces with normal ones
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

    // Remove line breaks
    htmlCode.innerHTML = htmlCode.innerHTML.replace(
        /(\r\n|\n|\r)/gm,
        '');

    console.log(['3',htmlCode.outerHTML]);
    // Escape characters that are protected in some way.
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\/g, '\\\\');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\{/g, '\{');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\}/g, '\}');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\$/g, '\\\$');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\#/g, '\\\#');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\%/g, '\\\%');

    console.log(htmlCode.outerHTML);


    jQuery(htmlCode).find('i').each(function() {
        jQuery(this).replaceWith('\\emph{' + this.innerHTML +
            '}');
    });

    jQuery(htmlCode).find('b').each(function() {
        jQuery(this).replaceWith('\\textbf{' + this.innerHTML +
            '}');
    });

    jQuery(htmlCode).find('h1').each(function() {
        jQuery(this).replaceWith('\n\n\\section{' + this.textContent +
            '}\n');
    });
    jQuery(htmlCode).find('h2').each(function() {
        jQuery(this).replaceWith('\n\n\\subsection{' + this.textContent +
            '}\n');
    });
    jQuery(htmlCode).find('h3').each(function() {
        jQuery(this).replaceWith('\n\n\\subsubsection{' + this.textContent +
            '}\n');
    });
    jQuery(htmlCode).find('p').each(function() {
        jQuery(this).replaceWith('\n\n' + this.innerHTML + '\n');
    });
    jQuery(htmlCode).find('li').each(function() {
        jQuery(this).replaceWith('\n\\item ' + this.innerHTML +
            '\n');
    });
    jQuery(htmlCode).find('ul').each(function() {
        jQuery(this).replaceWith('\n\\begin{itemize}' + this.innerHTML +
            '\\end{itemize}\n');
    });
    jQuery(htmlCode).find('ol').each(function() {
        jQuery(this).replaceWith('\n\\begin{enumerated}' + this
            .innerHTML +
            '\\end{enumerated}\n');
    });
    jQuery(htmlCode).find('code').each(function() {
        jQuery(this).replaceWith('\n\\begin{code}\n\n' + this.innerHTML +
            '\n\n\\end{code}\n');
    });
    jQuery(htmlCode).find('div.abstract').each(function() {
        jQuery(this).replaceWith('\n\\begin{abstract}\n\n' +
            this.innerHTML +
            '\n\n\\end{abstract}\n');
    });

    // join code paragraphs that follow oneanother
    htmlCode.innerHTML = htmlCode.innerHTML.replace(
        /\\end{code}\n\n\\begin{code}\n\n/g, '');
    jQuery(htmlCode).find('blockquote').each(function() {
        jQuery(this).replaceWith('\n\\begin{quote}\n\n' + this.innerHTML +
            '\n\n\\end{quote}\n');
    });
    // join quote paragraphs that follow oneanother
    htmlCode.innerHTML = htmlCode.innerHTML.replace(
        /\\end{quote}\n\n\\begin{quote}\n\n/g, '');
    jQuery(htmlCode).find('a').each(function() {
        jQuery(this).replaceWith('\\href{' + this.href + '}{' +
            this.innerHTML +
            '}');
    });
    jQuery(htmlCode).find('.citation').each(function() {
        var citationEntries = this.hasAttribute('data-bib-entry') ? this.getAttribute('data-bib-entry').split(',') : [],
            citationBefore = this.hasAttribute('data-bib-before') ? this.getAttribute('data-bib-before').split(',') : [],
            citationPage = this.hasAttribute('data-bib-page') ? this.getAttribute('data-bib-page').split(',') : [],
            citationFormat = this.hasAttribute('data-bib-format') ? this.getAttribute('data-bib-format') : '',
            citationCommand = '\\' + citationFormat,
            citationEntryKeys;

        if (citationEntries.length > 1 && citationBefore.join('').length === 0 && citationPage.join('').length === 0) {
            // multi source citation without page numbers or text before.
            var citationEntryKeys = [];

            citationEntries.forEach(function(citationEntry) {
                if (aBibDB[citationEntry]) {
                    citationEntryKeys.push(aBibDB[citationEntry].entry_key);
                    if (listedWorksList.indexOf(citationEntry) === -1) {
                        listedWorksList.push(citationEntry);
                    }
                }
            });

            citationCommand += '{' + citationEntryKeys.join(',') + '}';
        } else {
            if (citationEntries.length > 1) {
                citationCommand += 's'; // Switching from \autocite to \autocites
            }

            citationEntries.forEach(function(citationEntry, index) {
                if (!aBibDB[citationEntry]) {
                    return false; // Not present in bibliography database, skip it.
                }

                if (citationBefore[index] && citationBefore[index].length > 0) {
                    citationCommand += '[' + citationBefore[index] + ']';
                    if (!citationPage[index] || citationPage[index].length === 0) {
                        citationCommand += '[]';
                    }
                }
                if (citationPage[index] && citationPage[index].length > 0) {
                    citationCommand += '[' + citationPage[index] + ']';
                }
                citationCommand += '{';

                citationCommand += aBibDB[citationEntry].entry_key;

                if (listedWorksList.indexOf(citationEntry) === -1) {
                    listedWorksList.push(citationEntry);
                }
                citationCommand += '}';

            });
        }

        jQuery(this).replaceWith(citationCommand);

    });

    jQuery(htmlCode).find('figure').each(function() {
        var caption, figureType, filename, latexPackage,
            filenameList;
        figureType = jQuery(this).find('figcaption')[0].firstChild
            .innerHTML;
        // TODO: make use of figure type
        caption = jQuery(this).find('figcaption')[0].lastChild.innerHTML;
        filename = jQuery(this).find('img').attr('data-src');
        filenameList = filename.split('.');
        if (filenameList[filenameList.length - 1] === 'svg') {
            latexPackage = 'includesvg';
        } else {
            latexPackage = 'scaledgraphics';
        }
        this.outerHTML = '\n\\begin{figure}\n\\' + latexPackage +
            '{' + filename + '}\n\\caption{' + caption +
            '}\n\\end{figure}\n';
    });

    jQuery(htmlCode).find('.equation, .figure-equation').each(
        function() {
            var equation = jQuery(this).attr('data-equation');
            // TODO: The string is for some reason escaped. The following line removes this.
            equation = equation.replace(/\\/g, "*BACKSLASH*").replace(
                /\*BACKSLASH\*\*BACKSLASH\*/g, "\\").replace(
                /\*BACKSLASH\*/g, "");
            this.outerHTML = '$' + equation + '$';
        });

    jQuery(htmlCode).find('.footnote').each(function() {
        console.log(['footnote',this, this.outerHTML])
        jQuery(this).replaceWith('\\footnote{' + this.innerHTML + '}');
    });

    returnObject = {
        latex: latexStart + htmlCode.textContent + latexEnd,
    };
    if (isChapter) {
        returnObject.listedWorksList = listedWorksList;
    } else {
        bibExport = new bibliographyHelpers.bibLatexExport(
            listedWorksList, aBibDB);
        returnObject.bibtex = bibExport.bibtex_str;
    }
    return returnObject;
};

export let downloadLatex = function(aDocument) {
    if (window.hasOwnProperty('theEditor') || (window.hasOwnProperty(
            'BibDB') && aDocument.is_owner)) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function() {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function(
            aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

let export1 = function(aDocument, aBibDB) {
    var contents, latexCode, htmlCode, title, outputList,
        httpOutputList, tempNode;

    title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext(
        'Latex export has been initiated.'));

    contents = document.createElement('div');

    tempNode = obj2Node(aDocument.contents);

    while (tempNode.firstChild) {
        contents.appendChild(tempNode.firstChild);
    }

    httpOutputList = findImages(contents);

    latexCode = exporter.htmlToLatex(title, aDocument.owner.name, contents, aBibDB,
        aDocument.settings, aDocument.metadata);

    outputList = [{
        filename: 'document.tex',
        contents: latexCode.latex
    }];

    if (latexCode.bibtex.length > 0) {
        outputList.push({
            filename: 'bibliography.bib',
            contents: latexCode.bibtex
        });
    }

    zipFileCreator(outputList, httpOutputList, createSlug(
            title) +
        '.latex.zip');
};
