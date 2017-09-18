import {escapeLatexText} from "./escape-latex"

export class LatexExporterConvert {
    constructor(exporter, imageDB, bibDB) {
        this.exporter = exporter
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.imageIds = []
        this.usedBibDB = {}
        // While walking the tree, we take note of the kinds of features That
        // are present in the file, so that we can assemble an preamble and
        // epilogue based on our findings.
        this.features = {}
        this.internalLinks = []
    }

    init(docContents) {
        this.preWalkJson(docContents)
        let rawTransformation = this.walkJson(docContents)
        let body = this.postProcess(rawTransformation)
        let preamble = this.assemblePreamble()
        let epilogue = this.assembleEpilogue()
        let latex = this.docDeclaration + preamble + body + epilogue
        let returnObject = {
            latex,
            imageIds: this.imageIds,
            usedBibDB: this.usedBibDB
        }
        return returnObject
    }

    get docDeclaration() {
        return '\\documentclass{article}\n'
    }

    // Check for things needed before creating raw transofrm
    preWalkJson(node) {
        switch(node.type) {
            // Collect all internal links so that we only set the anchors for those
            // that are being linked to.
            case 'text':
                if (node.marks) {
                    let hyperlink = node.marks.find(mark => mark.type === 'link')
                    if (hyperlink) {
                        let href = hyperlink.attrs.href
                        if (href[0] === '#' && !this.internalLinks.includes(href)) {
                            this.internalLinks.push(href.slice(1))
                        }
                    }
                }
                break
        }
        if (node.content) {
            node.content.forEach(child => this.preWalkJson(child))
        }
    }


    walkJson(node, options = {}) {
        let start = '', content = '', end = '',
            placeFootnotesAfterBlock = false

        switch(node.type) {
            case 'article':
                start += '\n\\begin{document}\n'
                end = '\n\\end{document}\n' + end
                break
            case 'title':
                start += '\n\\title{'
                end = '}' + end
                break
            case 'subtitle':
                if (node.content) {
                    start += '\n\\subtitle{'
                    end = '}' + end
                    this.features.subtitle = true
                }
                break
            case 'author':
                // Ignore - we deal with authors instead.
                break
            case 'authors':
                if (node.content) {
                    let authorsPerAffil = node.content.map(node => {
                        let author = node.attrs,
                            nameParts = [],
                            affiliation = false
                        if (author.firstname) {
                            nameParts.push(author.firstname)
                        }
                        if (author.lastname) {
                            nameParts.push(author.lastname)
                        }
                        if (nameParts.length && author.institution) {
                            affiliation = author.institution
                        } else if (author.institution) {
                            // We have an institution but no names. Use institution as name.
                            nameParts.push(author.institution)
                        }
                        return {
                            name: nameParts.join(' '),
                            affiliation,
                            email: author.email
                        }
                    }).reduce((affils, author) => {
                        let affil = author.affiliation
                        affils[affil] = affils[affil] || []
                        affils[affil].push(author)
                        return affils
                    }, {})

                    Object.values(authorsPerAffil).forEach(
                        affil => {
                            affil.forEach(
                                author => {
                                    content +=
                                        `\n\\author{${escapeLatexText(author.name)}${
                                            author.email ?
                                            `\\thanks{${
                                                escapeLatexText(author.email)
                                            }}` :
                                            ''
                                        }}`
                                }
                            )

                            content += `\n\\affil{${
                                affil[0].affiliation ?
                                escapeLatexText(affil[0].affiliation) :
                                ''
                            }}`
                        }
                    )
                    this.features.authors = true
                    content += "\n\n"
                }
                break
            case 'keywords':
                if (node.content) {
                    start += '\n\\keywords{'
                    start += node.content.map(
                        keyword => escapeLatexText(keyword.attrs.keyword)
                    ).join('\\sep ')
                    end = '}' + end
                    this.features.keywords = true
                }
                break
            case 'keyword':
                // Ignore - we already took all the keywords from the keywords node.
                break
            case 'abstract':
                // We add the maketitle command here. TODO: This relies on the
                // existence of a abstract node, even if it has no content.
                // It would be better if it wouldn't have to rely on this.
                start += '\n\n\\maketitle\n'
                if (node.content) {
                    start += '\n\\begin{abstract}\n'
                    end = '\n\\end{abstract}\n' + end
                }
                break
            case 'body':
                break
            case 'paragraph':
                start += '\n\n'
                end = '\n' + end
                break
            case 'heading':
                let level = node.attrs.level
                switch(level) {
                    case 1:
                        start += '\n\n\\section{'
                        break;
                    case 2:
                        start += '\n\n\\subsection{'
                        break;
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                        // TODO: Add support for levels 4/5/6
                        start += '\n\n\\subsubsection{'
                        break;
                }
                // Check if this heading is being linked to. If this is the case,
                // place a protected hypertarget here that does not add an extra
                // entry into the PDF TOC.
                end = '}\n\n' + end
                if (this.internalLinks.includes(node.attrs.id)) {
                    // Add a link target
                    end = `\\texorpdfstring{\\protect\\hypertarget{${node.attrs.id}}{}}{}` + end
                }
                if(!options.onlyFootnoteMarkers) {
                    placeFootnotesAfterBlock = true
                    options = Object.assign({}, options)
                    options.onlyFootnoteMarkers = true
                    options.unplacedFootnotes = []
                }
                break
            case 'code':
                start += '\n\\begin{code}\n\n'
                end = '\n\n\\end{code}\n'
                break
            case 'blockquote':
                start += '\n\\begin{quote}\n\n'
                end = '\n\n\\end{quote}\n'
                break
            case 'ordered_list':
                start += '\n\\begin{enumerated}'
                end = '\n\\end{enumerated}' + end
                if(!options.onlyFootnoteMarkers) {
                    placeFootnotesAfterBlock = true
                    options = Object.assign({}, options)
                    options.onlyFootnoteMarkers = true
                    options.unplacedFootnotes = []
                }
                break
            case 'bullet_list':
                start += '\n\\begin{itemize}'
                end = '\n\\end{itemize}' + end
                if(!options.onlyFootnoteMarkers) {
                    placeFootnotesAfterBlock = true
                    options = Object.assign({}, options)
                    options.onlyFootnoteMarkers = true
                    options.unplacedFootnotes = []
                }
                break
            case 'list_item':
                start += '\n\\item '
                end = '\n' + end
                break
            case 'footnote':
                if (options.onlyFootnoteMarkers) {
                    // We are inside a headline or a list and can only place a
                    // footnote marker here. The footnote will have to be put
                    // beyond the block node instead.
                    start += '\\protect\\footnotemark{}'
                    options.unplacedFootnotes.push(node.attrs.footnote)
                } else {
                    start += '\\footnote{'
                    let fnContent = ''
                    node.attrs.footnote.forEach(footPar => {
                        fnContent += this.walkJson(footPar, options)
                    })
                    content += fnContent.replace(/^\s+|\s+$/g, '')
                    end = '}' + end
                }
                break
            case 'text':
                // Check for hyperlink, bold/strong and italic/em
                let hyperlink, strong, em
                if (node.marks) {
                    strong = node.marks.find(mark => mark.type === 'strong')
                    em = node.marks.find(mark => mark.type === 'em')
                    hyperlink = node.marks.find(mark => mark.type === 'link')
                }
                if (em) {
                    start += '\\emph{'
                    end = '}' + end
                }
                if (strong) {
                    start += '\\textbf{'
                    end = '}' + end
                }
                if (hyperlink) {
                    let href = hyperlink.attrs.href
                    if (href[0] === '#') {
                        // Internal link
                        start += `\\hyperlink{${href.slice(1)}}{`
                    } else {
                        // External link
                        start += `\\href{${href}}{`
                    }
                    end = '}' + end
                    this.features.hyperlinks = true
                }
                content += escapeLatexText(node.text)
                break
            case 'citation':
                let references = node.attrs.references
                let format = node.attrs.format
                let citationCommand = '\\' + format

                if (references.length > 1 &&
                    references.every(ref => !ref.locator && !ref.prefix)
                ) {
                    // multi source citation without page numbers or text before.
                    let citationEntryKeys = []

                    let allCitationItemsPresent = references.map(ref => ref.id).every(
                        citationEntry => {
                            let bibDBEntry = this.bibDB.db[citationEntry]
                            if (bibDBEntry) {
                                if (!bibDBEntry) {
                                    // Not present in bibliography database, skip it.
                                    // TODO: Throw an error?
                                    return false
                                }
                                if (!this.usedBibDB[citationEntry]) {
                                    let citationKey = this.createUniqueCitationKey(
                                        bibDBEntry.entry_key
                                    )
                                    this.usedBibDB[citationEntry] = Object.assign({}, bibDBEntry)
                                    this.usedBibDB[citationEntry].entry_key = citationKey
                                }
                                citationEntryKeys.push(this.usedBibDB[citationEntry].entry_key)
                            }
                            return true
                        }
                    )
                    if (allCitationItemsPresent) {
                        citationCommand += `{${citationEntryKeys.join(',')}}`
                    } else {
                        citationCommand = false
                    }
                } else {
                    if (references.length > 1) {
                        citationCommand += 's' // Switching from \autocite to \autocites
                    }

                    let allCitationItemsPresent = references.every(
                        ref => {
                            let bibDBEntry = this.bibDB.db[ref.id]
                            if (!bibDBEntry) {
                                // Not present in bibliography database, skip it.
                                // TODO: Throw an error?
                                return false
                            }

                            if (ref.prefix) {
                                citationCommand += `[${ref.prefix}]`
                                if (!ref.locator) {
                                    citationCommand += '[]'
                                }
                            }
                            if (ref.locator) {
                                citationCommand += `[${ref.locator}]`
                            }
                            citationCommand += '{'

                            if (!this.usedBibDB[ref.id]) {
                                let citationKey = this.createUniqueCitationKey(
                                    bibDBEntry.entry_key
                                )
                                this.usedBibDB[ref.id] = Object.assign({}, bibDBEntry)
                                this.usedBibDB[ref.id].entry_key = citationKey
                            }
                            citationCommand += this.usedBibDB[ref.id].entry_key
                            citationCommand += '}'

                            return true
                        }
                    )

                    if (!allCitationItemsPresent) {
                        citationCommand = false
                    }
                }
                if (citationCommand) {
                    content += citationCommand
                    this.features.citations = true
                }
                break
            case 'figure':
                let latexPackage
                let figureType = node.attrs.figureCategory
                let caption = node.attrs.caption
                let imageDBEntry = this.imageDB.db[node.attrs.image]
                this.imageIds.push(node.attrs.image)
                let filePathName = imageDBEntry.image
                let innerFigure = ''
                if (filePathName) {
                    let filename = filePathName.split('/').pop()
                    if (filename.split('.').pop() === 'svg') {
                        latexPackage = 'includesvg'
                        this.features.SVGs = true
                    } else {
                        latexPackage = 'scaledgraphics'
                        this.features.images = true
                    }
                    innerFigure += `\\${latexPackage}{${filename}}\n`
                } else {
                    let equation = node.attrs.equation
                    innerFigure += `\\begin{displaymath}\n${equation}\n\\end{displaymath}\n`
                }
                if (figureType==='table') {
                    start += `\n\\begin{table}\n`
                    content += `\\caption{${caption}}\n${innerFigure}`
                    end += `\\end{table}\n`
                } else { // TODO: handle photo figure types in a special way
                    start += `\n\\begin{figure}\n`
                    content += `${innerFigure}\\caption{${caption}}\n`
                    end += `\\end{figure}\n`
                }
                if (this.internalLinks.includes(node.attrs.id)) {
                    // Add a link target
                    end = `\\texorpdfstring{\\protect\\hypertarget{${node.attrs.id}}{}}{}\n` + end
                }
                break
            case 'table':
                if(node.content && node.content.length) {
                    let columns = node.content[0].content.reduce(
                        (columns, node) => columns + node.attrs.colspan,
                        0
                    )
                    start += `\n\n\\begin{tabularx}{\\textwidth}{ |${'X|'.repeat(columns)} }\n\\hline\n\n`
                    end += `\\hline\n\n\\end{tabularx}`
                    this.features.tables = true
                }
                break
            case 'table_row':
                end += ' \\\\\n'
                break
            case 'table_cell':
                if (node.attrs.colspan > 1) {
                    start += `\\multicolumn{${node.attrs.colspan}}{c}{`
                    end += '}'
                }
                // TODO: these multirow outputs don't work very well with longer text.
                // If there is another alternative, please change!
                if (node.attrs.rowspan > 1) {
                    start += `\\multirow{${node.attrs.rowspan}}{*}{`
                    end += '}'
                    this.features.rowspan = true
                }
                end += ' & '
                break
            case 'equation':
                content += `$${node.attrs.equation}$`
                break
            case 'hard_break':
                content += '\n\n'
                break
            default:
                console.warn('Unhandled node type:' + node.type)
                break
        }

        if (node.content) {
            node.content.forEach(child => {
                content += this.walkJson(child, options)
            })
        }
        if (
            placeFootnotesAfterBlock &&
            options.unplacedFootnotes &&
            options.unplacedFootnotes.length
        ) {
            // There are footnotes that needed to be placed behind the node.
            // This happens in the case of headlines and lists.
            end += `\\addtocounter{footnote}{-${(options.unplacedFootnotes.length)}}`
            options.unplacedFootnotes.forEach(footnote => {
                end += '\\stepcounter{footnote}\n'
                end += '\\footnotetext{'
                let fnContent = ''
                footnote.forEach(footPar => {
                    fnContent += this.walkJson(footPar, options)
                })
                end += fnContent.replace(/^\s+|\s+$/g, '')
                end += '}'
            })
            options.unplacedFootnotes = []
        }
        if (node.type==='table_cell' && node.attrs.rowspan > 1) {
            // \multirow doesn't allow multiple paragraphs.
            content = content.trim().replace(/\n\n/g, ' \\\\ ')
        }

        return start + content + end
    }

    // The database doesn't ensure that citation keys are unique.
    // So here we need to make sure that the same key is not used twice in one
    // document.
    createUniqueCitationKey(suggestedKey) {
        let usedKeys = Object.keys(this.usedBibDB).map(key=>{
            return this.usedBibDB[key].entry_key
        })
        if (usedKeys.includes(suggestedKey)) {
            suggestedKey += 'X'
            return this.createUniqueCitationKey(suggestedKey)
        } else {
            return suggestedKey
        }
    }

    postProcess(latex) {
        return latex
        // join blocks of the same type that follow oneanother.
        .replace(/\\end{code}\n\n\\begin{code}\n\n/g, '')
        .replace(/\\end{quote}\n\n\\begin{quote}\n\n/g, '')
        // Remove the last divider in any any table row.
        .replace(/&  \\\\/g, '\\\\')
        // Remove new lines between table cells.
        .replace(/\n & \n\n/g, ' & ')
        // Remove new lines within itemization
        .replace(/\\item \n\n/g, '\\item ')
    }

    assembleEpilogue() {
        let epilogue = ''
        if (this.features.citations) {
            epilogue += '\n\n\\printbibliography'
        }
        return epilogue
    }

    assemblePreamble() {
        let preamble = '\n\\usepackage[utf8]{luainputenc}'

        if (this.features.subtitle) {
            preamble += `
                \n\\usepackage{titling}
                \n\\newcommand{\\subtitle}[1]{%
                    \n\t\\posttitle{%
                        \n\t\t\\par\\end{center}
                        \n\t\t\\begin{center}\\large#1\\end{center}
                        \n\t\t\\vskip 0.5em}%
                }
            `
        }
        if (this.features.authors) {
            preamble += `
                \n\\usepackage{authblk}
                \n\\makeatletter
                \n\\let\\@fnsymbol\\@alph
                \n\\makeatother
            `
        }

        if (this.features.keywords) {
            preamble += `
                \n\\def\\keywords{\\vspace{.5em}
                \n{\\textit{Keywords}:\\,\\relax%
                \n}}
                \n\\def\\endkeywords{\\par}
                \n\\newcommand{\\sep}{, }
            `
        }

        if (this.features.hyperlinks) {
            preamble += '\n\\usepackage{hyperref}'
        }

        if (this.features.citations) {
            preamble += `
                \n\\usepackage[backend=biber,hyperref=false,citestyle=authoryear,bibstyle=authoryear]{biblatex}
                \n\\bibliography{bibliography}
            `
        }

        if (this.features.SVGs) {
            preamble += '\n\\usepackage{svg}'
        }

        if (this.features.images) {
            preamble += '\n\\usepackage{graphicx}'
            // The following scales graphics down to text width, but not scaling them up if they are smaller
            preamble += `
                \n\\usepackage{calc}
                \n\\newlength{\\imgwidth}
                \n\\newcommand\\scaledgraphics[1]{%
                \n\\settowidth{\\imgwidth}{\\includegraphics{#1}}%
                \n\\setlength{\\imgwidth}{\\minof{\\imgwidth}{\\textwidth}}%
                \n\\includegraphics[width=\\imgwidth,height=\\textheight,keepaspectratio]{#1}%
                \n}
            `
        }

        if (this.features.tables) {
            preamble += '\n\\usepackage{tabularx}'
        }
        if (this.features.rowspan) {
            preamble += '\n\\usepackage{multirow}'
        }


        return preamble

    }

}
