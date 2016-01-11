// inlinestyles italic
jQuery(document).on('mousedown', '#button-italic:not(.disabled)', function (event) {
    theEditor.editor.execCommand('em:toggle');
});
