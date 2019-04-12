var reportImageTemplate = {
  data: {
    type: 'node--report_image',
    attributes: {
      title: 'auto-created report image',
      field_comment: {
        value: 'auto-created comment'
      }
    },
    relationships: {
      field_image: {
        data: {
          type: 'file--file',
          id: '84577ed6-4ab5-47e8-b06b-3762386d0471'
        }
      },
      field_report_category: {
        data: {
          type: 'taxonomy_term--report_image_category',
          id: '1ce9180e-8439-45a8-8e80-23161b76c2b9'
        }
      },
      field_source_step: {
        data: {
          type: 'node--gl_step',
          id: '507989eb-1905-4715-bd40-3b11d7854c46'
        }
      }
    }
  }
};

(function($, Drupal, drupalSettings) {

  Drupal.behaviors.csis_include_in_report = {
    attach: function(context, settings) {
      $('.snapshot', context).once("include_in_report").on('click', function(event) {

        var targetNid = $(this).attr('data-camera-target'); // not used anymore, so data-camera-target not needed anymore?
        var targetDiv = $('.field.field--name-field-react-mount').children("div").children("div").attr("id");
        var stepUUID = drupalSettings.csisHelpers.entityinfo.step_uuid;
        reportImageTemplate.data.relationships.field_source_step.data.id = stepUUID; // update Report Image template

        //console.log("GL-step UUID: " + stepUUID);

        // set Category field of Report image, which is determined by the taxonomy termIDs of taxonomy "report image category"
        // currently available: Map -> UUID = 1ce9180e-8439-45a8-8e80-23161b76c2b9, Table -> UUID = 36a3bb55-c6ff-40a4-92c3-92258e7d1374
        // TODO: Get those termIDs dynamically from Drupal
        var imageName = "map-snapshot.png"
        if ($('#characteriseHazard-table-container').length) {
          reportImageTemplate.data.relationships.field_report_category.data.id = "36a3bb55-c6ff-40a4-92c3-92258e7d1374";
          imageName = "table-snapshot.png"
        }

        // only take screenshot if Element	has height and width, otherwise stored file cannot be displayed properly
        if ($('.field.field--name-field-react-mount').height() > 0) {
	      // create screenshot and send POST request for it via JSON:API
	      html2canvas(document.getElementById(targetDiv), {useCORS:true, async:false, logging: false, foreignObjectRendering: false}).then(canvas => {
	        canvas.toBlob(function(blob) {
	          getCsrfToken(function(csrfToken) {
	            postScreenshotFile(csrfToken, stepUUID, blob, imageName);
	          });
	        });
	      });
      	}
      });
    }
  };
})(jQuery, Drupal, drupalSettings);


function getCsrfToken(callback) {
  jQuery
    .get(Drupal.url('rest/session/token'))
    .done(function(data) {
      var csrfToken = data;
      callback(csrfToken);
    });
}


function postScreenshotFile(csrfToken, stepUUID, canvas, imageName) {
  jQuery.ajax({
    url: "/jsonapi/node/report_image/field_image",
    method: "POST",
    isArray: false,
    headers: {
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'file; filename="' + imageName + '"',
      'Accept': 'application/vnd.api+json'
    },
    data: canvas,
    processData: false,
    contentType: false,
    success: function(data, status, xhr) {
      var fileUUID = data.data.id;
      console.log("successfully posted new file " + fileUUID);
      postReportImage(csrfToken, stepUUID, fileUUID);
    },
    error: function() {
      console.log("error posting report image");
    }
  });
}


function postReportImage(csrfToken, stepUUID, fileUUID) {
  // fill Report Image template with correct data
  reportImageTemplate.data.relationships.field_image.data.id = fileUUID;

  jQuery.ajax({
    url: "/jsonapi/node/report_image",
    method: "POST",
    headers: {
      "X-CSRF-Token": csrfToken,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json"
    },
    data: JSON.stringify(reportImageTemplate),
    success: function(data, status, xhr) {
      var reportImageUUID = data.data.id;
      console.log("successfully posted new report image with uuid: " + reportImageUUID);
      postReportImageRelationship(csrfToken, stepUUID, reportImageUUID);
    },
    error: function() {
      console.log("error posting report image");
    }
  });
}


function postReportImageRelationship(csrfToken, stepUUID, reportImageUUID) {
  postData = {
    'data': [{
      'type': 'node--report_image',
      'id': reportImageUUID
    }]
  };

  jQuery.ajax({
    url: "/jsonapi/node/gl_step/" + stepUUID + "/relationships/field_report_images",
    method: "POST",
    headers: {
      "X-CSRF-Token": csrfToken,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json"
    },
    data: JSON.stringify(postData),
    success: function(data, status, xhr) {
      console.log("successfully posted new relationship between GL-Step and Report image")	
      //console.log(data);
      //console.log(status);
      //console.log(xhr);
    },
    error: function(data, status, xhr) {
      console.log("error posting new relationship");
      //console.log(data);
      //console.log(status);
      //console.log(xhr);
    }
  });
}