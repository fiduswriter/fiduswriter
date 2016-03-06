export let bindHistory = function (editor) {

// toolbar undo / redo

    jQuery(document).on('mousedown', '#button-undo:not(.disabled)', function (event) {
        editor.pm.execCommand("undo")
    })

    jQuery(document).on('mousedown', '#button-redo:not(.disabled)', function (event) {
        editor.pm.execCommand("redo")
    })

}
