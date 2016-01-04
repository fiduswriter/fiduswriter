// blockstyle paragraph, h1 - h3, lists
jQuery(document).on('mousedown', '.toolbarheadings label', function (event) {
    switch (this.id.split('_')[0]) {
        case 'h1':
          theEditor.editor.execCommand('schema:heading:make1');
          break;
        case 'h2':
          theEditor.editor.execCommand('schema:heading:make2');
          break;
        case 'h3':
          theEditor.editor.execCommand('schema:heading:make3');
          break;
        case 'p':
          theEditor.editor.execCommand('schema:paragraph:make');
          break;
        case 'code':
          theEditor.editor.execCommand('schema:code_block:make');
          break;
        case 'blockquote':
          theEditor.editor.execCommand('schema:blockquote:wrap');
          break;
        case 'ol':
          theEditor.editor.execCommand('schema:ordered_list:wrap');
          break;
        case 'ul':
          theEditor.editor.execCommand('schema:bullet_list:wrap');
          break;
    }

});

jQuery(document).on('mousedown', '#button-ol', function (event) {
    jQuery('#ol_button').mousedown();
});

jQuery(document).on('mousedown', '#button-ul', function (event) {
    jQuery('#ul_button').mousedown();
});
