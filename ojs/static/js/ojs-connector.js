(function () {
  var ojsconnector = {},
    submit_url = '';
    submit_data = {};

  ojsconnector.submitDocToOJS = function(zipFileName, blob) {
    var f_data = new FormData();
    $.activateWait();

    for(key in submit_data)
      f_data.append(key, submit_data[key]);

    f_data.append('file', blob, zipFileName);
    console.log(f_data);

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
        if('OK' == responseData) {
          location.href = '/ojscommand/back/'
        } else {
          console.log(responseData);
          $.addAlert('error', 'POST TO OJS DENIED');
        }
      },
      error: function (responseData, textStatus, errorThrown) {
        console.log(responseData);
        $.addAlert('POST TO OJS DENIED');
      },
      complete: function() {
        $.deactivateWait();
      }
    });
  }

  jQuery(document).bind('documentDataLoaded', function () {
    jQuery("#header-navigation .submit-ojs").bind('click', function() {
      jQuery.ajax({
        type: 'GET',
        url: '/ojscommand/geturl/',
        dataType: 'json',
        success: function(response, textStatus, jqXHR) {
          submit_url = response.apiUrl;
          submit_data = {
            'articleId' : response.articleId,
            'op' : 'save',
            'title' : theDocument.title,
            'abstract' : theDocument.metadata.abstract,
            'accessKey' : response.saveAccessKey,
          };
          exporter.native(theDocument, ImageDB, BibDB, exporter.nativeFile, 'submittoojs');
        },
        error: function (jqXHR, textStatus, errorThrown) {
          $.addAlert('error', 'COULD NOT GET PATH TO OJS');
        }
      });
    });
  });

  this.ojsconnector = ojsconnector;
}).call(this);
