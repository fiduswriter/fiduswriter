// toolbar link
jQuery(document).on('mousedown', '#button-link:not(.disabled)', function(event) {

    if (!theEditor.pm.hasFocus()) {
      return false;
    }

    var dialogButtons = [],
        dialog,
        link = 'http://',
        linkTitle = '',
        defaultLink = 'http://',
        submitButtonText = 'Insert',
        linkElement = _.find(theEditor.pm.activeMarks(),function(mark){return (mark.type.name==='link')});


    if (linkElement) {
        submitButtonText = 'Update';
        linkTitle = linkElement.attrs.title;
        link = linkElement.attrs.href;
    }

    dialogButtons.push({
        text: gettext(submitButtonText),
        class: 'fw-button fw-dark',
        click: function() {

            var newLink = dialog.find('input.link').val(),
                linkTitle = dialog.find('input.linktitle').val(),
                linkNode;

            if ((new RegExp(/^\s*$/)).test(newLink) || newLink === defaultLink) {
                // The link input is empty or hasn't been changed from the default value. Just close the dialog.
                dialog.dialog('close');
                theEditor.pm.focus();
                return;
            }

            if ((new RegExp(/^\s*$/)).test(linkTitle)) {
                // The link text is empty. Make it the same as the link itself.
                linkText = link;
            }
            dialog.dialog('close');
            theEditor.pm.execCommand('link:set',[newLink, linkTitle]);
            theEditor.pm.focus();
            return;

        }
    });

    dialogButtons.push({
        text: gettext('Cancel'),
        class: 'fw-button fw-orange',
        click: function() {
            dialog.dialog('close');
            theEditor.pm.focus();
        }
    });

    dialog = jQuery(toolbarTemplates.linkDialog({
        linkTitle: linkTitle,
        link: link
    }));

    dialog.dialog({
        buttons: dialogButtons,
        modal: true,
        close: function() {
            jQuery(this).dialog('destroy').remove();
        }
    });


});
