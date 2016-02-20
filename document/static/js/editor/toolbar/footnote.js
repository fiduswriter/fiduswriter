// toolbar footnote
jQuery(document).on('mousedown', '#button-footnote:not(.disabled)', function (event) {
  event.preventDefault();
  theEditor.editor.execCommand('footnote:insert');
});
