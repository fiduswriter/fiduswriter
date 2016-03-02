// toolbar footnote
jQuery(document).on('mousedown', '#button-footnote:not(.disabled)', function (event) {
    theEditor.pm.execCommand('footnote:insert', ['']);
});
