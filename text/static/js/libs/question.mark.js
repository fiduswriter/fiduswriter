/*
 * QuestionMark.js
 * Fork from: http://impressivewebs.github.io/QuestionMark.js/ by Louis Lazaris
 *
 * This is an adaptation for Fidus Writer http://fiduswriter.org
 * by Gabriel Lopez <gabriel.marcos.lopez@gmail.com>
 * License: Creative Common 2.0
 * http://creativecommons.org/licenses/by/2.0/
 *
 * Usage: $().showShortcuts()
 */

$(document).ready(function() {
    function removeModal($helpUnderlay) {
        $helpUnderlay.removeClass("help-isVisible")
    }

    function getWindowWidth() {
        var w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            x = w.innerWidth || e.clientWidth || g.clientWidth;
            //var y = w.innerHeight || e.clientHeight || g.clientHeight;
        return x;
    }

    function doUnderlayHeight() {
        var D = document;
        return Math.max(
            D.body.scrollHeight, D.documentElement.scrollHeight,
            D.body.offsetHeight, D.documentElement.offsetHeight,
            D.body.clientHeight, D.documentElement.clientHeight
        );
    }

    function doModalSize(o) {
        // Find out how many columns there are, create array of heights
        o.helpColsTotal = 0;
        for (o.i = 0; o.i < o.helpLists.length; o.i += 1) {
            if (o.helpLists[o.i].className.indexOf('help-list') !== -1) {
                o.helpColsTotal += 1;
            }
            o.helpListsHeights[o.i] = o.helpLists[o.i].offsetHeight;
        }

        // get the tallest column from the array of heights
        o.maxHeight = Math.max.apply(Math, o.helpListsHeights);

        // Quasi-responsive
        if (getWindowWidth() <= 1180 && getWindowWidth() > 630 && o.helpColsTotal > 2) {
            o.helpColsTotal = 2;
            o.maxHeight = o.maxHeight * o.helpColsTotal;
        }

        if (getWindowWidth() <= 630) {
            o.maxHeight = o.maxHeight * o.helpColsTotal;
            o.helpColsTotal = 1;
        }

        // Change the width/height of the modal and wrapper to fit the columns
        // Sorry for the magic numbers. Whatevs.
        o.helpListWrap.style.offsetWidth = (o.helpList.offsetWidth * o.helpColsTotal) + 'px';
        o.helpListWrap.style.height = o.maxHeight + 'px';
        o.helpModal.style.width = (o.helpList.offsetWidth * o.helpColsTotal) + 60 + 'px';
        o.helpModal.style.height = o.maxHeight + 100 + 'px';
    }

    // Primary function, called in checkServerResponse()
    function doQuestionMark() {

        var helpUnderlay = document.getElementById('helpUnderlay');
        var $helpUnderlay = $("#helpUnderlay");
        var helpModal = document.getElementById('helpModal'),
            helpClose = document.getElementById('helpClose'),
            timeOut = null,
            objDoSize = {
                i: null,
                maxHeight: null,
                helpListWrap: document.getElementById('helpListWrap'),
                helpList: document.querySelector('.help-list'),
                helpLists: document.querySelectorAll('.help-list'),
                helpModal: helpModal,
                helpColsTotal: null,
                helpListsHeights: []
            },
            classCol;

        doModalSize(objDoSize);

        $.fn.extend({
            showShortcuts: function() {
                $helpUnderlay.addClass("help-isVisible");
                helpUnderlay.style.height = doUnderlayHeight() + 'px';
            }
        });

        // this prevents click on modal from removing the modal
        $(helpModal).click(function (evnt) {
            evnt.stopPropagation();
        });

        // Modal is removed if ESC is pressed
        $(document).keyup(function(evnt) {
            if(evnt.which == 27) { // ESC
                removeModal($helpUnderlay);
            }
        });

        // Modal is removed if the background is clicked
        helpUnderlay.addEventListener('click', function () {
            removeModal($helpUnderlay);
        }, false);

        // the close button
        helpClose.addEventListener('click', function () {
            removeModal($helpUnderlay);
        }, false);

        // If the window is resized, the doModalSize() function is called again.
        // If your menu includes only a single column of keyboard shortcuts,
        // then you won't need this. Keep only if you have 2 columns or more.
        window.onresize = function () {
            if (timeOut !== null) {
                clearTimeout(timeOut);
            }
            timeOut = setTimeout(function () {
                doModalSize(objDoSize);
            }, 100);
        };
    }

    // All the Ajax stuff is below.
    $.get("question.mark.html", function(data) {
        $("body").append(data);
        doQuestionMark();
    });
});
