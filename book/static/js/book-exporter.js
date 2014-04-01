/**
 * @file Helper functions for book export.
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm.
 *
 * @license This program is free software: you can redistribute it and/or modify
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
 * along with this program.  If not, see <a href='http://www.gnu.org/licenses'>http://www.gnu.org/licenses</a>.
 *
 */

(function () {
    var exports = this,
   /** 
  * Functions for exporting books (to epub, LaTeX, HTML). TODO 
  * @namespace bookExporter
  */
        bookExporter = {};

    bookExporter.getMissingChapterData = function (aBook, callback) {
        var bookDocuments = [],
            i;

        for (i = 0; i < aBook.chapters.length; i++) {
            if (!_.findWhere(theDocumentList, {id: aBook.chapters[i].text})) {
                $.addAlert('error', "Cannot produce book as you lack access rights to its chapters.");
                return;
            }
            bookDocuments.push(aBook.chapters[i].text);
        }
        documentHelpers.getMissingDocumentListData(bookDocuments, callback);
    };

    bookExporter.getImageAndBibDB = function (aBook, callback) {
        var documentOwners = [],
            i;
        for (i = 0; i < aBook.chapters.length; i++) {
            documentOwners.push(_.findWhere(theDocumentList, {
                id: aBook.chapters[i].text
            }).owner.id);
        }

        documentOwners = _.unique(documentOwners).join(',');

        usermediaHelpers.getAnImageDB(documentOwners, function (anImageDB) {
            bibliographyHelpers.getABibDB(documentOwners, function (
                aBibDB) {
                callback(anImageDB, aBibDB);
            });
        });
    };


    bookExporter.uniqueObjects = function (array) {
        var results = [],
            i, j, willCopy;

        for (i = 0; i < array.length; i++) {
            willCopy = true;
            for (j = 0; j < i; j++) {
                if (_.isEqual(array[i], array[j])) {
                    willCopy = false;
                    break;
                }
            }
            if (willCopy) {
                results.push(array[i]);
            }
        }

        return results;
    };

    bookExporter.downloadEpub = function (aBook) {
        bookExporter.getMissingChapterData(aBook, function () {
            bookExporter.getImageAndBibDB(aBook, function (anImageDB,
                aBibDB) {
                bookExporter.epub(aBook, anImageDB, aBibDB);
            });
        });
    };

    bookExporter.epub = function (aBook, anImageDB, aBibDB) {
        var coverImage, contents, contentItems = [],
            images = [],
            bibliography, chapters = [],
            aChapter, equations, figureEquations,
            styleSheets = [],
            outputList = [],
            tempNode, mathjax = false,
            i, j, startHTML;

        aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
            return chapter.number;
        });


        if (aBook.cover_image) {
            coverImage = _.findWhere(anImageDB, {
                pk: aBook.cover_image
            });
            images.push({
                url: coverImage.image.split('?')[0],
                filename: coverImage.image.split('/').pop().split('?')[0]
            });

            outputList.push({
                filename: 'EPUB/cover.xhtml',
                contents: tmp_epub_book_cover({
                    aBook: aBook,
                    coverImage: coverImage
                })
            });
            contentItems.push({
                link: 'cover.xhtml#cover',
                title: gettext('Cover'),
                docNum: 0,
                id: 0,
                level: 0,
                subItems: [],
            });
        }
        contentItems.push({
            link: 'titlepage.xhtml#title',
            title: gettext('Title page'),
            docNum: 0,
            id: 1,
            level: 0,
            subItems: [],
        });




        for (i = 0; i < aBook.chapters.length; i++) {

            aChapter = {};
            
            aChapter.document = _.findWhere(theDocumentList, {
                id: aBook.chapters[i].text
            });
            
            tempNode = exporter.obj2Node(aChapter.document.contents);
            
            contents = document.createElement('body');
            
            while (tempNode.firstChild) {
                contents.appendChild(tempNode.firstChild);
            }

            bibliography = citationHelpers.formatCitations(contents,
                aBook.settings.citationstyle,
                aBibDB);

            if (bibliography.length > 0) {
                contents.innerHTML += bibliography;
            }

            images = images.concat(exporter.findImages(contents));

            startHTML = '<h1 class="title">' + aChapter.document.title + '</h1>';

            if (aChapter.document.settings.metadata && aChapter.document.settings.metadata.subtitle && aChapter.document.metadata.subtitle) {
                tempNode = exporter.obj2Node(aChapter.document.metadata.subtitle);
                if (tempNode && tempNode.textContent.length > 0) {
                    startHTML += '<h2 class="subtitle">' + tempNode.textContent +
                        '</h2>';
                }
            }
            if (aChapter.document.settings.metadata && aChapter.document.settings.metadata.abstract && aChapter.document.metadata.abstract) {
                tempNode = exporter.obj2Node(aChapter.document.metadata.abstract);
                if (tempNode && tempNode.textContent.length > 0) {                
                    startHTML += '<div class="abstract">' + tempNode.textContent +
                        '</div>';
                }
            }

            contents.innerHTML = startHTML + contents.innerHTML;

            contents = exporter.cleanHTML(contents);
            
            aChapter.number = aBook.chapters[i].number;
            
            aChapter.part = aBook.chapters[i].part;

            equations = contents.querySelectorAll('.equation');
           
            figureEquations = contents.querySelectorAll('.figure-equation');
            
            if (equations.length > 0 || figureEquations.length > 0) {
                aChapter.mathjax = true;
                mathjax = true;
            }

            for (j = 0; j < equations.length; j++) {
                mathHelpers.layoutMathNode(equations[j]);
            }            

            
            for (j = 0; j < figureEquations.length; j++) {
                mathHelpers.layoutDisplayMathNode(figureEquations[j]);
            }                    

            if (aBook.chapters[i].part && aBook.chapters[i].part != '') {
                contentItems.push({
                    link: 'document-' + aBook.chapters[i].number + '.xhtml',
                    title: aChapter.part,
                    docNum: aChapter.number,
                    id: 0,
                    level: -1,
                    subItems: [],
                });
            }

            // Make links to all H1-3 and create a TOC list of them
            contentItems = contentItems.concat(exporter.setLinks(
                contents, aChapter.number));
            
         //   aChapter.contents = exporter.styleEpubFootnotes(contents);
            
            aChapter.contents = contents;
            
            chapters.push(aChapter)            

        }
        
        mathHelpers.queueExecution(function () {
            bookExporter.epub2(chapters, contentItems, images, coverImage, styleSheets, outputList, mathjax, aBook);
        });
    };
    
    
    bookExporter.epub2 = function (chapters, contentItems, images, coverImage, styleSheets, outputList, mathjax, aBook) {   
        var includeZips = [],
            xhtmlCode, opfCode,
            httpOutputList = [],
            i;
        
            
        if (mathjax) {
            mathjax = exporter.getMathjaxHeader();
        
            if (mathjax) {    
                mathjax = exporter.obj2Node(exporter.node2Obj(mathjax), 'xhtml').outerHTML;
            }
        }
            
            
        for (i=0;i<chapters.length;i++) {

            chapters[i].contents = exporter.styleEpubFootnotes(chapters[i].contents);
            
            if (chapters[i].mathjax) {
                chapters[i].mathjax = mathjax;
            }
            
            xhtmlCode = tmp_epub_xhtml({
                part: chapters[i].part,
                shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
                title: chapters[i].document.title,
                metadata: chapters[i].document.metadata,
                metadataSettings: chapters[i].document.settings.metadata,
                styleSheets: styleSheets,
                body: exporter.obj2Node(exporter.node2Obj(chapters[i].contents), 'xhtml').innerHTML,
                mathjax: chapters[i].mathjax
            });

            xhtmlCode = exporter.replaceImgSrc(xhtmlCode);

            outputList.push({
                filename: 'EPUB/document-' + chapters[i].number + '.xhtml',
                contents: xhtmlCode
            });
        }

        contentItems.push({
            link: 'copyright.xhtml#copyright',
            title: gettext('Copyright'),
            docNum: 0,
            id: 2,
            level: 0,
            subItems: [],
        });

        contentItems = exporter.orderLinks(contentItems);

        timestamp = exporter.getTimestamp();

        images = bookExporter.uniqueObjects(images);

        // mark cover image
        if (typeof(coverImage) != 'undefined') {
            _.findWhere(images, {
                url: coverImage.image.split('?')[0]
            }).coverImage = true;
        }

        opfCode = tmp_epub_book_opf({
            language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
            aBook: aBook,
            theUser: theUser,
            idType: 'fidus',
            date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
            modified: timestamp,
            styleSheets: styleSheets,
            mathjax: mathjax,
            images: images,
            chapters: chapters,
            coverImage: coverImage
        });

        ncxCode = tmp_epub_ncx({
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title: aBook.title,
            idType: 'fidus',
            id: aBook.id,
            contentItems: contentItems
        });

        navCode = tmp_epub_nav({
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            contentItems: contentItems
        });

        outputList = outputList.concat([{
            filename: 'META-INF/container.xml',
            contents: tmp_epub_container({})
        }, {
            filename: 'EPUB/document.opf',
            contents: opfCode
        }, {
            filename: 'EPUB/document.ncx',
            contents: ncxCode
        }, {
            filename: 'EPUB/document-nav.xhtml',
            contents: navCode
        }, {
            filename: 'EPUB/titlepage.xhtml',
            contents: tmp_epub_book_titlepage({
                aBook: aBook
            })
        }, {
            filename: 'EPUB/copyright.xhtml',
            contents: tmp_epub_book_copyright({
                aBook: aBook,
                creator: theUser.name,
                language: gettext('English') //TODO: specify a book language rather than using the current users UI language
            })
        }]);




        for (i = 0; i < styleSheets.length; i++) {
            outputList.push({
                filename: 'EPUB/' + styleSheets[i].filename,
                contents: styleSheets[i].contents
            });
        }



        for (i = 0; i < images.length; i++) {
            httpOutputList.push({
                filename: 'EPUB/' + images[i].filename,
                url: images[i].url
            });
        }

        if (mathjax) {
            includeZips.push({
                'directory': 'EPUB',
                'url': mathjaxZipUrl,
            })
        }

        exporter.zipFileCreator(outputList, httpOutputList, exporter.createSlug(
                aBook.title) +
            '.epub', 'application/epub+zip', includeZips);
    };

    bookExporter.downloadHtml = function (aBook) {
        bookExporter.getMissingChapterData(aBook, function () {
            bookExporter.getImageAndBibDB(aBook, function (anImageDB,
                aBibDB) {
                bookExporter.html(aBook, anImageDB, aBibDB);
            });
        });
    };

    bookExporter.html = function (aBook, anImageDB, aBibDB) {
        var contents, bibliography,
            aDocument, mathjax = false,
            styleSheets = [],
            chapters = [], i, j;


        aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
            return chapter.number;
        });

        for (i = 0; i < aBook.chapters.length; i++) {

            aDocument = _.findWhere(theDocumentList, {
                id: aBook.chapters[i].text
            });

            contents = exporter.obj2Node(aDocument.contents);

            bibliography = citationHelpers.formatCitations(contents,
                aBook.settings.citationstyle,
                aBibDB);

            if (bibliography.length > 0) {
                contents.innerHTML += bibliography;
            }
            
            equations = contents.querySelectorAll('.equation');
           
            figureEquations = contents.querySelectorAll('.figure-equation');
            
            if (equations.length > 0 || figureEquations.length > 0) {
                mathjax = true;
            }

            for (j = 0; j < equations.length; j++) {
                mathHelpers.layoutMathNode(equations[j]);
            }            

            
            for (j = 0; j < figureEquations.length; j++) {
                mathHelpers.layoutDisplayMathNode(figureEquations[j]);
            }    
            
            chapters.push({document:aDocument,contents:contents});
        }
        mathHelpers.queueExecution(function () {
            bookExporter.html2(chapters, mathjax, styleSheets, aBook);
        });
    };
    
    bookExporter.html2 = function (chapters, mathjax, styleSheets, aBook) {    
        var title, contents, outputList = [],
            images = [],
            aDocument,
            contentItems = [],
            includeZips = [], i;
            
        if (mathjax) {
            mathjax = exporter.getMathjaxHeader();
        
            if (mathjax) {    
                mathjax = mathjax.outerHTML;
            }
        }    
            
            
        for (i=0; i < chapters.length; i++) {
            
            contents = chapters[i].contents;
            
            aDocument = chapters[i].document;

            title = aDocument.title;
                        
            images = images.concat(exporter.findImages(contents));

            contents = exporter.cleanHTML(contents);

            if (aBook.chapters[i].part && aBook.chapters[i].part != '') {
                contentItems.push({
                    link: 'document-' + aBook.chapters[i].number + '.html',
                    title: aBook.chapters[i].part,
                    docNum: aBook.chapters[i].number,
                    id: 0,
                    level: -1,
                    subItems: [],
                });
            }

            contentItems.push({
                link: 'document-' + aBook.chapters[i].number + '.html',
                title: title,
                docNum: aBook.chapters[i].number,
                id: 0,
                level: 0,
                subItems: [],
            });

            // Make links to all H1-3 and create a TOC list of them
            contentItems = contentItems.concat(exporter.setLinks(contents,
                aBook.chapters[i].number));


            contentsCode = exporter.replaceImgSrc(contents.innerHTML);

            htmlCode = tmp_html_export({
                'part': aBook.chapters[i].part,
                'title': title,
                'metadata': aDocument.metadata,
                'metadataSettings': aDocument.settings.metadata,
                'styleSheets': styleSheets,
                'contents': contentsCode,
                'mathjax': mathjax,
            });

            outputList.push({
                filename: 'document-' + aBook.chapters[i].number + '.html',
                contents: htmlCode
            });

        }

        contentItems = exporter.orderLinks(contentItems);



        outputList = outputList.concat(styleSheets);

        outputList.push({
            filename: 'index.html',
            contents: tmp_html_book_index({
                contentItems: contentItems,
                aBook: aBook,
                creator: theUser.name,
                language: gettext('English') //TODO: specify a book language rather than using the current users UI language
            })
        });

        if (mathjax) {
            includeZips.push({
                'directory': '',
                'url': mathjaxZipUrl,
            })
        }

        images = bookExporter.uniqueObjects(images);

        exporter.zipFileCreator(outputList, images, exporter.createSlug(
                aBook.title) +
            '.html.zip', false, includeZips);
    };

    bookExporter.downloadLatex = function (aBook) {
        bookExporter.getMissingChapterData(aBook, function () {
            bookExporter.getImageAndBibDB(aBook, function (anImageDB,
                aBibDB) {
                bookExporter.latex(aBook, anImageDB, aBibDB);
            });
        });
    };

    bookExporter.latex = function (aBook, anImageDB, aBibDB) {
        var contents, latexCode, htmlCode, title, outputList = [],
            images = [], aDocument,
            listedWorksList = [],
            bibtex, allContent = document.createElement('div'),
            documentFeatures, latexStart, latexEnd, author;


        aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
            return chapter.number;
        });

        for (i = 0; i < aBook.chapters.length; i++) {

            aDocument = _.findWhere(theDocumentList, {
                id: aBook.chapters[i].text
            });

            title = aDocument.title;

            contents = exporter.obj2Node(aDocument.contents);

            allContent.innerHTML += contents.innerHTML;

            images = images.concat(exporter.findImages(contents));

            latexCode = exporter.htmlToLatex(title, aDocument.owner.name, contents, aBibDB,
                aDocument.settings.metadata, aDocument.metadata, true,
                listedWorksList);

            listedWorksList = latexCode.listedWorksList;

            outputList.push({
                filename: 'chapter-' + aBook.chapters[i].number + '.tex',
                contents: latexCode.latex
            });

        }

        if (aBook.metadata.author && aBook.metadata.author != '') {
            author = aBook.metadata.author;
        } else {
            author = aBook.owner_name;
        }
        documentFeatures = exporter.findLatexDocumentFeatures(
            allContent, aBook.title, author, aBook.metadata.subtitle, aBook.metadata.keywords, aBook.metadata.author, aBook.metadata, 'book');
 
        
        latexStart = documentFeatures.latexStart;
        latexEnd = documentFeatures.latexEnd;

        outputList.push({
            filename: exporter.createSlug(
                aBook.title) + '.tex',
            contents: tmp_latex_book_index({
                aBook: aBook,
                latexStart: latexStart,
                latexEnd: latexEnd
            })
        });

        bibtex = new bibliographyHelpers.bibLatexExport(listedWorksList,
            aBibDB);

        if (bibtex.bibtex_str.length > 0) {
            outputList.push({
                filename: 'bibliography.bib',
                contents: bibtex.bibtex_str
            });
        }

        images = bookExporter.uniqueObjects(images);

        exporter.zipFileCreator(outputList, images, exporter.createSlug(
                aBook.title) +
            '.latex.zip');
    };

    exports.bookExporter = bookExporter;

}).call(this);