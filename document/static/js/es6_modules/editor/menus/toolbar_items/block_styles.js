export let bindBlockStyles = function (editor) {

// blockstyle paragraph, h1 - h3, lists
jQuery(document).on('mousedown', '.toolbarheadings label', function (event) {
    var commands = {
      'p': 'paragraph:make',
      'h1': 'heading:make1',
      'h2': 'heading:make2',
      'h3': 'heading:make3',
      'h4': 'heading:make4',
      'h5': 'heading:make5',
      'h6': 'heading:make6',
      'code': 'code_block:make'
    },
    theCommand = commands[this.id.split('_')[0]]

    editor.pm.execCommand(theCommand)

})

jQuery(document).on('mousedown', '#button-ol', function (event) {
    editor.pm.execCommand('ordered_list:wrap')
})

jQuery(document).on('mousedown', '#button-ul', function (event) {
    editor.pm.execCommand('bullet_list:wrap')
})

jQuery(document).on('mousedown', '#button-blockquote', function (event) {
    editor.pm.execCommand('blockquote:wrap')
})

}
