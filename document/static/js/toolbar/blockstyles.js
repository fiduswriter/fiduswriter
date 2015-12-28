// blockstyle paragraph, h1 - h3, lists
jQuery(document).on('mousedown', '.toolbarheadings label', function (event) {
    console.log(this.id.split('_')[0]);
    switch (this.id.split('_')[0]) {
        case 'h1':
          theEditor.editor.execCommand('makeH1');
          break;
        case 'h2':
          theEditor.editor.execCommand('makeH2');
          break;
        case 'h3':
          theEditor.editor.execCommand('makeH3');
          break;
        case 'p':
          theEditor.editor.execCommand('makeParagraph');
          break;
        case 'code':
          theEditor.editor.execCommand('makeCodeBlock');
          break;
        case 'blockquote':
          theEditor.editor.execCommand('wrapBlockquote');
          break;
        case 'ol':
          theEditor.editor.execCommand('wrapOrderedList');
          break;
        case 'ul':
          theEditor.editor.execCommand('wrapBulletList');
          break;
    }

});

jQuery(document).on('mousedown', '#button-ol', function (event) {
    jQuery('#ol_button').mousedown();
});

jQuery(document).on('mousedown', '#button-ul', function (event) {
    jQuery('#ul_button').mousedown();
});
