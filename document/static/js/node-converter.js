(function () {
    var exports = this,
        /** Converts the node as it is shown and edited in the browser to and
         * from the node as it is saved in the database and communicated with other editors.
         * @namespace nodeConverter
         */
        nodeConverter = {};

    /* Converts <span class="footnote">...</span> to
    <span class="pagination-footnote"><span><span>...</span></span></span> as is
    needed by simplePagination.
    */
    nodeConverter.modeltoViewNode = function (node) {
        var fnNodes = node.querySelectorAll('.footnote'), newFn;

        for (i = 0; i < fnNodes.length; i++) {

            newFn = document.createDocumentFragment();
            while(fnNodes[i].firstChild) {
                newFn.appendChild(fnNodes[i].firstChild);
            }
            newFn = nodeConverter.createFootnoteView(newFn, i);

            fnNodes[i].parentNode.replaceChild(newFn, fnNodes[i]);
        }

        return node;
    };


    // In order to stick with the format used in Fidus Writer 1.1-2.0,
    // we do a few smaller modifications to the node before it is saved.
    nodeConverter.viewToModelNode = function (node) {
        var fnNodes = node.querySelectorAll('.pagination-footnote'),
        strongNodes, emNodes, newNode, i;

        for (i = 0; i < fnNodes.length; i++) {
            newNode = document.createElement('span');
            while (fnNodes[i].firstChild.firstChild.firstChild) {
                newNode.appendChild(fnNodes[i].firstChild.firstChild.firstChild);
            }
            newNode.classList.add('footnote');
            fnNodes[i].parentNode.replaceChild(newNode, fnNodes[i]);
        }

        strongNodes = node.querySelectorAll('strong');

        for (i = 0; i < strongNodes.length; i++) {
            newNode = document.createElement('b');
            while (strongNodes[i].firstChild) {
                newNode.appendChild(strongNodes[i].firstChild);
            }
            strongNodes[i].parentNode.replaceChild(newNode, strongNodes[i]);
        }

        emNodes = node.querySelectorAll('em');

        for (i = 0; i < emNodes.length; i++) {
            newNode = document.createElement('i');
            while (emNodes[i].firstChild) {
                newNode.appendChild(emNodes[i].firstChild);
            }
            emNodes[i].parentNode.replaceChild(newNode, emNodes[i]);
        }


        return node;
    };


    nodeConverter.createFootnoteView = function (htmlFragment, number) {
        var fn = document.createElement('span'), id;
        fn.classList.add('pagination-footnote');

        fn.appendChild(document.createElement('span'));
        fn.firstChild.appendChild(document.createElement('span'));
        fn.firstChild.firstChild.appendChild(htmlFragment);

        if (typeof number === 'undefined') {
            number = document.getElementById('flow').querySelectorAll('.pagination-footnote').length;

            while (document.getElementById('pagination-footnote-'+number)) {
                number++;
            }
        }

        fn.id = 'pagination-footnote-'+ number;
        return fn;
    };



    exports.nodeConverter = nodeConverter;

}).call(this);
