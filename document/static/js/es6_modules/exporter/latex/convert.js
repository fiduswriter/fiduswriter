import {escapeLatexText} from "./escape-latex"

export class LatexExporterConvert {
    constructor(exporter, imageDB, bibDB, compiled, docClass ='article') {
        this.exporter = exporter
        this.imageDB = imageDB
        this.docClass=docClass
        this.bibDB = bibDB
        this.compiled=compiled
        this.imageIds = []
        this.usedBibDB = {}
        // While walking the tree, we take note of the kinds of features That
        // are present in the file, so that we can assemble an preamble and
        // epilogue based on our findings.
        this.features = {}
    }

    init(docContents) {
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
        return '\\documentclass[english]{'+this.docClass+'}\n'
    }


    walkJson(node, options = {}) {
        let start = '', content = '', end = '',
            placeFootnotesAfterBlock = false

        switch(node.type) {
            case 'article':
                start += '\n\\begin{document}\n'
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
            case 'authors':
                if (node.content) {
                    start += '\n\\author{'+node.content[0].text +'}'

                }
                // We add the maketitle command here. TODO: This relies on the
                // existence of a subtitle node, even if it has no content.
                // It would be better if it wouldn't have to rely on this.
                start += '\n\n\\maketitle\n'
                break
            case 'keywords':
                if (node.content) {
                    start += '\n\\keywords{'
                    end = '}' + end
                    this.features.keywords = true
                }
                break
            case 'abstract':
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
                end = '}\n\n' + end
                if(!options.onlyFootnoteMarkers) {
                    placeFootnotesAfterBlock = true
                    options = _.clone(options)
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
                    options = _.clone(options)
                    options.onlyFootnoteMarkers = true
                    options.unplacedFootnotes = []
                }
                break
            case 'bullet_list':
                start += '\n\\begin{itemize}'
                end = '\n\\end{itemize}' + end
                if(!options.onlyFootnoteMarkers) {
                    placeFootnotesAfterBlock = true
                    options = _.clone(options)
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
                    start += '\\protect\\footnotemark'
                    options.unplacedFootnotes.push(node.attrs.footnote)
                } else {
                    start += '\\footnote{'
                    content += this.walkJson(node.attrs.footnote, options)
                    end = '}' + end
                }
                break
            case 'text':
                // Check for hyperlink, bold/strong and italic/em
                let hyperlink, strong, em
                if (node.marks) {
                    strong = _.findWhere(node.marks, {type:'strong'})
                    em = _.findWhere(node.marks, {type:'em'})
                    hyperlink = _.findWhere(node.marks, {type:'link'})
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
                    start += `\\href{${hyperlink.attrs.href}}{`
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
                let innerFigure = ''
                let imageDBEntry = this.imageDB.db[node.attrs.image]
                if (imageDBEntry) {
                    this.imageIds.push(node.attrs.image)
                    let filePathName = imageDBEntry.image
                    let filename = filePathName.split('/').pop()
                    if (filename.split('.').pop() === 'svg') {
                        latexPackage = 'includesvg'
                        this.features.SVGs = true
                    } else {
                        latexPackage = 'scaledgraphics'
                        this.features.images = true
                    }
                    if(this.compiled){
                        innerFigure += `\\${latexPackage}{/images/${filename}}\n`
                    } else {
                        innerFigure += `\\${latexPackage}{${filename}}\n`
                    }

                } else {
                    let equation = node.attrs.equation
                    innerFigure += `\\begin{displaymath}\n${equation}\n\\end{displaymath}\n`
                }
                if (figureType==='table') {
                    content += `\n\\begin{table}\n\\caption{${caption}}\n${innerFigure}\\end{table}\n`
                } else { // TODO: handle photo figure types in a special way
                    content += `\n\\begin{figure}\n${innerFigure}\\caption{${caption}}\n\\end{figure}\n`
                }
                break
            case 'table':
                start += `\n\n\\begin{tabularx}{\\textwidth}{ |${'X|'.repeat(node.attrs.columns)} }\n\\hline\n\n`
                end += `\n\n\\end{tabularx}`
                this.features.tables = true
                break
            case 'table_row':
                end += ' \\\\ \\hline\n'
                break
            case 'table_cell':
                end += ' & '
                break
            case 'equation':
                content += `$${node.attrs.equation}$`
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

        if (placeFootnotesAfterBlock &&
            options.unplacedFootnotes &&
            options.unplacedFootnotes.length) {
            // There are footnotes that needed to be placed behind the node.
            // This happens in the case of headlines and lists.
            if (options.unplacedFootnotes.length > 1) {
                end += `\\addtocounter{footnote}{-${(options.unplacedFootnotes.length)}}`
                options.unplacedFootnotes.forEach(footnote => {
                    end += '\\stepcounter{footnote}\n'
                    end += '\\footnotetext{'
                    end += this.walkJson(footnote, options)
                    end += '}'
                })
                options.unplacedFootnotes = []
            }
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
        	epilogue +='\n\n\\end{document}\n'
        }
        else{
        	epilogue += '\n\\end{document}\n'
        }
        return epilogue
    }

    assemblePreamble() {
        let preamble =''//\n\\usepackage[utf8]{luainputenc}

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

        if (this.features.keywords) {
            preamble += `
                \n\\def\\keywords{\\vspace{.5em}
                \n{\\textit{Keywords}:\\,\\relax%
                \n}}
                \n\\def\\endkeywords{\\par}
            `
        }

        if (this.features.hyperlinks) {
            preamble += '\n\\usepackage{hyperref}'
        }

        if (this.features.citations) {
            preamble += `
                \n\\usepackage[backend=biber,hyperref=false,citestyle=authoryear,bibstyle=authoryear]{biblatex}
                \n\\addbibresource{bibliography.bib}
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

        return preamble

    }

}
