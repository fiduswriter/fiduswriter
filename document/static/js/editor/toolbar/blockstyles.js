// blockstyle paragraph, h1 - h3, lists
jQuery(document).on('mousedown', '.toolbarheadings label', function (event) {
    switch (this.id.split('_')[0]) {
        case 'h1':
          theEditor.editor.execCommand('heading:make1');
          break;
        case 'h2':
          theEditor.editor.execCommand('heading:make2');
          break;
        case 'h3':
          theEditor.editor.execCommand('heading:make3');
          break;
        case 'p':
          theEditor.editor.execCommand('paragraph:make');
          break;
        case 'code':
          theEditor.editor.execCommand('code_block:make');
          break;
        case 'blockquote':
          theEditor.editor.execCommand('blockquote:wrap');
          break;
        case 'ol':
          theEditor.editor.execCommand('ordered_list:wrap');
          break;
        case 'ul':
          theEditor.editor.execCommand('bullet_list:wrap');
          break;
    }

});

jQuery(document).on('mousedown', '#button-ol', function (event) {
    theEditor.editor.execCommand('ordered_list:wrap');
});

jQuery(document).on('mousedown', '#button-ul', function (event) {
    theEditor.editor.execCommand('bullet_list:wrap');
});
