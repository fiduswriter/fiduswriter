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
    theCommand = commands[this.id.split('_')[0]];

    theEditor.editor.execCommand(theCommand);

});

jQuery(document).on('mousedown', '#button-ol', function (event) {
    theEditor.editor.execCommand('ordered_list:wrap');
});

jQuery(document).on('mousedown', '#button-ul', function (event) {
    theEditor.editor.execCommand('bullet_list:wrap');
});

jQuery(document).on('mousedown', '#button-blockquote', function (event) {
    theEditor.editor.execCommand('blockquote:wrap');
});
