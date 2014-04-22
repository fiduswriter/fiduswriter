/*!
 * simplePagination.js
 * Copyright 2014 Johannes Wilm. Freely available under the AGPL. For further details see LICENSE.txt
 *
 * This is a drop-in replacement for pagination.js that does not use CSS Regions.
 * Please see pagination.js for usage instructions. Only basic options are available.
 */
(function () {



    //    var exports = this,
    var pagination = {};

    /* pagination is the object that contains the namespace used by 
     * pagination.js.
     */

    pagination.defaults = {
        // pagination.config starts out with default config options.
        'sectionStartMarker': 'h1',
        'sectionTitleMarker': 'h1',
        'chapterStartMarker': 'h2',
        'chapterTitleMarker': 'h2',
        'flowElement': 'document.body',
        'flowTo': 'document.body',
        'alwaysEven': true,
        //        'columns': 1,
        'enableFrontmatter': true,
        //        'enableTableOfFigures': false,
        //        'enableTableOfTables': false,
        //        'enableMarginNotes': false,
        //        'enableCrossReferences': true,
        //        'enableWordIndex': true,
        //        'bulkPagesToAdd': 50,
        //        'pagesToAddIncrementRatio': 1.4,
        'frontmatterContents': '',
        'autoStart': true,
        'numberPages': true,
        'divideContents': true,
        'footnoteSelector': '.pagination-footnote',
        'pagebreakSelector': '.pagination-pagebreak',
        'topfloatSelector': '.pagination-topfloat',
        //        'marginnoteSelector': '.pagination-marginnote',
        //        'maxPageNumber': 10000,
        //        'columnSeparatorWidth': 0.09,
        'outerMargin': 0.5,
        'innerMargin': 0.8,
        'contentsTopMargin': 0.8,
        'headerTopMargin': 0.3,
        'contentsBottomMargin': 0.8,
        'pagenumberBottomMargin': 0.3,
        'pageHeight': 8.3,
        'pageWidth': 5.8,
        //        'marginNotesWidth': 1.5,
        //        'marginNotesSeparatorWidth': 0.09,
        //        'marginNotesVerticalSeparatorWidth': 0.09,
        'lengthUnit': 'in'
    };

    pagination.setBrowserSpecifics = function () {

        if (document.caretPositionFromPoint) {
            // Firefox
            pagination.caretRange = function (x, y) {
                var position = document.caretPositionFromPoint(x, y),
                    range = document.createRange();
                range.setStart(position.offsetNode, position.offset);
                return range;
            };
            pagination.matchesSelector = function (element, selector) {
                return element.mozMatchesSelector(selector);
            };
            pagination.columnWidthTerm = 'MozColumnWidth';
            pagination.columnGapTerm = 'MozColumnGap';
            var stylesheet = document.createElement('style');
            // Small fix for Firefox to not print first two pages on top of oneanother.
            stylesheet.innerHTML = "\
            .pagination-page:first-child {\
                page-break-before: always;\
            }\
            ";
            document.head.appendChild(stylesheet);
        } else {
            // Webkit + Chrome
            pagination.caretRange = function (x, y) {
                return document.caretRangeFromPoint(x, y);
            }
            pagination.matchesSelector = function (element, selector) {
                return element.webkitMatchesSelector(selector);
            };
            pagination.columnWidthTerm = 'webkitColumnWidth';
            pagination.columnGapTerm = 'webkitColumnGap';
        }

    };


    pagination.pageStyleSheet = document.createElement('style');

    pagination.initiate = function () {
        /* Initiate pagination.js by importing user set config options and 
         * setting basic CSS style.
         */
        this.setStyle();
        this.setPageStyle();
        document.head.insertBefore(
            pagination.pageStyleSheet,
            document.head.firstChild);
        this.setBrowserSpecifics();
    };

    pagination.setStyle = function () {
        /* Set style for the regions and pages used by pagination.js and add it
         * to the head of the DOM.
         */
        var stylesheet = document.createElement('style'),
            footnoteSelector = pagination.config('footnoteSelector');
        stylesheet.innerHTML = "\
        .pagination-footnotes " + footnoteSelector + " {\
            display: block;\
        }\
        .pagination-contents " + footnoteSelector + " > * {\
            display:none;\
        }\
        .pagination-main-contents-container " + footnoteSelector + ", figure {\
            -webkit-column-break-inside: avoid;\
            page-break-inside: avoid;\
        }\
        body {\
            counter-reset: pagination-footnote pagination-footnote-reference;\
        }\
        .pagination-contents " + footnoteSelector + "::before {\
            counter-increment: pagination-footnote-reference;\
            content: counter(pagination-footnote-reference);\
        }\
        " + footnoteSelector + " > * > *:first-child::before {\
            counter-increment: pagination-footnote;\
            content: counter(pagination-footnote);\
        }\
        .pagination-page {\
            position: relative;\
        }\
        .pagination-page {\
            page-break-after: always;\
            page-break-before: always;\
            margin-left: auto;\
            margin-right: auto;\
        }\
        .pagination-page:first-child {\
            page-break-before: avoid;\
        }\
        .pagination-page:last-child {\
            page-break-after: avoid;\
        }\
        .pagination-main-contents-container, .pagination-pagenumber, .pagination-header {\
            position: absolute;\
        }\
        ";
        document.head.appendChild(stylesheet);
    };


    pagination.setPageStyle = function () {
        // Set style for a particular page size.
        var unit = pagination.config('lengthUnit'),
            contentsWidthNumber = pagination.config('pageWidth') - pagination.config(
                'innerMargin') - pagination.config('outerMargin'),
            contentsWidth = contentsWidthNumber + unit,
            contentsHeightNumber = pagination.config('pageHeight') - pagination
                .config('contentsTopMargin') - pagination.config(
                    'contentsBottomMargin'),
            contentsHeight = contentsHeightNumber + unit,
            pageWidth = pagination.config('pageWidth') + unit,
            pageHeight = pagination.config('pageHeight') + unit,
            contentsBottomMargin = pagination.config('contentsBottomMargin') +
                unit,
            innerMargin = pagination.config('innerMargin') + unit,
            outerMargin = pagination.config('outerMargin') + unit,
            pagenumberBottomMargin = pagination.config('pagenumberBottomMargin') +
                unit,
            headerTopMargin = pagination.config('headerTopMargin') + unit,
            imageMaxHeight = contentsHeightNumber - .1 + unit,
            imageMaxWidth = contentsWidthNumber - .1 + unit,
            footnoteSelector = pagination.config('footnoteSelector');

        pagination.pageStyleSheet.innerHTML = "\
            .pagination-page {height:" + pageHeight + "; width:" + pageWidth + ";\
            background-color: #fff;}\
            @page {size:" + pageWidth + " " + pageHeight + ";}\
            body {background-color: #efefef; margin:0;}\
            @media screen{.pagination-page {border:solid 1px #000; margin-bottom:.2in;}} \
            .pagination-main-contents-container {width:" + contentsWidth + "; height:" + contentsHeight + ";\
                bottom:" + contentsBottomMargin + ";} \
            .pagination-contents-container {bottom:" + contentsBottomMargin + ";\
               height:" + contentsHeight + "}\
            .pagination-contents {height:" + contentsHeight + "; width:" + contentsWidth + ";}\
            img {max-height: " + imageMaxHeight + "; max-width: 100%;}\
            .pagination-pagenumber {bottom:" + pagenumberBottomMargin + ";}\
            .pagination-header {top:" + headerTopMargin + ";}\
            .pagination-page:nth-child(odd) .pagination-main-contents-container, \
            .pagination-page:nth-child(odd) .pagination-pagenumber, \
            .pagination-page:nth-child(odd) .pagination-header {right:" + outerMargin + ";left:" + innerMargin + ";}\
            .pagination-page:nth-child(even) .pagination-main-contents-container, \
            .pagination-page:nth-child(even) .pagination-pagenumber, \
            .pagination-page:nth-child(even) .pagination-header {right:" + innerMargin + ";left:" + outerMargin + ";}\
            .pagination-page:nth-child(odd) .pagination-pagenumber,\
            .pagination-page:nth-child(odd) .pagination-header {text-align:right;}\
            .pagination-page:nth-child(odd) .pagination-header-section {display:none;}\
            .pagination-page:nth-child(even) .pagination-header-chapter {display:none;}\
            .pagination-page:nth-child(even) .pagination-pagenumber,\
            .pagination-page:nth-child(even) .pagination-header { text-align:left;}\
            " + footnoteSelector + " > * > * {font-size: 0.7em; margin:.25em;}\
            " + footnoteSelector + " > * > *::before, " + footnoteSelector + "::before \
            {position: relative; top: -0.5em; font-size: 80%;}\
            #pagination-toc-title:before {content:'Contents';}\
            .pagination-toc-entry .pagination-toc-pagenumber {float:right;}\
            ";

    };

    pagination.createToc = function () {
        var tocDiv = document.createElement('div'),
            tocTitleH1 = document.createElement('h1'),
            tocItems = document.getElementById('pagination-layout').querySelectorAll('.pagination-body'),
            tocItemDiv, tocItemTextSpan, itemType, tocItemPnSpan,
            i;

        if (!pagination.config('numberPages')) {
            return false;
        }
        tocDiv.id = 'pagination-toc';
        tocTitleH1.id = 'pagination-toc-title';
        tocDiv.appendChild(tocTitleH1);

        for (i = 0; i < tocItems.length; i++) {
            if (pagination.matchesSelector(tocItems[i], '.pagination-chapter')) {
                itemType = 'chapter';
            } else if (pagination.matchesSelector(tocItems[i], '.pagination-section')) {
                itemType = 'section';
            } else {
                continue;
            }
            tocItemDiv = document.createElement('div');
            tocItemDiv.classList.add('pagination-toc-entry');
            tocItemTextSpan = document.createElement('span');
            tocItemTextSpan.classList.add('pagination-toc-text');

            tocItemTextSpan.appendChild(document.createTextNode(tocItems[i].querySelector('.pagination-header-' + itemType).textContent.trim()));
            tocItemDiv.appendChild(tocItemTextSpan);

            tocItemPnSpan = document.createElement('span');
            tocItemPnSpan.classList.add('pagination-toc-pagenumber');

            tocItemPnSpan.appendChild(document.createTextNode(tocItems[i].querySelector('.pagination-pagenumber').textContent.trim()));


            tocItemDiv.appendChild(tocItemPnSpan);

            tocDiv.appendChild(tocItemDiv);
        }

        return tocDiv;

    };

    pagination.events = {};

    pagination.events.layoutFlowFinished = document.createEvent('Event');
    pagination.events.layoutFlowFinished.initEvent(
        'layoutFlowFinished',
        true,
        true);
    /* layoutFlowFinished is emitted the first time the flow of the entire book has
     * been created.
     */


    pagination.config = function (configKey) {
        /* Return configuration variables either from paginationConfig if present,
         * or using default values.
         */
        var returnValue;
        if (typeof paginationConfig != 'undefined' && paginationConfig.hasOwnProperty(configKey)) {
            returnValue = paginationConfig[configKey];
        } else if (pagination.defaults.hasOwnProperty(configKey)) {
            returnValue = pagination.defaults[configKey];
        } else {
            returnValue = false;
        }
        return returnValue;
    };

    pagination.pageCounterCreator = function (cssClass, show) {
        /* Create a pagecounter. cssClass is the CSS class employed by this page
         * counter to mark all page numbers associated with it. If a show function
         * is specified, use this instead of the built-in show function.
         */
        this.cssClass = cssClass;
        if (show !== undefined) {
            this.show = show;
        }
    };

    pagination.pageCounterCreator.prototype.value = 0;
    // The initial value of any page counter is 0.


    pagination.pageCounterCreator.prototype.show = function () {
        /* Standard show function for page counter is to show the value itself
         * using arabic numbers.
         */
        return this.value;
    };

    pagination.pageCounterCreator.prototype.incrementAndShow = function () {
        /* Increment the page count by one and return the reuslt page count 
         * using the show function.
         */
        this.value++;
        return this.show();
    };


    pagination.pageCounterCreator.prototype.numberPages = function () {
        /* If the pages associated with this page counter need to be updated, 
         * go through all of them from the start of the book and number them,
         * thereby potentially removing old page numbers.
         */
        var pagenumbersToNumber, i;
        this.value = 0;

        pagenumbersToNumber = document.querySelectorAll(
            '.pagination-page .pagination-pagenumber.pagination-' + this.cssClass);
        for (i = 0; i < pagenumbersToNumber.length; i++) {
            pagenumbersToNumber[i].innerHTML = this.incrementAndShow();
        }
    };

    pagination.pageCounters = {};
    /* pagination.pageCounters contains all the page counters we use in a book --
     * typically these are two -- roman for the frontmatter and arab for the main
     * body contents.
     */

    pagination.romanize = function () {
        // Create roman numeral representations of numbers.
        var digits = String(+this.value).split(""),
            key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
                "",
                "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC", "",
                "I", "II",
                "III", "IV", "V", "VI", "VII", "VIII", "IX"
            ],
            roman = "",
            i = 3;
        while (i--) {
            roman = (key[+digits.pop() + (i * 10)] || "") + roman;
        }
        return new Array(+digits.join("") + 1).join("M") + roman;
    };

    pagination.pageCounters.arab = new pagination.pageCounterCreator(
        'arab');
    // arab is the page counter used by the main body contents.

    pagination.pageCounters.roman = new pagination.pageCounterCreator(
        'roman',
        pagination.romanize);
    // roman is the page counter used by the frontmatter.    


    pagination.cutToFit = function (contents) {


        var coordinates, range, overflow, manualPageBreak;

        contents.style.height = (contents.parentElement.clientHeight - contents.previousSibling.clientHeight - contents.nextSibling.clientHeight) + 'px';
        contents.style[pagination.columnWidthTerm] = contents.clientWidth + 'px';
        contents.style[pagination.columnGapTerm] = '0px';

        manualPageBreak = contents.querySelector(pagination.config('pagebreakSelector'));

        if (manualPageBreak && manualPageBreak.getBoundingClientRect().left < contents.getBoundingClientRect().right) {
            range = document.createRange();
            range.setStartBefore(manualPageBreak);
        } else if (contents.clientWidth === contents.scrollWidth) {
            return false;
        } else {
            contents.scrollIntoView(true);
            coordinates = contents.getBoundingClientRect();
            range = pagination.caretRange(coordinates.right + 1, coordinates.top);
        }
        range.setEndAfter(contents.lastChild);
        overflow = range.extractContents();

        if (!contents.lastChild || (contents.textContent.trim().length === 0 && contents.querySelectorAll('img,svg,canvas').length === 0)) {
            contents.appendChild(overflow);
            overflow = false;
        }
        contents.style[pagination.columnWidthTerm] = "auto";

        return overflow;
    };


    pagination.createPage = function (container, pageCounterClass) {
        var page = document.createElement('div'),
            contentsContainer = document.createElement('div'),
            mainContentsContainer = document.createElement('div'),
            topfloats = document.createElement('div'),
            contents = document.createElement('div'),
            footnotes = document.createElement('div'),
            header, chapterHeader, sectionheader, pagenumberField;


        page.classList.add('pagination-page');
        contentsContainer.classList.add('pagination-contents-container');
        mainContentsContainer.classList.add('pagination-main-contents-container');

        if (pagination.currentChapter || pagination.currentSection) {

            header = document.createElement('div');

            header.classList.add('pagination-header');

            if (pagination.currentChapter) {

                chapterHeader = document.createElement('span');

                chapterHeader.classList.add('pagination-header-chapter');
                chapterHeader.appendChild(pagination.currentChapter.cloneNode(true));
                header.appendChild(chapterHeader);
            }

            if (pagination.currentSection) {

                sectionHeader = document.createElement('span');
                sectionHeader.classList.add('pagination-header-section');
                sectionHeader.appendChild(pagination.currentSection.cloneNode(true));
                header.appendChild(sectionHeader);
            }
            page.appendChild(header);
        }

        topfloats.classList.add('pagination-topfloats');
        //topfloats.appendChild(document.createElement('p'));

        contents.classList.add('pagination-contents');

        footnotes.classList.add('pagination-footnotes');
        footnotes.appendChild(document.createElement('p'));

        mainContentsContainer.appendChild(topfloats);
        mainContentsContainer.appendChild(contents);
        mainContentsContainer.appendChild(footnotes);

        page.appendChild(mainContentsContainer);

        if (pagination.config('numberPages')) {

            pagenumberField = document.createElement('div');
            pagenumberField.classList.add('pagination-pagenumber');
            pagenumberField.classList.add('pagination-' + pageCounterClass);

            page.appendChild(pagenumberField);
        }


        container.appendChild(page);
        return contents;
    };

    pagination.fillPage = function (node, container, pageCounterStyle) {

        var lastPage = pagination.createPage(container, pageCounterStyle),
            clonedNode = node.cloneNode(true),
            footnoteSelector = pagination.config('footnoteSelector'),
            topfloatSelector = pagination.config('topfloatSelector'),
            topfloatsLength, topfloats,
            footnotes, footnotesLength, clonedFootnote, i, oldFn, fnHeightTotal;

        lastPage.appendChild(node);

        overflow = pagination.cutToFit(lastPage);

        topfloatsLength = lastPage.querySelectorAll(topfloatSelector).length;

        if (topfloatsLength > 0) {
            topfloats = clonedNode.querySelectorAll(topfloatSelector);

            for (i = 0; i < topfloatsLength; i++) {
                while (topfloats[i].firstChild) {
                    lastPage.previousSibling.appendChild(topfloats[i].firstChild);
                }

            }
            while (lastPage.firstChild) {
                lastPage.removeChild(lastPage.firstChild);
            }
            node = clonedNode.cloneNode(true);
            lastPage.appendChild(node);
            overflow = pagination.cutToFit(lastPage);
        }

        footnotes = lastPage.querySelectorAll(footnoteSelector);
        footnotesLength = footnotes.length;
        if (footnotesLength > 0) {

            while (lastPage.nextSibling.firstChild) {
                lastPage.nextSibling.removeChild(lastPage.nextSibling.firstChild);
            }

            for (i = 0; i < footnotesLength; i++) {
                clonedFootnote = footnotes[i].cloneNode(true);
                lastPage.nextSibling.appendChild(clonedFootnote);
            }

            while (lastPage.firstChild) {
                lastPage.removeChild(lastPage.firstChild);
            }

            lastPage.appendChild(clonedNode);

            overflow = pagination.cutToFit(lastPage);
            for (i = lastPage.querySelectorAll(footnoteSelector).length; i < footnotesLength; i++) {
                oldFn = lastPage.nextSibling.children[i];

                while (oldFn.firstChild) {
                    oldFn.removeChild(oldFn.firstChild);
                }
            }
        }


        if (overflow.firstChild && overflow.firstChild.textContent.trim().length === 0 && (overflow.firstChild.nodeName === 'P' || overflow.firstChild.nodeName === 'DIV')) {
            overflow.removeChild(overflow.firstChild);
        }

        if (lastPage.firstChild &&
            lastPage.firstChild.nodeType != 3 &&
            lastPage.firstChild.textContent.trim().length === 0 &&
            lastPage.firstChild.querySelectorAll('img,svg,canvas').length === 0) {
            lastPage.removeChild(lastPage.firstChild);


        } else if (overflow.firstChild && lastPage.firstChild) {
            setTimeout(function () {
                pagination.fillPage(overflow, container, pageCounterStyle);
            }, 1);
        } else {
            pagination.finish(container, pageCounterStyle);
        }

    };

    pagination.paginateDivision = function (layoutDiv, pageCounterStyle) {
        if (++pagination.currentFragment < pagination.bodyFlowObjects.length) {
            newContainer = document.createElement('div');
            layoutDiv.appendChild(newContainer);
            newContainer.classList.add('pagination-body');
            newContainer.classList.add('pagination-body-' + pagination.currentFragment);
            if (pagination.bodyFlowObjects[pagination.currentFragment].section) {
                pagination.currentSection = pagination.bodyFlowObjects[pagination.currentFragment].section;
                newContainer.classList.add('pagination-section');
            }
            if (pagination.bodyFlowObjects[pagination.currentFragment].chapter) {
                pagination.currentChapter = pagination.bodyFlowObjects[pagination.currentFragment].chapter;
                newContainer.classList.add('pagination-chapter');
            }
            pagination.flowElement(pagination.bodyFlowObjects[pagination.currentFragment].fragment, newContainer, pageCounterStyle, pagination.bodyFlowObjects[pagination.currentFragment].section, pagination.bodyFlowObjects[pagination.currentFragment].chapter);
        } else {
            pagination.currentChapter = false;
            pagination.currentSection = false;
            pagination.pageCounters[pageCounterStyle].numberPages();
            if (pagination.config('enableFrontmatter')) {
                layoutDiv.insertBefore(document.createElement('div'), layoutDiv.firstChild);
                layoutDiv.firstChild.classList.add('pagination-frontmatter');
                tempNode = document.createElement('div');
                tempNode.innerHTML = pagination.config('frontmatterContents');
                flowObject = {
                    fragment: document.createDocumentFragment(),
                }
                while (tempNode.firstChild) {
                    flowObject.fragment.appendChild(tempNode.firstChild);
                }
                flowObject.fragment.appendChild(pagination.createToc());
                pagination.flowElement(flowObject.fragment, layoutDiv.firstChild, 'roman');
            }
            window.scrollTo(0, 0);
        }

    };

    pagination.finish = function (container, pageCounterStyle) {
        var newContainer, layoutDiv = container.parentElement;
        if (pagination.config('alwaysEven') && container.querySelectorAll('.pagination-page').length % 2 === 1) {
            pagination.createPage(container, pageCounterStyle);
        }
        if (pagination.config('divideContents') && container.classList.contains('pagination-body')) {
            pagination.paginateDivision(layoutDiv, pageCounterStyle);
        } else {
            window.scrollTo(0, 0);
            pagination.pageCounters[pageCounterStyle].numberPages();
            document.dispatchEvent(pagination.events.layoutFlowFinished);
        }
    };

    pagination.flowElement = function (overflow, container, pageCounterStyle) {

        setTimeout(function () {
            pagination.fillPage(overflow, container, pageCounterStyle);
        }, 1);
    };

    pagination.applyBookLayoutWithoutDivision = function () {
        // Create div for layout
        var layoutDiv = document.createElement('div'),
            bodyLayoutDiv = document.createElement('div'),
            flowedElement = eval(pagination.config('flowElement')),
            flowFragment = document.createDocumentFragment(),
            flowTo = eval(pagination.config('flowTo'));

        while (flowedElement.firstChild) {
            flowFragment.appendChild(flowedElement.firstChild);
        }

        layoutDiv.id = 'pagination-layout';
        bodyLayoutDiv.id = 'pagination-body';
        layoutDiv.appendChild(bodyLayoutDiv);
        flowTo.appendChild(layoutDiv);

        pagination.flowElement(flowFragment, bodyLayoutDiv, 'arab');
    };

    pagination.applyBookLayout = function () {
        // Create div for layout
        var layoutDiv = document.createElement('div'),
            flowedElement = eval(pagination.config('flowElement')),
            flowObject,
            chapterStartSelector = pagination.config('chapterStartMarker'),
            sectionStartSelector = pagination.config('sectionStartMarker'),
            dividerSelector = chapterStartSelector + ',' + sectionStartSelector,
            dividers = flowedElement.querySelectorAll(dividerSelector),
            range = document.createRange(),
            extraElement, tempNode, i, nextChapter = false,
            nextSection = false,
            flowTo = eval(pagination.config('flowTo'));

        pagination.bodyFlowObjects = [];
        pagination.currentFragment = -1;
        layoutDiv.id = 'pagination-layout';

        for (i = 0; i < dividers.length; i++) {
            flowObject = {
                chapter: false,
                section: false
            };
            if (nextChapter) {
                flowObject.chapter = nextChapter;
                nextChapter = false;
            }
            if (nextSection) {
                flowObject.section = nextSection;
                nextSection = false;
            }
            range.setStart(flowedElement.firstChild, 0);
            range.setEnd(dividers[i], 0);
            flowObject.fragment = range.extractContents();
            pagination.bodyFlowObjects.push(flowObject);

            extraElement = flowObject.fragment.querySelectorAll(dividerSelector)[1];
            if (extraElement && extraElement.parentElement) {
                extraElement.parentElement.removeChild(extraElement);
            }
            if (pagination.matchesSelector(dividers[i], chapterStartSelector)) {
                tempNode = flowedElement.querySelector(pagination.config('chapterTitleMarker'));
                if (!tempNode) {
                    tempNode = document.createElement('div');
                }
                tempNode = tempNode.cloneNode(true);
                nextChapter = document.createDocumentFragment();
                while (tempNode.firstChild) {
                    nextChapter.appendChild(tempNode.firstChild);
                }
            } else {
                tempNode = flowedElement.querySelector(pagination.config('sectionTitleMarker')).cloneNode(true);
                nextSection = document.createDocumentFragment();
                while (tempNode.firstChild) {
                    nextSection.appendChild(tempNode.firstChild);
                }
            }

            if (i === 0) {
                if (flowObject.fragment.textContent.trim().length === 0 && flowObject.fragment.querySelectorAll('img,svg,canvas,hr').length === 0) {
                    pagination.bodyFlowObjects.pop();
                }
            }
        }

        flowObject = {
            chapter: false,
            section: false
        };
        if (nextChapter) {
            flowObject.chapter = nextChapter;
        }
        if (nextSection) {
            flowObject.section = nextSection;
        }

        flowObject.fragment = document.createDocumentFragment();

        while (flowedElement.firstChild) {
            flowObject.fragment.appendChild(flowedElement.firstChild);
        }


        pagination.bodyFlowObjects.push(flowObject);

        flowTo.appendChild(layoutDiv);

        pagination.paginateDivision(layoutDiv, 'arab');

    };

    pagination.bindEvents = function () {
        document.addEventListener(
            "readystatechange",
            function () {
                if (pagination.config('autoStart') === true) {
                    if (document.readyState === 'interactive') {
                        var imgs = document.images,
                            len = imgs.length,
                            counter = 0;

                        function incrementCounter() {
                            counter++;
                            if (counter === len) {

                                if (pagination.config('divideContents')) {
                                    pagination.applyBookLayout();
                                } else {
                                    pagination.applyBookLayoutWithoutDivision();
                                }
                            }
                        }

                        [].forEach.call(imgs, function (img) {
                            img.addEventListener('load', incrementCounter, false);
                        });
                        if (len === 0) {
                            incrementCounter();
                        }
                    }
                }
            }
        );
    };

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = pagination;
        }
        exports.pagination = pagination;
    } else {
        // `window` in the browser, or `exports` on the server
        this.pagination = pagination;
        pagination.initiate();
        pagination.bindEvents();
    }



}.call(this));
