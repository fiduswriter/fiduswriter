export let bindInlineStyles = function (editor) {

// inlinestyles
    // strong
    jQuery(document).on('mousedown', '#button-bold:not(.disabled)', function () {
        editor.pm.execCommand('strong:toggle')
    })
    // emph
    jQuery(document).on('mousedown', '#button-italic:not(.disabled)', function (event) {
        editor.pm.execCommand('em:toggle')
    })

}
