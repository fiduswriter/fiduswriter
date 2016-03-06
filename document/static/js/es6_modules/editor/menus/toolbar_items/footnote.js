export let bindFootnote = function (editor) {
// toolbar footnote
    jQuery(document).on('mousedown', '#button-footnote:not(.disabled)', function (event) {
        editor.pm.execCommand('footnote:insert', [''])
    })

}
