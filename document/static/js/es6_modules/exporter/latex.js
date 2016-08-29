import {obj2Node} from "./json"
import {createSlug, findImages} from "./tools"
import {zipFileCreator} from "./zip"
import {BaseExporter} from "./base"
import {BibLatexExporter} from "../bibliography/exporter/biblatex"
import {BibliographyDB} from "../bibliography/database"
import {addAlert} from "../common/common"


export class BaseLatexExporter extends BaseExporter {

    findLatexDocumentFeatures(htmlCode, title, author,
        subtitle, keywords, specifiedAuthors,
        metadata, documentClass) {
        let documentEndCommands = ''

        let latexAfterAbstract = ''

        let includePackages = '\\usepackage[utf8]{luainputenc}'

        if (subtitle && metadata.subtitle) {
            let tempNode = obj2Node(metadata.subtitle)
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
            let tempNode = obj2Node(metadata.keywords)
            if (tempNode.textContent.length > 0) {
                includePackages +=
                    '\n\\def\\keywords{\\vspace{.5em}\
                    \n{\\textit{Keywords}:\\,\\relax%\
                    \n}}\
                    \n\\def\\endkeywords{\\par}'
            }
        }



        if (jQuery(htmlCode).find('a').length > 0) {
            includePackages += '\n\\usepackage{hyperref}'
        }
        if (jQuery(htmlCode).find('.citation').length > 0) {
            includePackages +=
                '\n\\usepackage[backend=biber,hyperref=false,citestyle=authoryear,bibstyle=authoryear]{biblatex}\n\\bibliography{bibliography}'
            documentEndCommands += '\n\n\\printbibliography'
        }
        let figures = [].slice.call(jQuery(htmlCode).find('figure'))
        if (figures.length > 0) {
            let includeSvg = false
            let includeGraphicx = false
            figures.forEach(function(figure) {
                let imgSrc = figure.getAttribute('data-image-src')
                if (imgSrc) {
                    let filetype = imgSrc.split('.').pop().toLowerCase()
                    if (filetype==='svg') {
                        includeSvg = true
                    } else if (['png','jpg','jpeg'].includes(filetype)) {
                        includeGraphicx = true
                    }
                }
            })

            if (includeSvg) {
                includePackages += '\n\\usepackage{svg}'
            }
            if (includeGraphicx) {
                includePackages += '\n\\usepackage{graphicx}'
                // The following scales graphics down to text width, but not scaling them up if they are smaller
                includePackages +=
                    '\
    \n\\usepackage{calc}\
    \n\\newlength{\\imgwidth}\
    \n\\newcommand\\scaledgraphics[1]{%\
    \n\\settowidth{\\imgwidth}{\\includegraphics{#1}}%\
    \n\\setlength{\\imgwidth}{\\minof{\\imgwidth}{\\textwidth}}%\
    \n\\includegraphics[width=\\imgwidth,height=\\textheight,keepaspectratio]{#1}%\
    \n}'
            }

        }
        if (documentClass === 'book') {
            //TODO: abstract environment should possibly only be included if used
            includePackages +=
                '\n\\newenvironment{abstract}{\\rightskip1in\\itshape}{}'
        }

        let latexStart = '\\documentclass{' + documentClass + '}\n' +
            includePackages +
            '\n\\begin{document}\n\n\\title{' + title + '}'

        if (specifiedAuthors && metadata.authors) {
            let tempNode = obj2Node(metadata.authors)
            if (tempNode.textContent.length > 0) {
                author = tempNode.textContent
            }
        }

        latexStart += '\n\\author{' + author + '}\n'

        if (subtitle && metadata.subtitle) {
            let tempNode = obj2Node(metadata.subtitle)
            if (tempNode.textContent.length > 0) {
                latexStart += '\\subtitle{' + tempNode.textContent + '}\n'
            }
        }

        latexStart += '\n\\maketitle\n\n'

        if (keywords && metadata.keywords) {
            let tempNode = obj2Node(metadata.keywords)
            if (tempNode.textContent.length > 0) {
                latexAfterAbstract += '\\begin{keywords}\n' + tempNode.textContent + '\n\\end{keywords}\n'
            }
        }


        if (documentClass === 'book') {
            if (metadata.publisher) {
                let tempNode = obj2Node(metadata.publisher)
                if (tempNode.textContent.length > 0) {
                    latexStart += tempNode.textContent + '\n\n'
                }
            }

            if (metadata.copyright) {
                let tempNode = obj2Node(metadata.copyright)
                if (tempNode.textContent.length > 0) {
                    latexStart += tempNode.textContent + '\n\n'
                }
            }

            latexStart += '\n\\tableofcontents'
        }

        let latexEnd = documentEndCommands + '\n\n\\end{document}'




        return {latexStart, latexAfterAbstract, latexEnd}
    }

    // Replace all instances of the before string in all descendant textnodes of
    // node.
    replaceText(node, before, after) {
        if (node.nodeType === 1) {
            [].forEach.call(node.childNodes, child => this.replaceText(child, before, after))
        } else if (node.nodeType === 3) {
            node.textContent = node.textContent.replace(window.RegExp(before, 'g'), after)
        }
    }

    htmlToLatex(title, author, htmlCode,
        settings, metadata, isChapter, listedWorksList) {
        let latexStart = '',
            latexEnd = '', latexAfterAbstract = '', that = this
        if (!listedWorksList) {
            listedWorksList = []
        }


        if (isChapter) {
            latexStart += '\\chapter{' + title + '}\n'
            //htmlCode.innerHTML =  '<div class="title">' + title + '</div>' + htmlCode.innerHTML
            if (settings['metadata-subtitle'] && metadata.subtitle) {
                let tempNode = obj2Node(metadata.subtitle)
                if (tempNode.textContent.length > 0) {
                    latexStart += '\\section{' + tempNode.textContent + '}\n'
                }
            }
        } else {
            let documentFeatures = this.findLatexDocumentFeatures(
                htmlCode, title, author, settings['metadata-subtitle'], settings['metadata-keywords'], settings['metadata-authors'], metadata,
                'article')
            latexStart += documentFeatures.latexStart
            latexEnd += documentFeatures.latexEnd
            latexAfterAbstract += documentFeatures.latexAfterAbstract
        }


        if (settings['metadata-abstract'] && metadata.abstract) {
            let tempNode = obj2Node(metadata.abstract)
            if (tempNode.textContent.length > 0) {
                tempNode.id = 'abstract'
                htmlCode.insertBefore(tempNode, htmlCode.firstChild)
            }
        }

        htmlCode = this.cleanHTML(htmlCode)

        // Remove line breaks
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /(\r\n|\n|\r)/gm,
            '')

        // Escape characters that are protected in some way.
        this.replaceText(htmlCode, '\\\\', '\\textbackslash')
        this.replaceText(htmlCode, '{', '\\{')
        this.replaceText(htmlCode, '}', '\\}')
        this.replaceText(htmlCode, '\\\\textbackslash', '\\textbackslash{}')
        this.replaceText(htmlCode, '\\^', '\\textasciicircum{}')
        this.replaceText(htmlCode, '\\$', '\\$')
        this.replaceText(htmlCode, '\\_', '\\_')
        this.replaceText(htmlCode, '\\~', '\\textasciitilde{}')
        this.replaceText(htmlCode, '#', '\\#')
        this.replaceText(htmlCode, '%', '\\%')
        this.replaceText(htmlCode, '&', '\\&')

        // Remove control characters that somehow have ended up in the document
        this.replaceText(htmlCode, '\u000B', '')
        this.replaceText(htmlCode, '\u000C', '')
        this.replaceText(htmlCode, '\u000E', '')
        this.replaceText(htmlCode, '\u000F', '')

        jQuery(htmlCode).find('i').each(function() {
            jQuery(this).replaceWith('\\emph{' + this.innerHTML +
                '}')
        })

        jQuery(htmlCode).find('b').each(function() {
            jQuery(this).replaceWith('\\textbf{' + this.innerHTML +
                '}')
        })

        jQuery(htmlCode).find('h1').each(function() {
            jQuery(this).replaceWith('<h1>\n\n\\section{' + this.innerHTML +
                '}\n</h1>')
        })
        jQuery(htmlCode).find('h2').each(function() {
            jQuery(this).replaceWith('<h2>\n\n\\subsection{' + this.innerHTML +
                '}\n</h2>')
        })
        jQuery(htmlCode).find('h3').each(function() {
            jQuery(this).replaceWith('<h3>\n\n\\subsubsection{' + this.textHTML +
                '}\n</h3>')
        })
        jQuery(htmlCode).find('p').each(function() {
            jQuery(this).replaceWith('\n\n' + this.innerHTML + '\n')
        })
        jQuery(htmlCode).find('li').each(function() {
            jQuery(this).replaceWith('\n\\item ' + this.innerHTML +
                '\n')
        })
        jQuery(htmlCode).find('ul').each(function() {
            jQuery(this).replaceWith('<ul>\n\\begin{itemize}' + this.innerHTML +
                '\\end{itemize}\n</ul>')
        })
        jQuery(htmlCode).find('ol').each(function() {
            jQuery(this).replaceWith('<ol>\n\\begin{enumerated}' + this
                .innerHTML +
                '\\end{enumerated}\n</ol>')
        })
        jQuery(htmlCode).find('code').each(function() {
            jQuery(this).replaceWith('\n\\begin{code}\n\n' + this.innerHTML +
                '\n\n\\end{code}\n')
        })
        jQuery(htmlCode).find('div#abstract').each(function() {
            jQuery(this).replaceWith('<div id="abstract">\n\\begin{abstract}\n\n' +
                this.innerHTML +
                '\n\n\\end{abstract}\n</div>')
        })

        // join code paragraphs that follow oneanother
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /\\end{code}\n\n\\begin{code}\n\n/g, '')
        jQuery(htmlCode).find('blockquote').each(function() {
            jQuery(this).replaceWith('\n\\begin{quote}\n\n' + this.innerHTML +
                '\n\n\\end{quote}\n')
        })
        // join quote paragraphs that follow oneanother
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /\\end{quote}\n\n\\begin{quote}\n\n/g, '')
        // Replace links, except those for footnotes.
        jQuery(htmlCode).find('a:not(.fn)').each(function() {
            jQuery(this).replaceWith('\\href{' + this.href + '}{' +
                this.innerHTML +
                '}')
        })
        jQuery(htmlCode).find('.citation').each(function() {
            let citationEntries = this.hasAttribute('data-bib-entry') ? this.getAttribute('data-bib-entry').split(',') : [],
                citationBefore = this.hasAttribute('data-bib-before') ? this.getAttribute('data-bib-before').split(',') : [],
                citationPage = this.hasAttribute('data-bib-page') ? this.getAttribute('data-bib-page').split(',') : [],
                citationFormat = this.hasAttribute('data-bib-format') ? this.getAttribute('data-bib-format') : '',
                citationCommand = '\\' + citationFormat

            if (citationEntries.length > 1 && citationBefore.join('').length === 0 && citationPage.join('').length === 0) {
                // multi source citation without page numbers or text before.
                let citationEntryKeys = []

                citationEntries.forEach(function(citationEntry) {
                    if (that.bibDB[citationEntry]) {
                        citationEntryKeys.push(that.bibDB[citationEntry].entry_key)
                        if (listedWorksList.indexOf(citationEntry) === -1) {
                            listedWorksList.push(citationEntry)
                        }
                    }
                })

                citationCommand += '{' + citationEntryKeys.join(',') + '}'
            } else {
                if (citationEntries.length > 1) {
                    citationCommand += 's' // Switching from \autocite to \autocites
                }

                citationEntries.forEach(function(citationEntry, index) {
                    if (!that.bibDB[citationEntry]) {
                        return false // Not present in bibliography database, skip it.
                    }

                    if (citationBefore[index] && citationBefore[index].length > 0) {
                        citationCommand += '[' + citationBefore[index] + ']'
                        if (!citationPage[index] || citationPage[index].length === 0) {
                            citationCommand += '[]'
                        }
                    }
                    if (citationPage[index] && citationPage[index].length > 0) {
                        citationCommand += '[' + citationPage[index] + ']'
                    }
                    citationCommand += '{'

                    citationCommand += that.bibDB[citationEntry].entry_key
                    if (listedWorksList.indexOf(citationEntry) === -1) {
                        listedWorksList.push(citationEntry)
                    }
                    citationCommand += '}'

                })
            }

            jQuery(this).replaceWith(citationCommand)

        })

        jQuery(htmlCode).find('figure').each(function() {
            let latexPackage
            let figureType = jQuery(this).attr('data-figure-category')
            let caption = jQuery(this).attr('data-caption')
            let filePathName = jQuery(this).attr('data-image-src')
            let innerFigure = ''
            if (filePathName) {
                let filename = filePathName.split('/').pop()
                if (filename.split('.').pop() === 'svg') {
                    latexPackage = 'includesvg'
                } else {
                    latexPackage = 'scaledgraphics'
                }
                innerFigure += '\\' + latexPackage + '{' + filename + '}\n'
            } else {
                let formula = jQuery(this).attr('data-equation')
                innerFigure += '\\begin{displaymath}\n'+formula+'\n\\end{displaymath}\n'
            }
            if (figureType==='table') {
                this.outerHTML = '\n\\begin{table}\n\\caption{' + caption +
                    '}\n' + innerFigure + '\\end{table}\n'
            } else { // TODO: handle photo figure types
                this.outerHTML = '\n\\begin{figure}\n' + innerFigure +
                    '\\caption{' + caption + '}\n\\end{figure}\n'
            }
        })

        jQuery(htmlCode).find('.equation, .figure-equation').each(
            function() {
                let equation = jQuery(this).attr('data-equation')
                this.outerHTML = '$' + equation + '$'
            })

        let footnotes = [].slice.call(htmlCode.querySelectorAll('section#fnlist section[role=doc-footnote]'))
        let footnoteMarkers = [].slice.call(htmlCode.querySelectorAll('a.fn'))

        footnoteMarkers.forEach(function(marker, index) {
            // if the footnote is in one of these containers, we have to put the
            // footnotetext after the containers. If there is no container, we put the
            // footnote where the footnote marker is.
            let containers = [].slice.call(jQuery(marker).parents('h1, h2, h3, ul, ol'))
            if (containers.length > 0) {
                jQuery(marker).html('\\protect\\footnotemark')
                let lastContainer = containers.pop()
                if (!lastContainer.nextSibling || !jQuery(lastContainer.nextSibling).hasClass('footnote-counter-reset')) {
                    let fnCounterReset = document.createElement('span')
                    fnCounterReset.classList.add('footnote-counter-reset')
                    lastContainer.parentNode.insertBefore(fnCounterReset, lastContainer.nextSibling)
                }
                let fnCounter = 1
                let searchNode = lastContainer.nextSibling.nextSibling
                while(searchNode && searchNode.nodeType === 1 &&
                    searchNode.hasAttribute('role') &&
                    searchNode.getAttribute('role') === 'doc-footnote') {
                    searchNode = searchNode.nextSibling
                    fnCounter++
                }
                footnotes[index].innerHTML = "\\stepcounter{footnote}\\footnotetext{" + footnotes[index].innerHTML.trim() + "}"
                lastContainer.parentNode.insertBefore(footnotes[index],searchNode)
                lastContainer.nextSibling.innerHTML = "\\addtocounter{footnote}{-"+fnCounter+"}"

            } else {
                footnotes[index].innerHTML = "\\footnote{" + footnotes[index].innerHTML.trim() + "}"
                marker.appendChild(footnotes[index])
            }
        })


        /* Add LaTeX that will appear after the abstract, if there is an
         * abstract. Otherwise at start of document.
         */
        if (latexAfterAbstract.length > 0) {
            let tempNode = document.createElement('div')
            tempNode.innerHTML = latexAfterAbstract
            let abstractNode = jQuery(htmlCode).find('div#abstract')[0]
            if (abstractNode) {
                htmlCode.insertBefore(tempNode, abstractNode.nextSibling)
            } else {
                htmlCode.insertBefore(tempNode, htmlCode.firstChild)
            }

        }

        let returnObject = {
            latex: latexStart + htmlCode.textContent + latexEnd,
        }
        if (isChapter) {
            returnObject.listedWorksList = listedWorksList
        } else {
            let bibExport = new BibLatexExporter(
                listedWorksList, that.bibDB, false)
            returnObject.bibtex = bibExport.bibtexStr
        }
        return returnObject
    }
}


export class LatexExporter extends BaseLatexExporter {
    constructor(doc, bibDB) {
        super()
        let that = this
        this.doc = doc
        if (bibDB) {
            this.bibDB = bibDB // the bibliography has already been loaded for some other purpose. We reuse it.
            this.exportOne()
        } else {
            let bibGetter = new BibliographyDB(doc.owner.id, false, false, false)
            bibGetter.getBibDB(function() {
                that.bibDB = bibGetter.bibDB
                that.exportOne()
            })
        }
    }


    exportOne() {
        let title = this.doc.title

        addAlert('info', title + ': ' + gettext(
            'Latex export has been initiated.'))

        let contents = document.createElement('div')

        let tempNode = obj2Node(this.doc.contents)

        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild)
        }

        let httpOutputList = findImages(contents)

        let latexCode = this.htmlToLatex(title, this.doc.owner.name, contents,
            this.doc.settings, this.doc.metadata)

        let outputList = [{
            filename: 'document.tex',
            contents: latexCode.latex
        }]

        if (latexCode.bibtex.length > 0) {
            outputList.push({
                filename: 'bibliography.bib',
                contents: latexCode.bibtex
            })
        }

        zipFileCreator(outputList, httpOutputList, createSlug(
                title) +
            '.latex.zip')
    }
}
