// inlinestyles
// strong
jQuery(document).on('mousedown', '#button-bold:not(.disabled)', function () {
    theEditor.editor.execCommand('strong:toggle');
});
// emph
jQuery(document).on('mousedown', '#button-italic:not(.disabled)', function (event) {
    theEditor.editor.execCommand('em:toggle');
});
