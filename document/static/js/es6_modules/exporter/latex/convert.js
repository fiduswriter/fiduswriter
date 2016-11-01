import {escapeLatexText} from "./escape-latex"
import {noSpaceTmp} from "../../common/common"
import {BibLatexExporter} from "../../bibliography/exporter/biblatex"

export class LatexExporterConvert {
    constructor(exporter, docContents, imageDB, bibDB) {
        this.exporter = exporter
        this.docContents = docContents
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.usedImageDB = {}
        this.usedBibs = []
        // While walking the tree, we take note of the kinds of features That
        // are present in the file, so that we can assemble an preamble and
        // epilogue based on our findings.
        this.features = {}
    }

    init() {
        let allParts = this.assembleAllParts()
        let latex = this.docDeclaration + allParts.preamble + allParts.body + allParts.epilogue
        let returnObject = {
            latex,
            usedImageDB: this.usedImageDB
        }
        if (this.usedBibs.length > 0) {
            let bibExport = new BibLatexExporter(
                this.usedBibs, this.bibDB.db, false)
            returnObject.bibtex = bibExport.bibtexStr
        }
        return returnObject

    }

    assembleAllParts() {
        let rawTransformation = this.walkJson(this.docContents)
        let body = this.postProcess(rawTransformation)
        let preamble = this.assemblePreamble()
        let epilogue = this.assembleEpilogue()
        return {
            preamble,
            body,
            epilogue
        }
    }

    get docDeclaration() {
        return '\\documentclass{article}\n'
    }



    walkJson(node, options = {}) {
        let start = '', content = '', end = '',
            placeFootnotesAfterBlock = false, that = this

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
                // We add the maketitle command here. TODO: This relies on the
                // existence of a subtitle node, even if it has no content.
                // It would be better if it wouldn't have to rely on this.
                start += '\n\n\\maketitle\n'
                break
            case 'authors':
                if (node.content) {
                    start += '\n\\authors{'
                    end = '}' + end
                }
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
                start += '\n\\tableofcontents\n'
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
                let citationEntries = node.attrs.bibEntry.split(','),
                    citationBefore = node.attrs.bibBefore.split(','),
                    citationPage = node.attrs.bibPage.split(','),
                    citationFormat = node.attrs.bibFormat,
                    citationCommand = '\\' + citationFormat

                if (citationEntries.length > 1 &&
                    citationBefore.join('').length === 0 &&
                    citationPage.join('').length === 0) {
                    // multi source citation without page numbers or text before.
                    let citationEntryKeys = []

                    citationEntries.forEach(function(citationEntry) {
                        let bibDBEntry = that.bibDB.db[citationEntry]
                        if (bibDBEntry) {
                            citationEntryKeys.push(bibDBEntry.entry_key)
                            if (that.usedBibs.indexOf(citationEntry) === -1) {
                                that.usedBibs.push(citationEntry)
                            }
                        }
                    })

                    citationCommand += `{${citationEntryKeys.join(',')}}`
                } else {
                    if (citationEntries.length > 1) {
                        citationCommand += 's' // Switching from \autocite to \autocites
                    }

                    citationEntries.forEach(function(citationEntry, index) {
                        if (!that.bibDB.db[citationEntry]) {
                            return false // Not present in bibliography database, skip it.
                        }

                        if (citationBefore[index] && citationBefore[index].length > 0) {
                            citationCommand += `[${citationBefore[index]}]`
                            if (!citationPage[index] || citationPage[index].length === 0) {
                                citationCommand += '[]'
                            }
                        }
                        if (citationPage[index] && citationPage[index].length > 0) {
                            citationCommand += `[${citationPage[index]}]`
                        }
                        citationCommand += '{'

                        citationCommand += that.bibDB.db[citationEntry].entry_key
                        if (that.usedBibs.indexOf(citationEntry) === -1) {
                            that.usedBibs.push(citationEntry)
                        }
                        citationCommand += '}'
                    })
                }
                content += citationCommand
                this.features.citations = true
                break
            case 'figure':
                let latexPackage
                let figureType = node.attrs.figureCategory
                let caption = node.attrs.caption
                let imageDBEntry = this.imageDB.db[node.attrs.image]
                this.usedImageDB[node.attrs.image] = imageDBEntry
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
            for (let i=0; i < node.content.length; i++) {
                content += this.walkJson(node.content[i], options)
            }
        }

        if (placeFootnotesAfterBlock && options.unplacedFootnotes.length) {
            // There are footnotes that needed to be placed behind the node.
            // This happens in the case of headlines and lists.
            if (options.unplacedFootnotes.length > 1) {
                end += `\\addtocounter{footnote}{-${(options.unplacedFootnotes.length)}}`
                options.unplacedFootnotes.forEach(function(footnote){
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

    postProcess(latex) {
        return latex
        // join blocks of the same type that follow oneanother.
        .replace(/\\end{code}\n\n\\begin{code}\n\n/g, '')
        .replace(/\\end{quote}\n\n\\begin{quote}\n\n/g, '')
        // Remove the last divider in any any table row.
        .replace(/& \\\\/g, '\\\\')
    }

    assembleEpilogue() {
        let epilogue = ''
        if (this.features.citations) {
            epilogue += '\n\n\\printbibliography'
        }
        return epilogue
    }

    assemblePreamble() {
        let preamble = '\\usepackage[utf8]{luainputenc}'

        if (this.features.subtitle) {
            preamble += noSpaceTmp`
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
            preamble += noSpaceTmp`
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
            preamble += noSpaceTmp`
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
            preamble += noSpaceTmp`
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
