// inlinestyles bold
jQuery(document).on('mousedown', '#button-bold:not(.disabled)', function () {
    theEditor.editor.execCommand('schema:strong:toggle');
});
