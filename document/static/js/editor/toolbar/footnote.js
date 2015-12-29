// toolbar footnote
jQuery(document).on('mousedown', '#button-footnote:not(.disabled)', function (event) {
/*
    var selection = rangy.getSelection(),
        range,
        fn, innerFootnote, scrollView;

    event.preventDefault();

    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        if (jQuery(range.startContainer).closest('#document-editable').length===0) {
            return false;
        }
    } else {
        return false;
    }



    if (jQuery(range.startContainer).closest('.pagination-footnote > span').length > 0) {
        // If user is trying to create a footnote inside another footnote, we stop.
        return false;
    }
    fn = document.createDocumentFragment();

    fn.appendChild(document.createTextNode(' '));

    innerFootnote = document.createElement('br')

    fn.appendChild(innerFootnote);

    fn = nodeConverter.createFootnoteView(fn);

    // Make sure to get out of any track changes node if tracking is disabled.
    range = dom.noTrackIfDisabled(range);
    // Make sure to get out of any citation node.
    range = dom.noCitationOrLinkNode(range);
    // Insert the footnote
    manualEdits.insert(fn, range);
    //if (nodeConverter.beforeFootnote) {
    //    fn.parentNode.insertBefore(nodeConverter.beforeFootnote(), fn);
    //}
    editorEscapes.reset();

    range.selectNodeContents(innerFootnote);
    range.collapse();
    selection = rangy.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    scrollView = function () {
        innerFootnote.scrollIntoView();
    }
    // We wait for the footnote to be created before we scroll to it.
    setTimeout(scrollView, 1);

    return true;
*/
});
