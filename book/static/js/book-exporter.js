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
            }).owner);
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
        var title, coverImage, contents, contentsBody, contentItems = [],
            images = [],
            bibliography, aDocument, chapters = [],
            aChapter, aDocument,
            htmlCode, includeZips = [],
            xhtmlCode, containerCode, opfCode,
            styleSheets = [],
            outputList = [],
            httpOutputList = [],
            i, j, startHTML, mathjax = false;

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

            aDocument = _.findWhere(theDocumentList, {
                id: aBook.chapters[i].text
            });
            contents = document.createElement('div');
            contents.innerHTML = aDocument.contents;

            title = document.createElement('div');
            title.innerHTML = aDocument.title;
            title = title.innerText;

            bibliography = citationHelpers.formatCitations(contents,
                aBook.settings.citationstyle,
                aBibDB);

            if (bibliography.length > 0) {
                contents.innerHTML += bibliography;
            }

            images = images.concat(exporter.findImages(contents));

            startHTML = '<h1 class="title">' + title + '</h1>';

            if (aDocument.settings.metadata && aDocument.settings.metadata.subtitle && aDocument.metadata.subtitle &&
                aDocument.metadata.subtitle != '') {
                startHTML += '<h2 class="subtitle">' + aDocument.metadata.subtitle +
                    '</h2>';
            }
            if (aDocument.settings.metadata && aDocument.settings.metadata.abstract && aDocument.metadata.abstract &&
                aDocument.metadata.abstract != '') {
                startHTML += '<div class="abstract">' + aDocument.metadata.abstract +
                    '</div>';
            }

            contents.innerHTML = startHTML + contents.innerHTML;

            contents = exporter.cleanHTML(contents);

            contentsBody = document.createElement('body');

            contentsBody.innerHTML = contents.innerHTML;

            if (aBook.chapters[i].part && aBook.chapters[i].part != '') {
                contentItems.push({
                    link: 'document-' + aBook.chapters[i].number + '.xhtml',
                    title: aBook.chapters[i].part,
                    docNum: aBook.chapters[i].number,
                    id: 0,
                    level: -1,
                    subItems: [],
                });
            }

            // Make links to all H1-3 and create a TOC list of them
            contentItems = contentItems.concat(exporter.setLinks(
                contentsBody, aBook.chapters[i].number));

            contentsBodyEpubPrepared = exporter.styleEpubFootnotes(
                contentsBody);

            htmlCode = tmp_epub_xhtml({
                part: aBook.chapters[i].part,
                shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
                title: title,
                metadata: aDocument.metadata,
                metadataSettings: aDocument.settings.metadata,
                styleSheets: styleSheets,
                body: contentsBodyEpubPrepared.innerHTML,
                mathjax: aDocument.settings.mathjax
            });



            htmlCode = exporter.cleanHTMLString(htmlCode);

            // Turning to XHTML. This has to happen last, as this operation menas we will only have the xhtml available as a string

            xhtmlCode = exporter.htmlToXhtml(htmlCode);

            aChapter = {
                number: aBook.chapters[i].number
            }

            if (aDocument.settings.mathjax) {
                mathjax = true;
                aChapter.mathjax = true;
            }

            chapters.push(aChapter)

            outputList.push({
                filename: 'EPUB/document-' + aBook.chapters[i].number + '.xhtml',
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

        containerCode = tmp_epub_container({});

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
            title: title,
            idType: 'fidus',
            id: aDocument.id,
            contentItems: contentItems
        });

        navCode = tmp_epub_nav({
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            contentItems: contentItems
        });

        outputList = outputList.concat([{
            filename: 'META-INF/container.xml',
            contents: containerCode
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
        var title, contents, bibliography, outputList = [],
            images = [],
            aDocument, aChapter, mathjax = false,
            styleSheets = [],
            contentItems = [],
            includeZips = [];


        aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
            return chapter.number;
        });

        for (i = 0; i < aBook.chapters.length; i++) {

            aDocument = _.findWhere(theDocumentList, {
                id: aBook.chapters[i].text
            });
            title = document.createElement('div');
            title.innerHTML = aDocument.title;
            title = title.innerText;

            contents = document.createElement('div');
            contents.innerHTML = aDocument.contents;

            bibliography = citationHelpers.formatCitations(contents,
                aBook.settings.citationstyle,
                aBibDB);

            if (bibliography.length > 0) {
                contents.innerHTML += bibliography;
            }

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


            contentsCode = exporter.cleanHTMLString(contents.innerHTML);

            htmlCode = tmp_html_export({
                'part': aBook.chapters[i].part,
                'title': title,
                'metadata': aDocument.metadata,
                'metadataSettings': aDocument.settings.metadata,
                'styleSheets': styleSheets,
                'contents': contentsCode,
                'mathjax': aDocument.settings.mathjax,
            });

            outputList.push({
                filename: 'document-' + aBook.chapters[i].number + '.html',
                contents: htmlCode
            });

            if (aDocument.settings.mathjax) {
                mathjax = true;
            }
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
            images = [],
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

            title = document.createElement('div');
            title.innerHTML = aDocument.title;
            title = title.innerText;

            contents = document.createElement('div');
            contents.innerHTML = aDocument.contents;

            allContent.innerHTML += aDocument.contents;

            images = images.concat(exporter.findImages(contents));

            latexCode = exporter.htmlToLatex(title, aDocument.owner_name, contents, aBibDB,
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
            allContent, aBook.title, author, true, aBook.metadata, 'book');

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