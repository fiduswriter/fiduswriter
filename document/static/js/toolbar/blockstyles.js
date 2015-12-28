// blockstyle paragraph, h1 - h3, lists
jQuery(document).on('mousedown', '.toolbarheadings label', function (event) {
    console.log(this.id.split('_')[0]);
    switch (this.id.split('_')[0]) {
        case 'h1':
          theEditor.editor.execCommand('makeH1');
          break;
        case 'h2':
          theEditor.editor.execCommand('makeH2');
          break;
        case 'h3':
          theEditor.editor.execCommand('makeH3');
          break;
        case 'p':
          theEditor.editor.execCommand('makeParagraph');
          break;
        case 'code':
          theEditor.editor.execCommand('makeCodeBlock');
          break;
        case 'blockquote':
          theEditor.editor.execCommand('wrapBlockquote');
          break;
        case 'ol':
          theEditor.editor.execCommand('wrapOrderedList');
          break;
        case 'ul':
          theEditor.editor.execCommand('wrapBulletList');
          break;
    }

/*    var selection = rangy.getSelection(),
        range = selection.getRangeAt(0),
        currentBlockElement = jQuery(range.startContainer).closest('p, li, h1, h2, h3, code, blockquote')[0];

    event.preventDefault();

    if (dom.switchBlockElementWhileSavingCaretPosition(currentBlockElement, this.id.split('_')[0])) {
        jQuery(document).trigger('updateBlockFormat');
        editorHelpers.documentHasChanged();
    }*/

});

jQuery(document).on('mousedown', '#button-ol', function (event) {
    jQuery('#ol_button').mousedown();
});

jQuery(document).on('mousedown', '#button-ul', function (event) {
    jQuery('#ul_button').mousedown();
});

/*jQuery(document).bind('updateBlockFormat', function (event) {
    var selection = rangy.getSelection(),
        range,
        format;

    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
    } else {
        range = rangy.createRange();
    }

    format = jQuery(range.startContainer).closest('p, ul, ol, h1, h2, h3, code, blockquote');

    if (format.length === 0) {
        return;
    } else {
        format = format[0].nodeName.toLowerCase();
    }

    document.getElementById('block-style-label').textContent = document.getElementById(format + "_button").textContent;

    // In case of lists, also highlight these
    if (format === 'ul') {
        jQuery('#button-ul').addClass('ui-state-active');
        jQuery('#button-ol').removeClass('ui-state-active');
    } else if (format === 'ol') {
        jQuery('#button-ol').addClass('ui-state-active');
        jQuery('#button-ul').removeClass('ui-state-active');
    } else {
        jQuery('#button-ul,#button-ol').removeClass('ui-state-active');
    }
});*/
