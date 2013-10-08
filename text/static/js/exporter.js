/**
 * This file is part of Fidus Writer <http://www.fiduswriter.org>
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm
 *
 * This program is free software: you can redistribute it and/or modify
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

var FW_FILETYPE_VERSION = "1.1";

(function () {
    var exports = this,
        exporter = {};

    exporter.downloadFile = function (zipFilename, blob) {
        var blobURL = URL.createObjectURL(blob);
        var fakeDownloadLink = document.createElement('a');
        var clickEvent = document.createEvent("MouseEvent");
        clickEvent.initMouseEvent("click", true, true, window,
            0, 0, 0, 0, 0, false, false, false, false, 0, null);
        fakeDownloadLink.href = blobURL;
        fakeDownloadLink.setAttribute('download', zipFilename);
        fakeDownloadLink.dispatchEvent(clickEvent);
    };

    exporter.zipFileCreator = function (textFiles, httpFiles, zipFileName,
        mimeType,
        includeZips) {
        var zipFs = new zip.fs.FS(),
            i, zipDir;

        if (mimeType) {
            zipFs.root.addText('mimetype', mimeType);
        } else {
            mimeType = 'application/zip';
        }


        var createZip = function () {
            for (i = 0; i < textFiles.length; i++) {

                zipFs.root.addText(textFiles[i].filename, textFiles[i].contents);

            }

            for (i = 0; i < httpFiles.length; i++) {

                zipFs.root.addHttpContent(httpFiles[i].filename, httpFiles[
                    i].url);

            }


            zip.createWriter(new zip.BlobWriter(mimeType), function (
                writer) {


                var currentIndex = 0;

                function process(zipWriter, entry, onend, onprogress,
                    totalSize) {
                    var childIndex = 0;

                    function exportChild() {
                        var child = entry.children[childIndex],
                            level = 9;
                        if (child) {
                            if (child.getFullname() === 'mimetype') {
                                level = 0; // turn compression off for mimetype file
                            }
                            if (child.hasOwnProperty('Reader')) {
                                reader = new child.Reader(child.data);
                            } else {
                                reader = null;
                            }

                            zipWriter.add(child.getFullname(), reader,
                                function () {
                                    currentIndex += child.uncompressedSize ||
                                        0;
                                    process(zipWriter, child, function () {
                                        childIndex++;
                                        exportChild();
                                    }, onprogress, totalSize);
                                }, function (index) {
                                    if (onprogress)
                                        onprogress(currentIndex + index,
                                            totalSize);
                                }, {
                                    directory: child.directory,
                                    version: child.zipVersion,
                                    level: level
                                });
                        } else {
                            onend();
                        }
                    }

                    exportChild();
                }




                process(writer, zipFs.root, function () {
                    writer.close(function (blob) {
                        exporter.downloadFile(zipFileName, blob);
                    });
                });


            });
        };

        if (includeZips) {
            i = 0;
            var includeZipLoop = function () {
                // for (i = 0; i < includeZips.length; i++) {
                if (i === includeZips.length) {
                    createZip();
                } else {
                    if (includeZips[i].directory === '') {
                        zipDir = zipFs.root;
                    } else {
                        zipDir = zipFs.root.addDirectory(includeZips[i].directory);
                    }
                    zipDir.importHttpContent(includeZips[i].url, false,
                        function () {
                            i++;
                            includeZipLoop();
                        });
                }

            }
            includeZipLoop();
        } else {
            createZip();
        }
    };

    exporter.createSlug = function (str) {
        str = str.replace(/[^a-zA-Z0-9\s]/g, "");
        str = str.toLowerCase();
        str = str.replace(/\s/g, '-');
        return str;
    };

    exporter.cleanHTML = function (htmlCode) {


        // Remove empty space characters
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /[\u180e\u200b\u205f]/g,
            '');

        // Replace nbsp spaces with normal ones
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

        jQuery(htmlCode).find('.pagination-footnote').each(function () {
            this.innerHTML = this.firstChild.firstChild.innerHTML;
            this.classList.remove('pagination-footnote');
            this.classList.add('footnote');
            this.removeAttribute('id');
        });

        jQuery(htmlCode).find('.del').each(function () {
            this.outerHTML = '';
        });

        jQuery(htmlCode).find('.citation,.ins').each(function () {
            this.outerHTML = this.innerHTML;
        });

        jQuery(htmlCode).find('script').each(function () {
            this.outerHTML = '';
        });

        jQuery(htmlCode).find('figcaption .figure-cat-figure').each(
            function (index) {
                this.innerHTML += ' ' + (index + 1) + ': ';
            });

        jQuery(htmlCode).find('figcaption .figure-cat-photo').each(function (
            index) {
            this.innerHTML += ' ' + (index + 1) + ': ';
        });

        jQuery(htmlCode).find('figcaption .figure-cat-table').each(function (
            index) {
            this.innerHTML += ' ' + (index + 1) + ': ';
        });
        return htmlCode;

    };

    exporter.cleanHTMLString = function (htmlString) {
        htmlString = htmlString.replace(/<img data-src([^>]+)>/gm,
            "<img src$1>");

        return htmlString;
    }

    exporter.findImages = function (htmlCode) {
        var imageLinks = jQuery(htmlCode).find('img'),
            images = [];

        imageLinks.each(function (index) {
            var src, name, newImg;
            src = jQuery(this).attr('src').split('?')[0];
            name = src.split('/').pop();
            // JPGs are output as PNG elements as well.
            if (name === '') {
                // name was not retrievable so we give the image a unique numerical name like 1.png, 2.jpg, 3.svg, etc. .
                name = index;
            }

            newImg = document.createElement('img');
            // We set the src of the image as "data-src" for now so that the browser won't try to load the file immediately
            newImg.setAttribute('data-src', name);
            this.parentNode.replaceChild(newImg, this);

            if (!_.findWhere(images,{'filename':name})) {

                images.push({
                    'filename': name,
                    'url': src
                });
            }
        })

        return images;
    };

    exporter.findLatexDocumentFeatures = function (htmlCode, title, author,
        subtitle,
        metadata, documentClass) {
        var includePackages, documentEndCommands = '',
            latexStart, latexEnd;

        includePackages = '\\usepackage[utf8]{luainputenc}';

        if (subtitle && metadata.subtitle && metadata.subtitle != '') {
            includePackages +=
                '\n\\usepackage{titling}\
\n\\newcommand{\\subtitle}[1]{%\
\n\t\\posttitle{%\
\n\t\t\\par\\end{center}\
\n\t\t\\begin{center}\\large#1\\end{center}\
\n\t\t\\vskip 0.5em}%\
\n}'
        }


        if (jQuery(htmlCode).find('a').length > 0) {
            includePackages += '\n\\usepackage{hyperref}';
        }
        if (jQuery(htmlCode).find('.citation').length > 0) {
            includePackages +=
                '\n\\usepackage[backend=biber]{biblatex}\n\\bibliography{bibliography}';
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
            '\n\\begin{document}\n\n\\title{' + title + '}\n\\author{'+author+'}\n';
        if (subtitle && metadata.subtitle && metadata.subtitle != '') {
            var subtitleDiv = document.createElement('div');
            subtitleDiv.innerHTML = metadata.subtitle;
            latexStart += '\\subtitle{' + subtitleDiv.innerText + '}\n';
        }

        latexStart += '\n\\maketitle\n\n';

        if(documentClass==='book') {
            if (metadata.publisher && metadata.publisher !='') {
                latexStart += metadata.publisher +'\n\n';
            }

            if (metadata.copyright && metadata.copyright !='') {
                latexStart += metadata.copyright +'\n\n';
            }

            latexStart += '\n\\tableofcontents';
        }

        latexEnd = documentEndCommands + '\n\n\\end{document}';




        return {
            latexStart: latexStart,
            latexEnd: latexEnd
        };
    };

    exporter.htmlToLatex = function (title, author, htmlCode, aBibDB,
        metadataSettings, metadata, isChapter, listedWorksList) {
        var latexStart = '',
            latexEnd = '',
            documentFeatures, cleanDiv = document.createElement('div'),
            bibExport, returnObject;
        if (!listedWorksList) {
            listedWorksList = [];
        }

        // Remove sections that are marked as deleted
        jQuery(htmlCode).find('.del').each(function () {
            this.outerHTML = '';
        });


        if (isChapter) {
            latexStart += '\\chapter{' + title + '}\n';
            //htmlCode.innerHTML =  '<div class="title">' + title + '</div>' + htmlCode.innerHTML;
            if (metadataSettings.subtitle && metadata.subtitle &&
                metadata.subtitle != '') {
                cleanDiv.innerHTML = metadata.subtitle;
                latexStart += '\\section{' + cleanDiv.innerText + '}\n';
            } else {}
        } else {
            documentFeatures = exporter.findLatexDocumentFeatures(
                htmlCode, title, author, metadataSettings.subtitle, metadata,
                'article');
            latexStart += documentFeatures.latexStart;
            latexEnd += documentFeatures.latexEnd;
        }


        if (metadataSettings.abstract && metadata.abstract && metadata.abstract !=
            '') {
            htmlCode.innerHTML = '<div class="abstract">' + metadata.abstract +
                '</div>' + htmlCode.innerHTML;
        }


        // Remove empty space characters
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /[\u180e\u200b\u205f]/g,
            '');

        // Replace nbsp spaces with normal ones
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

        // Remove line breaks
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /(\r\n|\n|\r)/gm,
            '');

        // Escape characters that are protected in some way.
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\/g, '\\\\');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/{/g, '\{');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/}/g, '\}');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\[/g, '\\\[');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\]/g, '\\\]');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\$/g, '\\\$');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\#/g, '\\\#');

        jQuery(htmlCode).find('i').each(function () {
            jQuery(this).replaceWith('\\emph{' + this.innerHTML +
                '}');
        });

        jQuery(htmlCode).find('b').each(function () {
            jQuery(this).replaceWith('\\textbf{' + this.innerHTML +
                '}');
        });

        jQuery(htmlCode).find('h1').each(function () {
            jQuery(this).replaceWith('\n\n\\section{' + this.innerText +
                '}\n');
        });
        jQuery(htmlCode).find('h2').each(function () {
            jQuery(this).replaceWith('\n\n\\subsection{' + this.innerText +
                '}\n');
        });
        jQuery(htmlCode).find('h3').each(function () {
            jQuery(this).replaceWith('\n\n\\subsubsection{' + this.innerText +
                '}\n');
        });
        jQuery(htmlCode).find('p').each(function () {
            jQuery(this).replaceWith('\n\n' + this.innerHTML + '\n');
        });
        jQuery(htmlCode).find('li').each(function () {
            jQuery(this).replaceWith('\n\\item ' + this.innerHTML +
                '\n');
        });
        jQuery(htmlCode).find('ul').each(function () {
            jQuery(this).replaceWith('\n\\begin{itemize}' + this.innerHTML +
                '\\end{itemize}\n');
        });
        jQuery(htmlCode).find('ol').each(function () {
            jQuery(this).replaceWith('\n\\begin{enumerated}' + this
                .innerHTML +
                '\\end{enumerated}\n');
        });
        jQuery(htmlCode).find('code').each(function () {
            jQuery(this).replaceWith('\n\\begin{code}\n\n' + this.innerHTML +
                '\n\n\\end{code}\n');
        });
        jQuery(htmlCode).find('div.abstract').each(function () {
            jQuery(this).replaceWith('\n\\begin{abstract}\n\n' +
                this.innerHTML +
                '\n\n\\end{abstract}\n');
        });

        // join code paragraphs that follow oneanother
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /\\end{code}\n\n\\begin{code}\n\n/g, '');
        jQuery(htmlCode).find('blockquote').each(function () {
            jQuery(this).replaceWith('\n\\begin{quote}\n\n' + this.innerHTML +
                '\n\n\\end{quote}\n');
        });
        // join quote paragraphs that follow oneanother
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /\\end{quote}\n\n\\begin{quote}\n\n/g, '');
        jQuery(htmlCode).find('a').each(function () {
            jQuery(this).replaceWith('\\href{' + this.href + '}{' +
                this.innerHTML +
                '}');
        });
        jQuery(htmlCode).find('.citation').each(function () {
            var citationEntries = jQuery(this).attr(
                'data-bib-entry').split(
                ','),
                citationBefore = jQuery(this).attr(
                    'data-bib-before'),
                citationPage = jQuery(this).attr('data-bib-page'),
                citationFormat = jQuery(this).attr(
                    'data-bib-format'),
                citationCommand = '\\' + citationFormat;

            if (citationBefore.length > 0) {
                citationCommand += '[' + citationBefore + ']';
                if (citationPage.length === 0) {
                    citationCommand += '[]';
                }
            }
            if (citationPage.length > 0) {
                citationCommand += '[' + citationPage + ']';
            }
            citationCommand += '{';

            for (var i = 0; i < citationEntries.length; i++) {
                citationCommand += aBibDB[citationEntries[i]].entry_key;

                if (i + 1 < citationEntries.length) {
                    citationCommand += ',';
                }
                if (listedWorksList.indexOf(citationEntries[i]) === -
                    1) {
                    listedWorksList.push(citationEntries[i]);
                }

            }
            citationCommand += '}';
            jQuery(this).replaceWith(citationCommand);

        });

        jQuery(htmlCode).find('figure').each(function () {
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

        jQuery(htmlCode).find('.equation,.figure-equation').each(
            function () {
                var equation = jQuery(this).attr('data-equation');
                // TODO: The string is for some reason escaped. The following line removes this.
                equation = equation.replace(/\\/g, "*BACKSLASH*").replace(
                    /\*BACKSLASH\*\*BACKSLASH\*/g, "\\").replace(
                    /\*BACKSLASH\*/g, "");
                this.outerHTML = '$' + equation + '$';
            });

        jQuery(htmlCode).find('.pagination-footnote').each(function () {
            jQuery(this).replaceWith('\\footnote{' + this.firstChild
                .firstChild
                .innerHTML + '}');
        });

        returnObject = {
            latex: latexStart + htmlCode.innerText + latexEnd,
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

    exporter.getTimestamp = function () {
        var today = new Date();
        var second = today.getUTCSeconds();
        var minute = today.getUTCMinutes();
        var hour = today.getUTCHours();
        var day = today.getUTCDate();
        var month = today.getUTCMonth() + 1; //January is 0!
        var year = today.getUTCFullYear();

        if (second < 10) {
            second = '0' + second;
        }
        if (minute < 10) {
            minute = '0' + minute;
        }
        if (hour < 10) {
            hour = '0' + hour;
        }
        if (day < 10) {
            day = '0' + day;
        }
        if (month < 10) {
            month = '0' + month;
        }

        returnValue = year + '-' + month + '-' + day + 'T' + hour + ':' +
            minute + ':' + second + 'Z';
        return returnValue;
    };

    exporter.setLinks = function (htmlCode, docNum) {
        var contentItems = [],
            title;
        jQuery(htmlCode).find('h1,h2,h3').each(function () {
            title = jQuery.trim(this.innerText);
            if (title !== '') {
                var contentItem = {};
                contentItem.title = title;
                contentItem.level = parseInt(this.tagName.substring(
                    1, 2));
                if (docNum) {
                    contentItem.docNum = docNum;
                }
                if (this.classList.contains('title')) {
                    contentItem.level = 0;
                }
                this.id = 'id' + contentItems.length;

                contentItem.id = this.id;
                contentItems.push(contentItem);
            }
        });
        return contentItems;
    };

    exporter.orderLinks = function (contentItems) {
        var i, j;
        for (i = 0; i < contentItems.length; i++) {
            contentItems[i].subItems = [];
            if (i > 0) {
                for (j = i - 1; j > -1; j--) {
                    if (contentItems[j].level < contentItems[i].level) {
                        contentItems[j].subItems.push(contentItems[i]);
                        contentItems[i].delete = true;
                        break;
                    }
                }
            }

        }

        for (i = contentItems.length; i > -1; i--) {
            if (contentItems[i] && contentItems[i].delete) {
                delete contentItems[i].delete;
                contentItems.splice(i, 1);
            }
        }
        return contentItems;
    };

    exporter.styleEpubFootnotes = function (htmlCode) {
        var footnotesCode = '';
        footnoteCounter = 0;
        jQuery(htmlCode).find('.footnote').each(function () {
            footnoteCounter++;
            footnotesCode += '<aside epub:type="footnote" id="n' +
                footnoteCounter + '"><p>' + footnoteCounter + ' ' +
                this.innerHTML + '</p></aside>';
            jQuery(this).replaceWith(
                '<sup><a epub:type="noteref" href="#n' +
                footnoteCounter + '">' + footnoteCounter +
                '</a></sup>'
            );
        });
        htmlCode.innerHTML += footnotesCode;

        return htmlCode;
    }

    exporter.htmlToXhtml = function (htmlString) {
        htmlString = htmlString.replace(/<br>/g, "<br />");
        htmlString = htmlString.replace(/(<img[^>]+)>/gm, "$1 />");
        htmlString = htmlString.replace(/<svg/g,
            "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' ");
        // stroke-thickness is output by mathjax, yet the epub3 validator doesn't like it. Filed ticket https://github.com/mathjax/MathJax/issues/461
        htmlString = htmlString.replace(/stroke-thickness/g,
            "stroke-width");
        return htmlString;
    };

    exporter.savecopy = function (aDocument) {
        if (aDocument.is_owner) {
            // If the current user of the document is also the owner, the copying is easy:
            // we simply reset the id to zero, change the title and save the document.
            aDocument = jQuery.extend(true, {}, aDocument);
            aDocument.id = 0;
            aDocument.title = gettext('Copy of ') + aDocument.title;
            if (window.hasOwnProperty('theDocument')) {
                theDocument = aDocument;
                jQuery('#header h1, #document-title').html(theDocument.title);
                editorHelpers.documentHasChanged();
                editorHelpers.saveDocument();
            } else {
                importer.createNewDocument(aDocument);
            }
        } else {
            // The current user is not the document owner. This means we need to export the current document,
            // then switch the ImageDB and BibDB to be those of the current user and import all the values.
            function importAsUser(aDocument, shrunkImageDB, shrunkBibDB,
                images) {
                // switch to user's own ImageDB and BibDB:
                if (window.hasOwnProperty('theDocument')) {
                    theDocument.owner = theUser;
                    delete ImageDB;
                    delete BibDB;
                }
                importer.getDBs(aDocument, shrunkBibDB, shrunkImageDB,
                    images);

            }
            if (window.hasOwnProperty('theDocument')) {
                exporter.native(aDocument, ImageDB, BibDB, importAsUser);
            } else {
                bibliographyHelpers.getABibDB(aDocument.owner, function (
                    aBibDB) {
                    usermediaHelpers.getAnImageDB(aDocument.owner,
                        function (anImageDB) {
                            exporter.native(aDocument, anImageDB,
                                aBibDB, importAsUser);
                        });
                });
            }
        }
    };

    exporter.downloadNative = function (aDocument) {
        if (window.hasOwnProperty('theDocument')) {
            exporter.native(aDocument, ImageDB, BibDB, exporter.nativeFile);
        } else {
            if (aDocument.is_owner) {
                if ('undefined' === typeof (BibDB)) {
                    bibliographyHelpers.getBibDB(function () {
                        if ('undefined' === typeof (ImageDB)) {
                            usermediaHelpers.getImageDB(function () {
                                exporter.native(aDocument,
                                    ImageDB,
                                    BibDB, exporter.nativeFile);
                            });
                        } else {
                            exporter.native(aDocument, ImageDB,
                                BibDB,
                                exporter.nativeFile);
                        }
                    });
                } else if ('undefined' === typeof (ImageDB)) {
                    usermediaHelpers.getImageDB(function () {
                        exporter.native(aDocument, ImageDB, BibDB,
                            exporter.nativeFile);
                    });
                } else {
                    exporter.native(aDocument, ImageDB, BibDB, exporter
                        .nativeFile);
                }
            } else {
                bibliographyHelpers.getABibDB(aDocument.owner, function (
                    aBibDB) {
                    usermediaHelpers.getAnImageDB(aDocument.owner,
                        function (anImageDB) {
                            exporter.native(aDocument, anImageDB,
                                aBibDB, exporter.nativeFile);
                        });
                });
            }
        }
    };

    exporter.native = function (aDocument, anImageDB, aBibDB, callback) {
        var contents, outputList, httpOutputList, images, shrunkImageDB,
            shrunkBibDB = {}, imageUrls = [],
            citeList = [],
            i;

        $.addAlert('info', gettext('File export has been initiated.'));

        contents = document.createElement('div');
        contents.innerHTML = aDocument.contents;

        images = exporter.findImages(contents);

        imageUrls = _.pluck(images, 'url');


        shrunkImageDB = _.filter(anImageDB, function (image) {
            return (imageUrls.indexOf(image.image.split('?').shift()) !== -
                1);
        });

        jQuery(contents).find('.citation').each(function () {
            citeList.push(jQuery(this).attr('data-bib-entry'))
        });

        citeList = _.uniq(citeList.join(',').split(','));

        if (citeList.length === 1 && citeList[0] === '') {
            citeList = [];
        }

        for (i in citeList) {
            shrunkBibDB[citeList[i]] = aBibDB[citeList[i]];
        }

        callback(aDocument, shrunkImageDB, shrunkBibDB, images);

    };

    exporter.nativeFile = function (aDocument, shrunkImageDB,
        shrunkBibDB,
        images) {

        httpOutputList = images;

        outputList = [{
            filename: 'document.json',
            contents: JSON.stringify(aDocument),
        }, {
            filename: 'images.json',
            contents: JSON.stringify(shrunkImageDB)
        }, {
            filename: 'bibliography.json',
            contents: JSON.stringify(shrunkBibDB)
        }, {
            filename: 'filetype-version',
            contents: FW_FILETYPE_VERSION
        }];

        exporter.zipFileCreator(outputList, httpOutputList, exporter.createSlug(
                aDocument.title) +
            '.fidus', 'application/fidus+zip');
    };

    exporter.downloadLatex = function (aDocument) {
        if (window.hasOwnProperty('theDocument') || (window.hasOwnProperty(
            'BibDB') && aDocument.is_owner)) {
            exporter.latex(aDocument, BibDB);
        } else if (aDocument.is_owner) {
            bibliographyHelpers.getBibDB(function () {
                exporter.latex(aDocument, BibDB);
            });
        } else {
            bibliographyHelpers.getABibDB(aDocument.owner, function (
                aBibDB) {
                exporter.latex(aDocument, aBibDB);
            });
        }
    };

    exporter.latex = function (aDocument, aBibDB) {
        var contents, latexCode, htmlCode, title, outputList,
            httpOutputList;

        title = document.createElement('div');
        title.innerHTML = aDocument.title;
        title = title.innerText;

        $.addAlert('info', title + ': ' + gettext(
            'Latex export has been initiated.'));

        contents = document.createElement('div');
        contents.innerHTML = aDocument.contents;

        httpOutputList = exporter.findImages(contents);

        latexCode = exporter.htmlToLatex(title, aDocument.owner_name, contents, aBibDB,
            aDocument.settings.metadata, aDocument.metadata);

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

        exporter.zipFileCreator(outputList, httpOutputList, exporter.createSlug(
                title) +
            '.latex.zip');
    };

    exporter.downloadEpub = function (aDocument) {
        if (window.hasOwnProperty('theDocument') || (window.hasOwnProperty(
            'BibDB') && aDocument.is_owner)) {
            exporter.epub(aDocument, BibDB);
        } else if (aDocument.is_owner) {
            bibliographyHelpers.getBibDB(function () {
                exporter.epub(aDocument, BibDB);
            });
        } else {
            bibliographyHelpers.getABibDB(aDocument.owner, function (
                aBibDB) {
                exporter.epub(aDocument, aBibDB);
            });
        }
    };

    exporter.epub = function (aDocument, aBibDB) {
        var title, contents, contentsBody, contentItems, images,
            bibliography,
            htmlCode, includeZips = [],
            xhtmlCode, containerCode, opfCode,
            styleSheets = [],
            outputList, httpOutputList = [],
            i, startHTML;

        title = document.createElement('div');
        title.innerHTML = aDocument.title;
        title = title.innerText;

        $.addAlert('info', title + ': ' + gettext(
            'Epub export has been initiated.'));


        contents = document.createElement('div');
        contents.innerHTML = aDocument.contents;

        bibliography = citationHelpers.formatCitations(contents,
            aDocument.settings.citationstyle,
            aBibDB);

        if (bibliography.length > 0) {
            contents.innerHTML += bibliography;
        }

        images = exporter.findImages(contents);

        startHTML = '<h1 class="title">' + title + '</h1>';

        if (aDocument.settings.metadata.subtitle && aDocument.metadata.subtitle &&
            aDocument.metadata.subtitle != '') {
            startHTML += '<h2 class="subtitle">' + aDocument.metadata.subtitle +
                '</h2>';
        }
        if (aDocument.settings.metadata.abstract && aDocument.metadata.abstract &&
            aDocument.metadata.abstract != '') {
            startHTML += '<div class="abstract">' + aDocument.metadata.abstract +
                '</div>';
        }

        contents.innerHTML = startHTML + contents.innerHTML;

        contents = exporter.cleanHTML(contents);

        contentsBody = document.createElement('body');

        contentsBody.innerHTML = contents.innerHTML;

        // Make links to all H1-3 and create a TOC list of them
        contentItems = exporter.orderLinks(exporter.setLinks(
            contentsBody));

        contentsBodyEpubPrepared = exporter.styleEpubFootnotes(
            contentsBody);

        htmlCode = tmp_epub_xhtml({
            part: false,
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title: title,
            metadata: aDocument.metadata,
            metadataSettings: aDocument.settings.metadata,
            styleSheets: styleSheets,
            body: contentsBodyEpubPrepared.innerHTML,
            mathjax: aDocument.settings.mathjax,
        });

        htmlCode = exporter.cleanHTMLString(htmlCode);

        // Turning to XHTML. This has to happen last, as this operation menas we will only have the xhtml available as a string

        xhtmlCode = exporter.htmlToXhtml(htmlCode);

        containerCode = tmp_epub_container({});

        timestamp = exporter.getTimestamp();

        opfCode = tmp_epub_opf({
            language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
            title: title,
            creator: aDocument.owner.name, // TODO: make this specifiable as meta data
            idType: 'fidus',
            id: aDocument.id,
            date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
            modified: timestamp,
            styleSheets: styleSheets,
            mathjax: aDocument.settings.mathjax,
            images: images
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

        outputList = [{
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
            filename: 'EPUB/document.xhtml',
            contents: xhtmlCode
        }];




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

        if (aDocument.settings.mathjax) {
            includeZips.push({
                'directory': 'EPUB',
                'url': mathjaxZipUrl,
            })
        }

        exporter.zipFileCreator(outputList, httpOutputList, exporter.createSlug(
                title) +
            '.epub', 'application/epub+zip', includeZips);
    };

    exporter.downloadHtml = function (aDocument) {
        if (window.hasOwnProperty('theDocument') || (window.hasOwnProperty(
            'BibDB') && aDocument.is_owner)) {
            exporter.html(aDocument, BibDB);
        } else if (aDocument.is_owner) {
            bibliographyHelpers.getBibDB(function () {
                exporter.html(aDocument, BibDB);
            });
        } else {
            bibliographyHelpers.getABibDB(aDocument.owner, function (
                aBibDB) {
                exporter.html(aDocument, aBibDB);
            });
        }
    };

    exporter.html = function (aDocument, aBibDB) {
        var title, contents, bibliography, htmlCode, outputList,
            httpOutputList,
            styleSheets = [],
            includeZips = [];


        title = document.createElement('div');
        title.innerHTML = aDocument.title;
        title = title.innerText;

        $.addAlert('info', title + ': ' + gettext(
            'HTML export has been initiated.'));

        contents = document.createElement('div');
        contents.innerHTML = aDocument.contents;

        bibliography = citationHelpers.formatCitations(contents,
            aDocument.settings.citationstyle,
            aBibDB);

        if (bibliography.length > 0) {
            contents.innerHTML += bibliography;
        }

        httpOutputList = exporter.findImages(contents);

        contents = exporter.cleanHTML(contents);

        contentsCode = exporter.cleanHTMLString(contents.innerHTML);

        htmlCode = tmp_html_export({
            part: false,
            title: title,
            metadata: aDocument.metadata,
            metadataSettings: aDocument.settings.metadata,
            styleSheets: styleSheets,
            contents: contentsCode,
            mathjax: aDocument.settings.mathjax,
        });

        outputList = [{
            filename: 'document.html',
            contents: htmlCode
        }];

        outputList = outputList.concat(styleSheets);

        if (aDocument.settings.mathjax) {
            includeZips.push({
                'directory': '',
                'url': mathjaxZipUrl,
            })
        }
        exporter.zipFileCreator(outputList, httpOutputList, exporter.createSlug(
                title) +
            '.html.zip', false, includeZips);
    };

    exports.exporter = exporter;

}).call(this);