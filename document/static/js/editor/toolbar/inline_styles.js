// inlinestyles
// strong
jQuery(document).on('mousedown', '#button-bold:not(.disabled)', function () {
    theEditor.pm.execCommand('strong:toggle');
});
// emph
jQuery(document).on('mousedown', '#button-italic:not(.disabled)', function (event) {
    theEditor.pm.execCommand('em:toggle');
});
