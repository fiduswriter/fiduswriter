(function () {

    var exports = this,
        defaults, pageElement,
        editorEscapes = {};


      editorEscapes.stylesheet = document.getElementById('editor-escapes-style');

      editorEscapes.initiate = function () {
        var pageElement = document.getElementById('flow');

        editorEscapes.reset();

        var observerOptions = {
            attributes: false,
            subtree: true,
            characterData: true,
            childList: true
        };

        var observer = new MutationObserver(function (mutations) {
            observer.disconnect();
            editorEscapes.reset();
            observer.observe(pageElement, observerOptions);
        });
        observer.observe(pageElement, observerOptions);
    };


    editorEscapes.reset = function () {

        var pageElement = document.getElementById('flow'),
            escapeNodes = pageElement.querySelectorAll('.pagination-footnote > *'),
            styleText='',
            escapeIdNumber = 0,
            i;

        // Make sure all footnotes have their own ID.
        for (i = 0; i < escapeNodes.length; i++) {
            if (!escapeNodes[i].parentNode.id) {
                while (document.getElementById('pagination-footnote-'+escapeIdNumber)) {
                  escapeIdNumber++;
                }
                escapeNodes[i].parentNode.id = 'pagination-footnote-'+escapeIdNumber;
            }

        }

        editorEscapes.stylesheet.textContent = '';
        if (escapeNodes.length > 1) {
            for (i = 1; i < escapeNodes.length; i++) {
                if ((escapeNodes[i].parentNode.offsetTop < (escapeNodes[i - 1].offsetTop + escapeNodes[i - 1].offsetHeight)) &&
                    escapeNodes[i].style.top !== (escapeNodes[i - 1].offsetTop + escapeNodes[i - 1].offsetHeight) + 'px'
                ) {
                    editorEscapes.stylesheet.textContent +=
                    '#'+escapeNodes[i].parentNode.id+' > span {top:'+
                    (escapeNodes[i - 1].offsetTop + escapeNodes[i - 1].offsetHeight) + 'px;}';
                }
            }
        }
    };

    exports.editorEscapes = editorEscapes;

}).call(this);
