/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit exporter.es6.js and run ./es6-compiler.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.savecopy = undefined;

var _native = require('./native');

var savecopy = exports.savecopy = function savecopy(aDocument) {
    function importAsUser(aDocument, shrunkImageDB, shrunkBibDB, images) {
        // switch to user's own ImageDB and BibDB:
        if (window.hasOwnProperty('theEditor')) {
            theEditor.doc.owner = theEditor.user;
            delete window.ImageDB;
            delete window.BibDB;
        }
        importer.getDBs(aDocument, shrunkBibDB, shrunkImageDB, images);
    }
    if (window.hasOwnProperty('theEditor')) {
        (0, _native.exportNative)(aDocument, ImageDB, BibDB, importAsUser);
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            usermediaHelpers.getAnImageDB(aDocument.owner, function (anImageDB) {
                (0, _native.exportNative)(aDocument, anImageDB, aBibDB, importAsUser);
            });
        });
    }
};

},{"./native":7}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** Offers a file to the user as if it were downloaded.
 * @function downloadFile
 * @param {string} zipFileName The name of the file.
 * @param {blob} blob The contents of the file.
 */
var downloadFile = exports.downloadFile = function downloadFile(zipFilename, blob) {
    var blobURL = URL.createObjectURL(blob);
    var fakeDownloadLink = document.createElement('a');
    var clickEvent = document.createEvent("MouseEvent");
    clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    fakeDownloadLink.href = blobURL;
    fakeDownloadLink.setAttribute('download', zipFilename);
    fakeDownloadLink.dispatchEvent(clickEvent);
};

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.orderLinks = exports.setLinks = exports.downloadEpub = exports.getTimestamp = exports.styleEpubFootnotes = undefined;

var _html = require("./html");

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

var styleEpubFootnotes = exports.styleEpubFootnotes = function styleEpubFootnotes(htmlCode) {
    var footnotesCode = '',
        footnoteCounter = 0;
    jQuery(htmlCode).find('.footnote').each(function () {
        footnoteCounter++;
        footnotesCode += '<aside epub:type="footnote" id="n' + footnoteCounter + '"><p>' + footnoteCounter + ' ' + this.innerHTML + '</p></aside>';
        jQuery(this).replaceWith('<sup><a epub:type="noteref" href="#n' + footnoteCounter + '">' + footnoteCounter + '</a></sup>');
    });
    htmlCode.innerHTML += footnotesCode;

    return htmlCode;
};

var getTimestamp = exports.getTimestamp = function getTimestamp() {
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

    return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second + 'Z';
};

var downloadEpub = exports.downloadEpub = function downloadEpub(aDocument) {
    if (window.hasOwnProperty('theEditor') || window.hasOwnProperty('BibDB') && aDocument.is_owner) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function () {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

var export1 = function export1(aDocument, aBibDB) {
    var title,
        contents,
        contentsBody,
        images,
        bibliography,
        equations,
        figureEquations,
        styleSheets = [],

    //TODO: fill style sheets with somethign meaningful.
    tempNode,
        mathjax,
        startHTML;

    title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext('Epub export has been initiated.'));

    contents = document.createElement('div');

    tempNode = (0, _json.obj2Node)(aDocument.contents);

    while (tempNode.firstChild) {
        contents.appendChild(tempNode.firstChild);
    }

    bibliography = citationHelpers.formatCitations(contents, aDocument.settings.citationstyle, aBibDB);

    if (bibliography.length > 0) {
        contents.innerHTML += bibliography;
    }

    images = (0, _tools.findImages)(contents);

    startHTML = '<h1 class="title">' + title + '</h1>';

    if (aDocument.settings['metadata-subtitle'] && aDocument.metadata.subtitle) {
        tempNode = (0, _json.obj2Node)(aDocument.metadata.subtitle);

        if (tempNode.textContent.length > 0) {
            startHTML += '<h2 class="subtitle">' + tempNode.textContent + '</h2>';
        }
    }
    if (aDocument.settings['metadata-abstract'] && aDocument.metadata.abstract) {
        tempNode = (0, _json.obj2Node)(aDocument.metadata.abstract);
        if (tempNode.textContent.length > 0) {
            startHTML += '<div class="abstract">' + tempNode.textContent + '</div>';
        }
    }

    contents.innerHTML = startHTML + contents.innerHTML;

    contents = (0, _html.cleanHTML)(contents);

    contentsBody = document.createElement('body');

    while (contents.firstChild) {
        contentsBody.appendChild(contents.firstChild);
    }

    equations = contentsBody.querySelectorAll('.equation');

    figureEquations = contentsBody.querySelectorAll('.figure-equation');

    if (equations.length > 0 || figureEquations.length > 0) {
        mathjax = true;
    }

    for (var i = 0; i < equations.length; i++) {
        mathHelpers.layoutMathNode(equations[i]);
    }
    for (var i = 0; i < figureEquations.length; i++) {
        mathHelpers.layoutDisplayMathNode(figureEquations[i]);
    }
    mathHelpers.queueExecution(function () {
        setTimeout(function () {
            export2(aDocument, contentsBody, images, title, styleSheets, mathjax);
        }, 2000);
    });
};

var export2 = function export2(aDocument, contentsBody, images, title, styleSheets, mathjax) {
    var contentsBodyEpubPrepared = undefined,
        xhtmlCode = undefined,
        containerCode = undefined,
        timestamp = undefined,
        keywords = undefined,
        contentItems = undefined,
        authors = undefined,
        tempNode = undefined,
        outputList = undefined,
        includeZips = [],
        opfCode = undefined,
        ncxCode = undefined,
        navCode = undefined,
        httpOutputList = [];

    if (mathjax) {
        mathjax = (0, _html.getMathjaxHeader)();

        if (mathjax) {
            mathjax = (0, _json.obj2Node)((0, _json.node2Obj)(mathjax), 'xhtml').outerHTML;
        }
    }

    // Make links to all H1-3 and create a TOC list of them
    contentItems = orderLinks(setLinks(contentsBody));

    contentsBodyEpubPrepared = styleEpubFootnotes(contentsBody);

    xhtmlCode = tmp_epub_xhtml({
        part: false,
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        styleSheets: styleSheets,
        body: (0, _json.obj2Node)((0, _json.node2Obj)(contentsBodyEpubPrepared), 'xhtml').innerHTML,
        mathjax: mathjax
    });

    xhtmlCode = (0, _html.replaceImgSrc)(xhtmlCode);

    containerCode = tmp_epub_container({});

    timestamp = getTimestamp();

    authors = [aDocument.owner.name];

    if (aDocument.settings['metadata-authors'] && aDocument.metadata.authors) {
        tempNode = (0, _json.obj2Node)(aDocument.metadata.authors);
        if (tempNode.textContent.length > 0) {
            authors = jQuery.map(tempNode.textContent.split(","), jQuery.trim);
        }
    }

    keywords = [];

    if (aDocument.settings['metadata-keywords'] && aDocument.metadata.keywords) {
        tempNode = (0, _json.obj2Node)(aDocument.metadata.keywords);
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

    for (var i = 0; i < styleSheets.length; i++) {
        outputList.push({
            filename: 'EPUB/' + styleSheets[i].filename,
            contents: styleSheets[i].contents
        });
    }

    for (var i = 0; i < images.length; i++) {
        httpOutputList.push({
            filename: 'EPUB/' + images[i].filename,
            url: images[i].url
        });
    }

    if (mathjax) {
        includeZips.push({
            'directory': 'EPUB',
            'url': mathjaxZipUrl
        });
    }

    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(title) + '.epub', 'application/epub+zip', includeZips);
};

var setLinks = exports.setLinks = function setLinks(htmlCode, docNum) {
    var contentItems = [],
        title = undefined;

    jQuery(htmlCode).find('h1,h2,h3').each(function () {
        title = jQuery.trim(this.textContent);
        if (title !== '') {
            var contentItem = {};
            contentItem.title = title;
            contentItem.level = parseInt(this.tagName.substring(1, 2));
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

var orderLinks = exports.orderLinks = function orderLinks(contentItems) {
    for (var i = 0; i < contentItems.length; i++) {
        contentItems[i].subItems = [];
        if (i > 0) {
            for (var j = i - 1; j > -1; j--) {
                if (contentItems[j].level < contentItems[i].level) {
                    contentItems[j].subItems.push(contentItems[i]);
                    contentItems[i].delete = true;
                    break;
                }
            }
        }
    }

    for (var i = contentItems.length; i > -1; i--) {
        if (contentItems[i] && contentItems[i].delete) {
            delete contentItems[i].delete;
            contentItems.splice(i, 1);
        }
    }
    return contentItems;
};

},{"./html":4,"./json":5,"./tools":8,"./zip":10}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getMathjaxHeader = exports.replaceImgSrc = exports.cleanHTML = exports.downloadHtml = undefined;

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

var downloadHtml = exports.downloadHtml = function downloadHtml(aDocument) {
    if (window.hasOwnProperty('theEditor') || window.hasOwnProperty('BibDB') && aDocument.is_owner) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function () {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

var export1 = function export1(aDocument, aBibDB) {
    var styleSheets = [],
        mathjax = false;

    var title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext('HTML export has been initiated.'));

    var contents = document.createElement('div');

    var tempNode = (0, _json.obj2Node)(aDocument.contents);

    while (tempNode.firstChild) {
        contents.appendChild(tempNode.firstChild);
    }

    var equations = contents.querySelectorAll('.equation');

    var figureEquations = contents.querySelectorAll('.figure-equation');

    if (equations.length > 0 || figureEquations.length > 0) {
        mathjax = true;
    }

    for (var i = 0; i < equations.length; i++) {
        mathHelpers.layoutMathNode(equations[i]);
    }
    for (var i = 0; i < figureEquations.length; i++) {
        mathHelpers.layoutDisplayMathNode(figureEquations[i]);
    }

    mathHelpers.queueExecution(function () {
        export2(aDocument, aBibDB, styleSheets, title, contents, mathjax);
    });
};

var export2 = function export2(aDocument, aBibDB, styleSheets, title, contents, mathjax) {

    var includeZips = [];

    if (mathjax) {
        mathjax = getMathjaxHeader();

        if (mathjax) {
            mathjax = mathjax.outerHTML;
        }
    }

    var bibliography = citationHelpers.formatCitations(contents, aDocument.settings.citationstyle, aBibDB);

    if (bibliography.length > 0) {
        contents.innerHTML += bibliography;
    }

    var httpOutputList = (0, _tools.findImages)(contents);

    contents = cleanHTML(contents);

    var contentsCode = replaceImgSrc(contents.innerHTML);

    var htmlCode = tmp_html_export({
        part: false,
        title: title,
        metadata: aDocument.metadata,
        settings: aDocument.settings,
        styleSheets: styleSheets,
        contents: contentsCode,
        mathjax: mathjax
    });

    var outputList = [{
        filename: 'document.html',
        contents: htmlCode
    }];

    outputList = outputList.concat(styleSheets);

    if (mathjax) {
        includeZips.push({
            'directory': '',
            'url': mathjaxZipUrl
        });
    }
    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(title) + '.html.zip', false, includeZips);
};

var cleanHTML = exports.cleanHTML = function cleanHTML(htmlCode) {
    // Replace nbsp spaces with normal ones
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

    jQuery(htmlCode).find('.del').each(function () {
        this.outerHTML = '';
    });

    jQuery(htmlCode).find('.citation,.ins').each(function () {
        this.outerHTML = this.innerHTML;
    });

    jQuery(htmlCode).find('script').each(function () {
        this.outerHTML = '';
    });

    jQuery(htmlCode).find('figcaption .figure-cat-figure').each(function (index) {
        this.innerHTML += ' ' + (index + 1) + ': ';
    });

    jQuery(htmlCode).find('figcaption .figure-cat-photo').each(function (index) {
        this.innerHTML += ' ' + (index + 1) + ': ';
    });

    jQuery(htmlCode).find('figcaption .figure-cat-table').each(function (index) {
        this.innerHTML += ' ' + (index + 1) + ': ';
    });
    return htmlCode;
};

var replaceImgSrc = exports.replaceImgSrc = function replaceImgSrc(htmlString) {
    htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm, "<$1 src$2>");
    return htmlString;
};

// Mathjax automatically adds some elements to the current document after making SVGs. We need these elements.
var getMathjaxHeader = exports.getMathjaxHeader = function getMathjaxHeader() {
    var mathjax = document.getElementById('MathJax_SVG_Hidden');
    if (mathjax === undefined || mathjax === null) {
        return false;
    } else {
        return mathjax.parentElement;
    }
};

},{"./json":5,"./tools":8,"./zip":10}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** Same functionality as objToNode/nodeToObj in diffDOM.js, but also offers output in XHTML format (obj2Node) and without form support. */
var obj2Node = exports.obj2Node = function obj2Node(obj, docType) {
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
            } else if (obj.nn === 'script') {
                // Do not allow scripts
                return parser.createTextNode('');
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

var node2Obj = exports.node2Obj = function node2Obj(node) {
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
                if (node.childNodes[i]) {
                    obj.c.push(exporter.node2Obj(node.childNodes[i]));
                }
            }
        }
    }
    return obj;
};

},{}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.downloadLatex = exports.htmlToLatex = exports.findLatexDocumentFeatures = undefined;

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

var findLatexDocumentFeatures = exports.findLatexDocumentFeatures = function findLatexDocumentFeatures(htmlCode, title, author, subtitle, keywords, specifiedAuthors, metadata, documentClass) {
    var includePackages,
        documentEndCommands = '',
        latexStart,
        latexEnd,
        tempNode;

    includePackages = "\\usepackage[utf8]{luainputenc}";

    if (subtitle && metadata.subtitle) {
        tempNode = (0, _json.obj2Node)(metadata.subtitle);
        if (tempNode.textContent.length > 0) {
            includePackages += "\n\\usepackage{titling}                \n\\newcommand{\\subtitle}[1]{%                \n\t\\posttitle{%                \n\t\t\\par\\end{center}                \n\t\t\\begin{center}\\large#1\\end{center}                \n\t\t\\vskip 0.5em}%                \n}";
        }
    }

    if (keywords && metadata.keywords) {
        tempNode = (0, _json.obj2Node)(metadata.keywords);
        if (tempNode.textContent.length > 0) {
            includePackages += '\n\\def\\keywords{\\vspace{.5em}\
                \n{\\textit{Keywords}:\\,\\relax%\
                \n}}\
                \n\\def\\endkeywords{\\par}';
        }
    }

    if (jQuery(htmlCode).find('a').length > 0) {
        includePackages += "\n\\usepackage{hyperref}";
    }
    if (jQuery(htmlCode).find('.citation').length > 0) {
        includePackages += "\n\\usepackage[backend=biber,hyperref=false,citestyle=authoryear,bibstyle=authoryear]{biblatex}\n\\bibliography{bibliography}";
        documentEndCommands += '\n\n\\printbibliography';
    }

    if (jQuery(htmlCode).find('figure').length > 0) {
        if (htmlCode.innerHTML.search('.svg">') !== -1) {
            includePackages += "\n\\usepackage{svg}";
        }
        if (htmlCode.innerHTML.search('.png">') !== -1 || htmlCode.innerHTML.search('.jpg">') !== -1 || htmlCode.innerHTML.search('.jpeg">') !== -1) {
            includePackages += "\n\\usepackage{graphicx}";
            // The following scales graphics down to text width, but not scaling them up if they are smaller
            includePackages += "\n\\usepackage{calc}\n\\newlength{\\imgwidth}\n\\newcommand\\scaledgraphics[1]{%\n\\settowidth{\\imgwidth}{\\includegraphics{#1}}%\n\\setlength{\\imgwidth}{\\minof{\\imgwidth}{\\textwidth}}%\n\\includegraphics[width=\\imgwidth,height=\\textheight,keepaspectratio]{#1}%\n}";
        }
    }
    if (documentClass === 'book') {
        //TODO: abstract environment should possibly only be included if used
        includePackages += '\n\\newenvironment{abstract}{\\rightskip1in\\itshape}{}';
    }

    latexStart = '\\documentclass{' + documentClass + '}\n' + includePackages + '\n\\begin{document}\n\n\\title{' + title + '}';

    if (specifiedAuthors && metadata.authors) {
        tempNode = (0, _json.obj2Node)(metadata.authors);
        if (tempNode.textContent.length > 0) {
            author = tempNode.textContent;
        }
    }

    latexStart += '\n\\author{' + author + '}\n';

    if (subtitle && metadata.subtitle) {
        tempNode = (0, _json.obj2Node)(metadata.subtitle);
        if (tempNode.textContent.length > 0) {
            latexStart += '\\subtitle{' + tempNode.textContent + '}\n';
        }
    }

    latexStart += '\n\\maketitle\n\n';

    if (keywords && metadata.keywords) {
        tempNode = (0, _json.obj2Node)(metadata.keywords);
        if (tempNode.textContent.length > 0) {
            latexStart += '\\begin{keywords}\n' + tempNode.textContent + '\\end{keywords}\n';
        }
    }

    if (documentClass === 'book') {
        if (metadata.publisher) {
            tempNode = (0, _json.obj2Node)(metadata.publisher);
            if (tempNode.textContent.length > 0) {
                latexStart += tempNode.textContent + '\n\n';
            }
        }

        if (metadata.copyright) {
            tempNode = (0, _json.obj2Node)(metadata.copyright);
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

var htmlToLatex = exports.htmlToLatex = function htmlToLatex(title, author, htmlCode, aBibDB, settings, metadata, isChapter, listedWorksList) {
    var latexStart = '',
        latexEnd = '',
        documentFeatures,
        bibExport,
        returnObject;
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
            tempNode = (0, _json.obj2Node)(metadata.subtitle);
            if (tempNode.textContent.length > 0) {
                latexStart += '\\section{' + tempNode.textContent + '}\n';
            }
        }
    } else {
        documentFeatures = exporter.findLatexDocumentFeatures(htmlCode, title, author, settings['metadata-subtitle'], settings['metadata-keywords'], settings['metadata-authors'], metadata, 'article');
        latexStart += documentFeatures.latexStart;
        latexEnd += documentFeatures.latexEnd;
    }

    if (settings['metadata-abstract'] && metadata.abstract) {
        tempNode = (0, _json.obj2Node)(metadata.abstract);
        if (tempNode.textContent.length > 0) {

            htmlCode.innerHTML = '<div class="abstract">' + tempNode.innerHTML + '</div>' + htmlCode.innerHTML;
        }
    }
    console.log(['2', htmlCode.outerHTML]);

    var footnotes = htmlCode.querySelectorAll('.footnote');

    jQuery(htmlCode).find('.footnote').each(function () {
        console.log(['footnote', this, this.outerHTML]);
        jQuery(this).replaceWith('\\footnote{' + this.innerHTML + '}');
    });
    // Replace nbsp spaces with normal ones
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

    // Remove line breaks
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/(\r\n|\n|\r)/gm, '');

    console.log(['3', htmlCode.outerHTML]);
    // Escape characters that are protected in some way.
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\/g, '\\\\');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\{/g, '\{');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\}/g, '\}');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\$/g, '\\\$');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\#/g, '\\\#');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\%/g, '\\\%');

    console.log(htmlCode.outerHTML);

    jQuery(htmlCode).find('i').each(function () {
        jQuery(this).replaceWith('\\emph{' + this.innerHTML + '}');
    });

    jQuery(htmlCode).find('b').each(function () {
        jQuery(this).replaceWith('\\textbf{' + this.innerHTML + '}');
    });

    jQuery(htmlCode).find('h1').each(function () {
        jQuery(this).replaceWith('\n\n\\section{' + this.textContent + '}\n');
    });
    jQuery(htmlCode).find('h2').each(function () {
        jQuery(this).replaceWith('\n\n\\subsection{' + this.textContent + '}\n');
    });
    jQuery(htmlCode).find('h3').each(function () {
        jQuery(this).replaceWith('\n\n\\subsubsection{' + this.textContent + '}\n');
    });
    jQuery(htmlCode).find('p').each(function () {
        jQuery(this).replaceWith('\n\n' + this.innerHTML + '\n');
    });
    jQuery(htmlCode).find('li').each(function () {
        jQuery(this).replaceWith('\n\\item ' + this.innerHTML + '\n');
    });
    jQuery(htmlCode).find('ul').each(function () {
        jQuery(this).replaceWith('\n\\begin{itemize}' + this.innerHTML + '\\end{itemize}\n');
    });
    jQuery(htmlCode).find('ol').each(function () {
        jQuery(this).replaceWith('\n\\begin{enumerated}' + this.innerHTML + '\\end{enumerated}\n');
    });
    jQuery(htmlCode).find('code').each(function () {
        jQuery(this).replaceWith('\n\\begin{code}\n\n' + this.innerHTML + '\n\n\\end{code}\n');
    });
    jQuery(htmlCode).find('div.abstract').each(function () {
        jQuery(this).replaceWith('\n\\begin{abstract}\n\n' + this.innerHTML + '\n\n\\end{abstract}\n');
    });

    // join code paragraphs that follow oneanother
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\end{code}\n\n\\begin{code}\n\n/g, '');
    jQuery(htmlCode).find('blockquote').each(function () {
        jQuery(this).replaceWith('\n\\begin{quote}\n\n' + this.innerHTML + '\n\n\\end{quote}\n');
    });
    // join quote paragraphs that follow oneanother
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\end{quote}\n\n\\begin{quote}\n\n/g, '');
    jQuery(htmlCode).find('a').each(function () {
        jQuery(this).replaceWith('\\href{' + this.href + '}{' + this.innerHTML + '}');
    });
    jQuery(htmlCode).find('.citation').each(function () {
        var citationEntries = this.hasAttribute('data-bib-entry') ? this.getAttribute('data-bib-entry').split(',') : [],
            citationBefore = this.hasAttribute('data-bib-before') ? this.getAttribute('data-bib-before').split(',') : [],
            citationPage = this.hasAttribute('data-bib-page') ? this.getAttribute('data-bib-page').split(',') : [],
            citationFormat = this.hasAttribute('data-bib-format') ? this.getAttribute('data-bib-format') : '',
            citationCommand = '\\' + citationFormat,
            citationEntryKeys;

        if (citationEntries.length > 1 && citationBefore.join('').length === 0 && citationPage.join('').length === 0) {
            // multi source citation without page numbers or text before.
            var citationEntryKeys = [];

            citationEntries.forEach(function (citationEntry) {
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

            citationEntries.forEach(function (citationEntry, index) {
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

    jQuery(htmlCode).find('figure').each(function () {
        var caption, figureType, filename, latexPackage, filenameList;
        figureType = jQuery(this).find('figcaption')[0].firstChild.innerHTML;
        // TODO: make use of figure type
        caption = jQuery(this).find('figcaption')[0].lastChild.innerHTML;
        filename = jQuery(this).find('img').attr('data-src');
        filenameList = filename.split('.');
        if (filenameList[filenameList.length - 1] === 'svg') {
            latexPackage = 'includesvg';
        } else {
            latexPackage = 'scaledgraphics';
        }
        this.outerHTML = '\n\\begin{figure}\n\\' + latexPackage + '{' + filename + '}\n\\caption{' + caption + '}\n\\end{figure}\n';
    });

    jQuery(htmlCode).find('.equation, .figure-equation').each(function () {
        var equation = jQuery(this).attr('data-equation');
        // TODO: The string is for some reason escaped. The following line removes this.
        equation = equation.replace(/\\/g, "*BACKSLASH*").replace(/\*BACKSLASH\*\*BACKSLASH\*/g, "\\").replace(/\*BACKSLASH\*/g, "");
        this.outerHTML = '$' + equation + '$';
    });

    jQuery(htmlCode).find('.footnote').each(function () {
        console.log(['footnote', this, this.outerHTML]);
        jQuery(this).replaceWith('\\footnote{' + this.innerHTML + '}');
    });

    returnObject = {
        latex: latexStart + htmlCode.textContent + latexEnd
    };
    if (isChapter) {
        returnObject.listedWorksList = listedWorksList;
    } else {
        bibExport = new bibliographyHelpers.bibLatexExport(listedWorksList, aBibDB);
        returnObject.bibtex = bibExport.bibtex_str;
    }
    return returnObject;
};

var downloadLatex = exports.downloadLatex = function downloadLatex(aDocument) {
    if (window.hasOwnProperty('theEditor') || window.hasOwnProperty('BibDB') && aDocument.is_owner) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function () {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

var export1 = function export1(aDocument, aBibDB) {
    var contents, latexCode, htmlCode, title, outputList, httpOutputList, tempNode;

    title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext('Latex export has been initiated.'));

    contents = document.createElement('div');

    tempNode = (0, _json.obj2Node)(aDocument.contents);

    while (tempNode.firstChild) {
        contents.appendChild(tempNode.firstChild);
    }

    httpOutputList = (0, _tools.findImages)(contents);

    latexCode = exporter.htmlToLatex(title, aDocument.owner.name, contents, aBibDB, aDocument.settings, aDocument.metadata);

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

    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(title) + '.latex.zip');
};

},{"./json":5,"./tools":8,"./zip":10}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.exportNative = exports.downloadNative = exports.uploadNative = undefined;

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

/** The current Fidus Writer filetype version.
 * The importer will not import from a different version and the exporter
  * will include this number in all exports.
 */
var FW_FILETYPE_VERSION = "1.2";

/** Create a Fidus Writer document and upload it to the server as a backup.
 * @function uploadNative
 * @param aDocument The document to turn into a Fidus Writer document and upload.
 */
var uploadNative = exports.uploadNative = function uploadNative(aDocument) {
    exportNative(aDocument, ImageDB, BibDB, function (aDocument, shrunkImageDB, shrunkBibDB, images) {
        exportNativeFile(aDocument, shrunkImageDB, shrunkBibDB, images, true);
    });
};

var downloadNative = exports.downloadNative = function downloadNative(aDocument) {
    if (window.hasOwnProperty('theEditor')) {
        exportNative(aDocument, ImageDB, BibDB, exportNativeFile);
    } else {
        if (aDocument.is_owner) {
            if ('undefined' === typeof BibDB) {
                bibliographyHelpers.getBibDB(function () {
                    if ('undefined' === typeof ImageDB) {
                        usermediaHelpers.getImageDB(function () {
                            exportNative(aDocument, ImageDB, BibDB, exportNativeFile);
                        });
                    } else {
                        exportNative(aDocument, ImageDB, BibDB, exportNativeFile);
                    }
                });
            } else if ('undefined' === typeof ImageDB) {
                usermediaHelpers.getImageDB(function () {
                    exportNative(aDocument, ImageDB, BibDB, exportNativeFile);
                });
            } else {
                exportNative(aDocument, ImageDB, BibDB, exporter.nativeFile);
            }
        } else {
            bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
                usermediaHelpers.getAnImageDB(aDocument.owner, function (anImageDB) {
                    exportNative(aDocument, anImageDB, aBibDB, exportNativeFile);
                });
            });
        }
    }
};

var exportNative = exports.exportNative = function exportNative(aDocument, anImageDB, aBibDB, callback) {
    var contents,
        outputList,
        httpOutputList,
        images,
        shrunkImageDB,
        shrunkBibDB = {},
        imageUrls = [],
        citeList = [],
        i;

    $.addAlert('info', gettext('File export has been initiated.'));

    contents = (0, _json.obj2Node)(aDocument.contents);

    images = (0, _tools.findImages)(contents);

    imageUrls = _.pluck(images, 'url');

    shrunkImageDB = _.filter(anImageDB, function (image) {
        return imageUrls.indexOf(image.image.split('?').shift()) !== -1;
    });

    jQuery(contents).find('.citation').each(function () {
        citeList.push(jQuery(this).attr('data-bib-entry'));
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

var exportNativeFile = function exportNativeFile(aDocument, shrunkImageDB, shrunkBibDB, images, upload) {

    if ('undefined' === typeof upload) {
        upload = false;
    }

    var httpOutputList = images;

    var outputList = [{
        filename: 'document.json',
        contents: JSON.stringify(aDocument)
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

    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(aDocument.title) + '.fidus', 'application/fidus+zip', false, upload);
};

},{"./json":5,"./tools":8,"./zip":10}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var createSlug = exports.createSlug = function createSlug(str) {
    str = str.replace(/[^a-zA-Z0-9\s]/g, "");
    str = str.toLowerCase();
    str = str.replace(/\s/g, '-');
    return str;
};

var findImages = exports.findImages = function findImages(htmlCode) {
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

        if (!_.findWhere(images, {
            'filename': name
        })) {

            images.push({
                'filename': name,
                'url': src
            });
        }
    });

    return images;
};

},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** Uploads a Fidus Writer document to the server.
 * @function uploadFile
 * @param {string} zipFileName The name of the file.
 * @param {blob} blob The contents of the file.
 */
var uploadFile = exports.uploadFile = function uploadFile(zipFilename, blob) {

    var diaButtons = {};

    diaButtons[gettext("Save")] = function () {
        var data = new FormData();

        data.append('note', jQuery(this).find('.revision-note').val());
        data.append('file', blob, zipFilename);
        data.append('document_id', theEditor.doc.id);

        jQuery.ajax({
            url: '/document/upload/',
            data: data,
            type: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            success: function success() {
                jQuery.addAlert('success', gettext('Revision saved'));
            },
            error: function error() {
                jQuery.addAlert('error', gettext('Revision could not be saved.'));
            }
        });
        jQuery(this).dialog("close");
    };

    diaButtons[gettext("Cancel")] = function () {
        jQuery(this).dialog("close");
    };

    jQuery(tmp_revision_dialog()).dialog({
        autoOpen: true,
        height: 180,
        width: 300,
        modal: true,
        buttons: diaButtons,
        create: function create() {
            var $the_dialog = jQuery(this).closest(".ui-dialog");
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
        }
    });
};

},{}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.zipFileCreator = undefined;

var _download = require("./download");

var _upload = require("./upload");

/** Creates a zip file.
 * @function zipFileCreator
 * @param {list} textFiles A list of files in plain text format.
 * @param {list} httpFiles A list fo files that have to be downloaded from the internet before being included.
 * @param {string} zipFileName The name of the zip file to be created
 * @param {string} [mimeType=application/zip] The mimetype of the file that is to be created.
 * @param {list} includeZips A list of zip files to be merged into the output zip file.
 * @param {boolean} [upload=false] Whether to upload rather than downloading the Zip file once finished.
 */

var zipFileCreator = exports.zipFileCreator = function zipFileCreator(textFiles, httpFiles, zipFileName, mimeType, includeZips, upload) {
    var zipFs = new zip.fs.FS(),
        zipDir = undefined;

    if (mimeType) {
        zipFs.root.addText('mimetype', mimeType);
    } else {
        mimeType = 'application/zip';
    }

    var createZip = function createZip() {
        for (var i = 0; i < textFiles.length; i++) {

            zipFs.root.addText(textFiles[i].filename, textFiles[i].contents);
        }

        for (var i = 0; i < httpFiles.length; i++) {

            zipFs.root.addHttpContent(httpFiles[i].filename, httpFiles[i].url);
        }

        zip.createWriter(new zip.BlobWriter(mimeType), function (writer) {

            var currentIndex = 0;

            function process(zipWriter, entry, onend, onprogress, totalSize) {
                var childIndex = 0;

                function exportChild() {
                    var child = entry.children[childIndex],
                        level = 9,
                        reader = null;

                    if (child) {
                        if (child.getFullname() === 'mimetype') {
                            level = 0; // turn compression off for mimetype file
                        }
                        if (child.hasOwnProperty('Reader')) {
                            reader = new child.Reader(child.data);
                        }

                        zipWriter.add(child.getFullname(), reader, function () {
                            currentIndex += child.uncompressedSize || 0;
                            process(zipWriter, child, function () {
                                childIndex++;
                                exportChild();
                            }, onprogress, totalSize);
                        }, function (index) {
                            if (onprogress) onprogress(currentIndex + index, totalSize);
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
                    if (upload) {
                        (0, _upload.uploadFile)(zipFileName, blob);
                    } else {
                        (0, _download.downloadFile)(zipFileName, blob);
                    }
                });
            });
        });
    };

    if (includeZips) {
        var includeZipLoop;

        (function () {
            var i = 0;

            includeZipLoop = function () {
                // for (i = 0; i < includeZips.length; i++) {
                if (i === includeZips.length) {
                    createZip();
                } else {
                    if (includeZips[i].directory === '') {
                        zipDir = zipFs.root;
                    } else {
                        zipDir = zipFs.root.addDirectory(includeZips[i].directory);
                    }
                    zipDir.importHttpContent(includeZips[i].url, false, function () {
                        i++;
                        includeZipLoop();
                    });
                }
            };

            includeZipLoop();
        })();
    } else {
        createZip();
    }
};

},{"./download":2,"./upload":9}],11:[function(require,module,exports){
"use strict";

var _copy = require("./es6_modules/exporter/copy");

var _download = require("./es6_modules/exporter/download");

var _epub = require("./es6_modules/exporter/epub");

var _html = require("./es6_modules/exporter/html");

var _json = require("./es6_modules/exporter/json");

var _latex = require("./es6_modules/exporter/latex");

var _native = require("./es6_modules/exporter/native");

var _tools = require("./es6_modules/exporter/tools");

var _zip = require("./es6_modules/exporter/zip");

/**
 * Functions to export the Fidus Writer document.
 */
var exporter = {};

exporter.savecopy = _copy.savecopy;
exporter.downloadFile = _download.downloadFile;
exporter.styleEpubFootnotes = _epub.styleEpubFootnotes;
exporter.getTimestamp = _epub.getTimestamp;
exporter.downloadEpub = _epub.downloadEpub;
exporter.setLinks = _epub.setLinks;
exporter.orderLinks = _epub.orderLinks;
exporter.downloadHtml = _html.downloadHtml;
exporter.cleanHTML = _html.cleanHTML;
exporter.replaceImgSrc = _html.replaceImgSrc;
exporter.getMathjaxHeader = _html.getMathjaxHeader;
exporter.obj2Node = _json.obj2Node;
exporter.node2Obj = _json.node2Obj;
exporter.findLatexDocumentFeatures = _latex.findLatexDocumentFeatures;
exporter.htmlToLatex = _latex.htmlToLatex;
exporter.downloadLatex = _latex.downloadLatex;
exporter.uploadNative = _native.uploadNative;
exporter.downloadNative = _native.downloadNative;
exporter.createSlug = _tools.createSlug;
exporter.findImages = _tools.findImages;
exporter.zipFileCreator = _zip.zipFileCreator;

window.exporter = exporter;

},{"./es6_modules/exporter/copy":1,"./es6_modules/exporter/download":2,"./es6_modules/exporter/epub":3,"./es6_modules/exporter/html":4,"./es6_modules/exporter/json":5,"./es6_modules/exporter/latex":6,"./es6_modules/exporter/native":7,"./es6_modules/exporter/tools":8,"./es6_modules/exporter/zip":10}]},{},[11]);
