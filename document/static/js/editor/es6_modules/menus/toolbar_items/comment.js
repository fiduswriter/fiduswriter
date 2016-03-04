export let bindComment = function (editor) {
// Toolbar comment
    jQuery(document).on('mousedown', '#button-comment:not(.disabled)', function (event) {

        editor.mod.comments.interactions.createNewComment()

    })

}
