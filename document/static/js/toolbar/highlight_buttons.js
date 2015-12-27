// Highlight buttons

jQuery(document).on('keyup paste change mouseup', '#document-editable', function () {

    var marks = theEditor.editor.activeMarks();

    var strong = marks.some(function(mark){return (mark.type.name==='strong')});

    if (strong) {
        jQuery('#button-bold').addClass('ui-state-active');
    } else {
        jQuery('#button-bold').removeClass('ui-state-active');
    }

    var em = marks.some(function(mark){return (mark.type.name==='em')});

    if (em) {
        jQuery('#button-italic').addClass('ui-state-active');
    } else {
        jQuery('#button-italic').removeClass('ui-state-active');
    }

    var link = marks.some(function(mark){return (mark.type.name==='link')});

    if (link) {
        jQuery('#button-link').addClass('ui-state-active');
    } else {
        jQuery('#button-link').removeClass('ui-state-active');
    }

    jQuery(document).trigger('updateBlockFormat');


});
