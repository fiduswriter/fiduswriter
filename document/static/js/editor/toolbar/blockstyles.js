// blockstyle paragraph, h1 - h3, lists
jQuery(document).on('mousedown', '.toolbarheadings label', function (event) {
    event.preventDefault();

    switch (this.id.split('_')[0]) {
        case 'p':
          theEditor.editor.execCommand('paragraph:make');
          break;
        case 'h1':
          theEditor.editor.execCommand('heading:make1');
          break;
        case 'h2':
          theEditor.editor.execCommand('heading:make2');
          break;
        case 'h3':
          theEditor.editor.execCommand('heading:make3');
          break;
        case 'h4':
          theEditor.editor.execCommand('heading:make4');
          break;
        case 'h5':
          theEditor.editor.execCommand('heading:make5');
          break;
        case 'h6':
          theEditor.editor.execCommand('heading:make6');
          break;
        case 'code':
          theEditor.editor.execCommand('code_block:make');
          break;
    }

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
