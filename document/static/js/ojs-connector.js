(function () {
  var ojsconnector = {},
    submit_url = '';

  ojsconnector.submitDocToOJS = function(zipFileName, blob) {
    var f_data = new FormData();
    $.activateWait();
    f_data.append('fidusfile', blob, zipFileName);

    jQuery.ajax({
      type: 'POST',
      url: submit_url,
      crossDomain: true,
      data: f_data,
      cache: false,
      contentType: false,
      processData: false,
      dataType: 'text',
      success: function(responseData, textStatus, jqXHR) {
        if('success' == responseData) {
          location.href = '/ojscommand/back/'
        } else {
          alert('POST failed.');
        }
      },
      error: function (responseData, textStatus, errorThrown) {
        alert('POST failed.');
      }
    });
  }

  jQuery(document).bind('documentDataLoaded', function () {
    jQuery("#header-navigation .submit-ojs").bind('click', function() {
      jQuery.ajax({
        type: 'GET',
        url: '/ojscommand/geturl/',
        dataType: 'text',
        success: function(responseData, textStatus, jqXHR) {
          submit_url = responseData;
          exporter.native(theDocument, ImageDB, BibDB, exporter.nativeFile, 'submittoojs');
        },
        error: function (responseData, textStatus, errorThrown) {
          alert('POST failed.');
        }
      });
    });
  });

  this.ojsconnector = ojsconnector;
}).call(this);
