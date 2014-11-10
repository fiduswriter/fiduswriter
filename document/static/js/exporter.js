/**
 * @file Handles export of Fidus Writer document files into downloadable formats.
 * @copyright This file is part of <a href="http://www.fiduswriter.org">Fidus Writer</a>.
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
/** The current Fidus Writer filetype version. The importer will not import from a different version and the exporter will include this number in all exports.
 */
var FW_FILETYPE_VERSION = "1.1";

(function() {
    var exports = this,
        /**
         * Functions to export the Fidus Writer document. TODO
         * @namespace exporter
         */
        exporter = {};

    /** Offers a file to the user as if it were downloaded.
     * @function downloadFile
     * @memberof exporter
     * @param {string} zipFileName The name of the file.
     * @param {blob} blob The contents of the file.
     */
    exporter.downloadFile = function(zipFilename, blob) {
        var blobURL = URL.createObjectURL(blob);
        var fakeDownloadLink = document.createElement('a');
        var clickEvent = document.createEvent("MouseEvent");
        clickEvent.initMouseEvent("click", true, true, window,
            0, 0, 0, 0, 0, false, false, false, false, 0, null);
        fakeDownloadLink.href = blobURL;
        fakeDownloadLink.setAttribute('download', zipFilename);
        fakeDownloadLink.dispatchEvent(clickEvent);
    };

    /** Uploads a Fidus Writer document to the server.
     * @function uploadFile
     * @memberof exporter
     * @param {string} zipFileName The name of the file.
     * @param {blob} blob The contents of the file.
     */
    exporter.uploadFile = function(zipFilename, blob) {


        var diaButtons = {};

        diaButtons[gettext("Save")] = function() {
            var data = new FormData();

            data.append('note', jQuery(this).find('.revision-note').val());
            data.append('file', blob, zipFilename);
            data.append('document_id', theDocument.id);

            jQuery.ajax({
                url: '/document/upload/',
                data: data,
                type: 'POST',
                cache: false,
                contentType: false,
                processData: false,
                success: function() {
                    jQuery.addAlert('success', gettext('Revision saved'));
                },
                error: function() {
                    jQuery.addAlert('error', gettext('Revision could not be saved.'));
                }
            });
            jQuery(this).dialog("close");

        };

        diaButtons[gettext("Cancel")] = function() {
            jQuery(this).dialog("close");
        };

        jQuery(tmp_revision_dialog()).dialog({
            autoOpen: true,
            height: 180,
            width: 300,
            modal: true,
            buttons: diaButtons,
            create: function() {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
            },
        });


    };

    /** Creates a zip file.
     * @function zipFileCreator
     * @memberof exporter
     * @param {list} textFiles A list of files in plain text format.
     * @param {list} httpFiles A list fo files that have to be downloaded from the internet before being included.
     * @param {string} zipFileName The name of the zip file to be created
     * @param {string} [mimeType=application/zip] The mimetype of the file that is to be created.
     * @param {list} includeZips A list of zip files to be merged into the output zip file.
     * @param {boolean} [upload=false] Whether to upload rather than downloading the Zip file once finished.
     */

    exporter.zipFileCreator = function(textFiles, httpFiles, zipFileName,
        mimeType,
        includeZips, upload) {
        var zipFs = new zip.fs.FS(),
            i, zipDir;

        if (mimeType) {
            zipFs.root.addText('mimetype', mimeType);
        } else {
            mimeType = 'application/zip';
        }


        var createZip = function() {
            for (i = 0; i < textFiles.length; i++) {

                zipFs.root.addText(textFiles[i].filename, textFiles[i].contents);

            }

            for (i = 0; i < httpFiles.length; i++) {

                zipFs.root.addHttpContent(httpFiles[i].filename, httpFiles[
                    i].url);

            }


            zip.createWriter(new zip.BlobWriter(mimeType), function(
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
                                function() {
                                    currentIndex += child.uncompressedSize ||
                                        0;
                                    process(zipWriter, child, function() {
                                        childIndex++;
                                        exportChild();
                                    }, onprogress, totalSize);
                                },
                                function(index) {
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




                process(writer, zipFs.root, function() {
                    writer.close(function(blob) {
                        if (upload) {
                            exporter.uploadFile(zipFileName, blob);
                        } else {
                            exporter.downloadFile(zipFileName, blob);
                        }
                    });
                });


            });
        };

        if (includeZips) {
            i = 0;
            var includeZipLoop = function() {
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
                        function() {
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

    exporter.createSlug = function(str) {
        str = str.replace(/[^a-zA-Z0-9\s]/g, "");
        str = str.toLowerCase();
        str = str.replace(/\s/g, '-');
        return str;
    };

    exporter.cleanHTML = function(htmlCode) {


        // Remove empty space characters
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /[\u200b\u205f]/g,
            '');

        // Replace nbsp spaces with normal ones
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

        jQuery(htmlCode).find('.del').each(function() {
            this.outerHTML = '';
        });

        jQuery(htmlCode).find('.citation,.ins').each(function() {
            this.outerHTML = this.innerHTML;
        });

        jQuery(htmlCode).find('script').each(function() {
            this.outerHTML = '';
        });

        jQuery(htmlCode).find('figcaption .figure-cat-figure').each(
            function(index) {
                this.innerHTML += ' ' + (index + 1) + ': ';
            });

        jQuery(htmlCode).find('figcaption .figure-cat-photo').each(function(
            index) {
            this.innerHTML += ' ' + (index + 1) + ': ';
        });

        jQuery(htmlCode).find('figcaption .figure-cat-table').each(function(
            index) {
            this.innerHTML += ' ' + (index + 1) + ': ';
        });
        return htmlCode;

    };

    exporter.replaceImgSrc = function(htmlString) {
        htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm,
            "<$1 src$2>");
        return htmlString;
    }

    exporter.findImages = function(htmlCode) {
        var imageLinks = jQuery(htmlCode).find('img'),
            images = [];

        imageLinks.each(function(index) {
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

            if (!_.findWhere(images, {
                    'filename': name
                })) {

                images.push({
                    'filename': name,
                    'url': src
                });
            }
        })

        return images;
    };

    exporter.findLatexDocumentFeatures = function(htmlCode, title, author,
        subtitle, keywords, specifiedAuthors,
        metadata, documentClass) {
        var includePackages, documentEndCommands = '',
            latexStart, latexEnd, tempNode;

        includePackages = '\\usepackage[utf8]{luainputenc}';

        if (subtitle && metadata.subtitle) {
            tempNode = exporter.obj2Node(metadata.subtitle);
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
            tempNode = exporter.obj2Node(metadata.keywords);
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
            tempNode = exporter.obj2Node(metadata.authors);
            if (tempNode.textContent.length > 0) {
                author = tempNode.textContent;
            }
        }

        latexStart += '\n\\author{' + author + '}\n';

        if (subtitle && metadata.subtitle) {
            tempNode = exporter.obj2Node(metadata.subtitle);
            if (tempNode.textContent.length > 0) {
                latexStart += '\\subtitle{' + tempNode.textContent + '}\n';
            }
        }

        latexStart += '\n\\maketitle\n\n';

        if (keywords && metadata.keywords) {
            tempNode = exporter.obj2Node(metadata.keywords);
            if (tempNode.textContent.length > 0) {
                latexStart += '\\begin{keywords}\n' + tempNode.textContent + '\\end{keywords}\n';
            }
        }


        if (documentClass === 'book') {
            if (metadata.publisher) {
                tempNode = exporter.obj2Node(metadata.publisher);
                if (tempNode.textContent.length > 0) {
                    latexStart += tempNode.textContent + '\n\n';
                }
            }

            if (metadata.copyright) {
                tempNode = exporter.obj2Node(metadata.copyright);
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

    exporter.htmlToLatex = function(title, author, htmlCode, aBibDB,
        metadataSettings, metadata, isChapter, listedWorksList) {
        var latexStart = '',
            latexEnd = '',
            documentFeatures,
            bibExport, returnObject;
        if (!listedWorksList) {
            listedWorksList = [];
        }

        // Remove sections that are marked as deleted
        jQuery(htmlCode).find('.del').each(function() {
            this.outerHTML = '';
        });


        if (isChapter) {
            latexStart += '\\chapter{' + title + '}\n';
            //htmlCode.innerHTML =  '<div class="title">' + title + '</div>' + htmlCode.innerHTML;
            if (metadataSettings.subtitle && metadata.subtitle) {
                tempNode = exporter.obj2Node(metadata.subtitle);
                if (tempNode.textContent.length > 0) {
                    latexStart += '\\section{' + tempNode.textContent + '}\n';
                }
            }
        } else {
            documentFeatures = exporter.findLatexDocumentFeatures(
                htmlCode, title, author, metadataSettings.subtitle, metadataSettings.keywords, metadataSettings.authors, metadata,
                'article');
            latexStart += documentFeatures.latexStart;
            latexEnd += documentFeatures.latexEnd;
        }


        if (metadataSettings.abstract && metadata.abstract) {
            tempNode = exporter.obj2Node(metadata.abstract);
            if (tempNode.textContent.length > 0) {

                htmlCode.innerHTML = '<div class="abstract">' + tempNode.innerHTML +
                    '</div>' + htmlCode.innerHTML;
            }
        }


        // Remove empty space characters
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /[\u200b\u205f]/g,
            '');

        // Replace nbsp spaces with normal ones
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

        // Remove line breaks
        htmlCode.innerHTML = htmlCode.innerHTML.replace(
            /(\r\n|\n|\r)/gm,
            '');

        // Escape characters that are protected in some way.
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\/g, '\\\\');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\{/g, '\{');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\}/g, '\}');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\$/g, '\\\$');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\#/g, '\\\#');
        htmlCode.innerHTML = htmlCode.innerHTML.replace(/\%/g, '\\\%');

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
            var citationEntries = jQuery(this).attr(
                    'data-bib-entry').split(
                    ','),
                citationBefore = jQuery(this).attr(
                    'data-bib-before').split(',,,'),
                citationPage = jQuery(this).attr('data-bib-page').split(',,,'),
                citationFormat = jQuery(this).attr(
                    'data-bib-format'),
                citationCommand = '\\' + citationFormat,
                i;

            if (citationEntries.length > 1 && citationBefore.join('').length === 0 && citationPage.join('').length === 0) {
                // multi source citation without page numbers or text before.
                citationCommand += '{';

                for (i = 0; i < citationEntries.length; i++) {
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
            } else {
                if (citationEntries.length > 1) {
                    citationCommand += 's'; // Switching from \autocite to \autocites
                }
                for (i = 0; i < citationEntries.length; i++) {

                    if (citationBefore[i].length > 0) {
                        citationCommand += '[' + citationBefore[i] + ']';
                        if (citationPage[i].length === 0) {
                            citationCommand += '[]';
                        }
                    }
                    if (citationPage[i].length > 0) {
                        citationCommand += '[' + citationPage[i] + ']';
                    }
                    citationCommand += '{';

                    citationCommand += aBibDB[citationEntries[i]].entry_key;

                    if (listedWorksList.indexOf(citationEntries[i]) === -
                        1) {
                        listedWorksList.push(citationEntries[i]);
                    }
                    citationCommand += '}';

                }
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

    exporter.getTimestamp = function() {
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

    exporter.setLinks = function(htmlCode, docNum) {
        var contentItems = [],
            title;
        jQuery(htmlCode).find('h1,h2,h3').each(function() {
            title = jQuery.trim(this.textContent);
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

    exporter.orderLinks = function(contentItems) {
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

    exporter.styleEpubFootnotes = function(htmlCode) {
        var footnotesCode = '';
        footnoteCounter = 0;
        jQuery(htmlCode).find('.footnote').each(function() {
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
    };

    /** Same functionality as objToNode/nodeToObj in diffDOM.js, but also offers output in XHTML format (obj2Node) and without form support. */
    exporter.obj2Node = function(obj, docType) {
        var parser;
        if (obj === undefined) {
            return false;
        }
        if (docType === 'xhtml') {
            parser = new DOMParser().parseFromString('<xml/>', "text/xml");
        } else {
            parser = document;
        }

        function inner(obj, insideSvg) {
            var node, i;
            if (obj.hasOwnProperty('t')) {
                node = parser.createTextNode(obj.t);
            } else if (obj.hasOwnProperty('co')) {
                node = parser.createComment(obj.co);
            } else {
                if (obj.nn === 'svg' || insideSvg) {
                    node = parser.createElementNS('http://www.w3.org/2000/svg', obj.nn);
                    insideSvg = true;
                } else {
                    node = parser.createElement(obj.nn);
                }
                if (obj.a) {
                    for (i = 0; i < obj.a.length; i++) {
                        node.setAttribute(obj.a[i][0], obj.a[i][1]);
                    }
                }
                if (obj.c) {
                    for (i = 0; i < obj.c.length; i++) {
                        node.appendChild(inner(obj.c[i], insideSvg));
                    }
                }
            }
            return node;
        }
        return inner(obj);
    };

    exporter.node2Obj = function(node) {
        var obj = {},
            i;

        if (node.nodeType === 3) {
            obj.t = node.data;
        } else if (node.nodeType === 8) {
            obj.co = node.data;
        } else {
            obj.nn = node.nodeName;
            if (node.attributes && node.attributes.length > 0) {
                obj.a = [];
                for (i = 0; i < node.attributes.length; i++) {
                    obj.a.push([node.attributes[i].name, node.attributes[i].value]);
                }
            }
            if (node.childNodes && node.childNodes.length > 0) {
                obj.c = [];
                for (i = 0; i < node.childNodes.length; i++) {
                    obj.c.push(exporter.node2Obj(node.childNodes[i]));
                }
            }
        }
        return obj;
    };




    exporter.savecopy = function(aDocument) {
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
                bibliographyHelpers.getABibDB(aDocument.owner, function(
                    aBibDB) {
                    usermediaHelpers.getAnImageDB(aDocument.owner,
                        function(anImageDB) {
                            exporter.native(aDocument, anImageDB,
                                aBibDB, importAsUser);
                        });
                });
            }
        }
    };

    /** Create a Fidus Writer document and upload it to the server as a backup.
     * @function uploadNative
     * @memberof exporter
     * @param aDocument The document to turn into a Fidus Writer document and upload.
     */
    exporter.uploadNative = function(aDocument) {
        exporter.native(aDocument, ImageDB, BibDB, function(aDocument, shrunkImageDB, shrunkBibDB, images) {
            exporter.nativeFile(aDocument, shrunkImageDB, shrunkBibDB, images, true);
        });
    };

    exporter.downloadNative = function(aDocument) {
        if (window.hasOwnProperty('theDocument')) {
            exporter.native(aDocument, ImageDB, BibDB, exporter.nativeFile);
        } else {
            if (aDocument.is_owner) {
                if ('undefined' === typeof(BibDB)) {
                    bibliographyHelpers.getBibDB(function() {
                        if ('undefined' === typeof(ImageDB)) {
                            usermediaHelpers.getImageDB(function() {
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
                } else if ('undefined' === typeof(ImageDB)) {
                    usermediaHelpers.getImageDB(function() {
                        exporter.native(aDocument, ImageDB, BibDB,
                            exporter.nativeFile);
                    });
                } else {
                    exporter.native(aDocument, ImageDB, BibDB, exporter
                        .nativeFile);
                }
            } else {
                bibliographyHelpers.getABibDB(aDocument.owner, function(
                    aBibDB) {
                    usermediaHelpers.getAnImageDB(aDocument.owner,
                        function(anImageDB) {
                            exporter.native(aDocument, anImageDB,
                                aBibDB, exporter.nativeFile);
                        });
                });
            }
        }
    };

    exporter.native = function(aDocument, anImageDB, aBibDB, callback) {
        var contents, outputList, httpOutputList, images, shrunkImageDB,
            shrunkBibDB = {},
            imageUrls = [],
            citeList = [],
            i;

        $.addAlert('info', gettext('File export has been initiated.'));

        contents = exporter.obj2Node(aDocument.contents);

        images = exporter.findImages(contents);

        imageUrls = _.pluck(images, 'url');


        shrunkImageDB = _.filter(anImageDB, function(image) {
            return (imageUrls.indexOf(image.image.split('?').shift()) !== -
                1);
        });

        jQuery(contents).find('.citation').each(function() {
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

    exporter.nativeFile = function(aDocument, shrunkImageDB,
        shrunkBibDB,
        images, upload) {

        if ('undefined' === typeof upload) {
            upload = false;
        }

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
            '.fidus', 'application/fidus+zip', false, upload);
    };

    exporter.downloadLatex = function(aDocument) {
        if (window.hasOwnProperty('theDocument') || (window.hasOwnProperty(
                'BibDB') && aDocument.is_owner)) {
            exporter.latex(aDocument, BibDB);
        } else if (aDocument.is_owner) {
            bibliographyHelpers.getBibDB(function() {
                exporter.latex(aDocument, BibDB);
            });
        } else {
            bibliographyHelpers.getABibDB(aDocument.owner, function(
                aBibDB) {
                exporter.latex(aDocument, aBibDB);
            });
        }
    };

    exporter.latex = function(aDocument, aBibDB) {
        var contents, latexCode, htmlCode, title, outputList,
            httpOutputList, tempNode;

        title = aDocument.title;

        $.addAlert('info', title + ': ' + gettext(
            'Latex export has been initiated.'));

        contents = document.createElement('div');

        tempNode = exporter.obj2Node(aDocument.contents);

        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild);
        }

        httpOutputList = exporter.findImages(contents);

        latexCode = exporter.htmlToLatex(title, aDocument.owner.name, contents, aBibDB,
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

    exporter.downloadEpub = function(aDocument) {
        if (window.hasOwnProperty('theDocument') || (window.hasOwnProperty(
                'BibDB') && aDocument.is_owner)) {
            exporter.epub(aDocument, BibDB);
        } else if (aDocument.is_owner) {
            bibliographyHelpers.getBibDB(function() {
                exporter.epub(aDocument, BibDB);
            });
        } else {
            bibliographyHelpers.getABibDB(aDocument.owner, function(
                aBibDB) {
                exporter.epub(aDocument, aBibDB);
            });
        }
    };


    // Mathjax automatically adds soem elements to the current document after making SVGs. We need these elements.
    exporter.getMathjaxHeader = function() {
        var mathjax = document.getElementById('MathJax_SVG_Hidden');
        if (mathjax === undefined || mathjax === null) {
            return false;
        } else {
            return mathjax.parentElement;
        }
    };

    exporter.epub = function(aDocument, aBibDB) {
        var title, contents, contentsBody, images,
            bibliography, equations, figureEquations,
            styleSheets = [], //TODO: fill style sheets with somethign meaningful.
            tempNode, mathjax,
            i, startHTML;

        title = aDocument.title;

        $.addAlert('info', title + ': ' + gettext(
            'Epub export has been initiated.'));


        contents = document.createElement('div');

        tempNode = exporter.obj2Node(aDocument.contents);

        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild);
        }

        bibliography = citationHelpers.formatCitations(contents,
            aDocument.settings.citationstyle,
            aBibDB);

        if (bibliography.length > 0) {
            contents.innerHTML += bibliography;
        }

        images = exporter.findImages(contents);

        startHTML = '<h1 class="title">' + title + '</h1>';

        if (aDocument.settings.metadata.subtitle && aDocument.metadata.subtitle) {
            tempNode = exporter.obj2Node(aDocument.metadata.subtitle);

            if (tempNode.textContent.length > 0) {
                startHTML += '<h2 class="subtitle">' + tempNode.textContent +
                    '</h2>';
            }
        }
        if (aDocument.settings.metadata.abstract && aDocument.metadata.abstract) {
            tempNode = exporter.obj2Node(aDocument.metadata.abstract);
            if (tempNode.textContent.length > 0) {
                startHTML += '<div class="abstract">' + tempNode.textContent +
                    '</div>';
            }
        }

        contents.innerHTML = startHTML + contents.innerHTML;

        contents = exporter.cleanHTML(contents);

        contentsBody = document.createElement('body');

        while (contents.firstChild) {
            contentsBody.appendChild(contents.firstChild);
        }

        equations = contentsBody.querySelectorAll('.equation');

        figureEquations = contentsBody.querySelectorAll('.figure-equation');

        if (equations.length > 0 || figureEquations.length > 0) {
            mathjax = true;
        }

        for (i = 0; i < equations.length; i++) {
            mathHelpers.layoutMathNode(equations[i]);
        }
        for (i = 0; i < figureEquations.length; i++) {
            mathHelpers.layoutDisplayMathNode(figureEquations[i]);
        }
        mathHelpers.queueExecution(function() {
            setTimeout(function() {
                exporter.epub2(aDocument, contentsBody, images, title, styleSheets, mathjax);
            }, 2000);
        });
    };

    exporter.epub2 = function(aDocument, contentsBody, images, title, styleSheets, mathjax) {
        var contentsBodyEpubPrepared, xhtmlCode, containerCode, timestamp, keywords, contentItems, authors, tempNode, outputList, includeZips = [],
            opfCode, ncxCode, navCode, httpOutputList = [],
            i;

        if (mathjax) {
            mathjax = exporter.getMathjaxHeader();

            if (mathjax) {
                mathjax = exporter.obj2Node(exporter.node2Obj(mathjax), 'xhtml').outerHTML;
            }
        }

        // Make links to all H1-3 and create a TOC list of them
        contentItems = exporter.orderLinks(exporter.setLinks(
            contentsBody));

        contentsBodyEpubPrepared = exporter.styleEpubFootnotes(
            contentsBody);

        xhtmlCode = tmp_epub_xhtml({
            part: false,
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title: title,
            styleSheets: styleSheets,
            body: exporter.obj2Node(exporter.node2Obj(contentsBodyEpubPrepared), 'xhtml').innerHTML,
            mathjax: mathjax,
        });

        xhtmlCode = exporter.replaceImgSrc(xhtmlCode);

        containerCode = tmp_epub_container({});

        timestamp = exporter.getTimestamp();

        authors = [aDocument.owner.name];

        if (aDocument.settings.metadata.authors && aDocument.metadata.authors) {
            tempNode = exporter.obj2Node(aDocument.metadata.authors);
            if (tempNode.textContent.length > 0) {
                authors = jQuery.map(tempNode.textContent.split(","), jQuery.trim);
            }
        }

        keywords = [];

        if (aDocument.settings.metadata.keywords && aDocument.metadata.keywords) {
            tempNode = exporter.obj2Node(aDocument.metadata.keywords);
            if (tempNode.textContent.length > 0) {
                keywords = jQuery.map(tempNode.textContent.split(","), jQuery.trim);
            }
        }


        opfCode = tmp_epub_opf({
            language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
            title: title,
            authors: authors,
            keywords: keywords,
            idType: 'fidus',
            id: aDocument.id,
            date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
            modified: timestamp,
            styleSheets: styleSheets,
            mathjax: mathjax,
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

        if (mathjax) {
            includeZips.push({
                'directory': 'EPUB',
                'url': mathjaxZipUrl,
            })
        }

        exporter.zipFileCreator(outputList, httpOutputList, exporter.createSlug(
                title) +
            '.epub', 'application/epub+zip', includeZips);
    };

    exporter.downloadHtml = function(aDocument) {
        if (window.hasOwnProperty('theDocument') || (window.hasOwnProperty(
                'BibDB') && aDocument.is_owner)) {
            exporter.html(aDocument, BibDB);
        } else if (aDocument.is_owner) {
            bibliographyHelpers.getBibDB(function() {
                exporter.html(aDocument, BibDB);
            });
        } else {
            bibliographyHelpers.getABibDB(aDocument.owner, function(
                aBibDB) {
                exporter.html(aDocument, aBibDB);
            });
        }
    };

    exporter.html = function(aDocument, aBibDB) {
        var title, contents, tempNode,
            styleSheets = [],
            equations, figureEquations, mathjax = false;

        title = aDocument.title;

        $.addAlert('info', title + ': ' + gettext(
            'HTML export has been initiated.'));

        contents = document.createElement('div');

        tempNode = exporter.obj2Node(aDocument.contents);

        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild);
        }

        equations = contents.querySelectorAll('.equation');

        figureEquations = contents.querySelectorAll('.figure-equation');

        if (equations.length > 0 || figureEquations.length > 0) {
            mathjax = true;
        }

        for (i = 0; i < equations.length; i++) {
            mathHelpers.layoutMathNode(equations[i]);
        }
        for (i = 0; i < figureEquations.length; i++) {
            mathHelpers.layoutDisplayMathNode(figureEquations[i]);
        }

        mathHelpers.queueExecution(function() {
            exporter.html2(aDocument, aBibDB, styleSheets, title, contents, mathjax);
        });
    };

    exporter.html2 = function(aDocument, aBibDB, styleSheets, title, contents, mathjax) {
        var bibliography, htmlCode, outputList,
            httpOutputList,
            includeZips = [];

        if (mathjax) {
            mathjax = exporter.getMathjaxHeader()

            if (mathjax) {
                mathjax = mathjax.outerHTML;
            }
        }

        bibliography = citationHelpers.formatCitations(contents,
            aDocument.settings.citationstyle,
            aBibDB);

        if (bibliography.length > 0) {
            contents.innerHTML += bibliography;
        }

        httpOutputList = exporter.findImages(contents);

        contents = exporter.cleanHTML(contents);

        contentsCode = exporter.replaceImgSrc(contents.innerHTML);

        htmlCode = tmp_html_export({
            part: false,
            title: title,
            metadata: aDocument.metadata,
            metadataSettings: aDocument.settings.metadata,
            styleSheets: styleSheets,
            contents: contentsCode,
            mathjax: mathjax,
        });

        outputList = [{
            filename: 'document.html',
            contents: htmlCode
        }];

        outputList = outputList.concat(styleSheets);

        if (mathjax) {
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
