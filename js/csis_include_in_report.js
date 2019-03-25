// example UUID for file: 1ce9180e-8439-45a8-8e80-23161b76c2b9
// example UUID for gl-node: 507989eb-1905-4715-bd40-3b11d7854c46
// example UUID for Report_image: b77865a5-a65b-4f1c-af87-8bec9679cfbb
var reportImageTemplate = `{
                              "data": {
                                  "type": "node--report_image",
                                  "attributes": {
                                      "title": "aus javascript",
                                      "field_comment": {
                                          "value": "hier ist mein kommentar"
                                      }
                                  },
                                  "relationships": {
                                      "field_image": {
                                          "data": {
                                              "type": "file--file",
                                              "id": "1ce9180e-8439-45a8-8e80-23161b76c2b9"
                                          }
                                      },
                                      "field_report_category": {
                                          "data": {
                                              "type": "taxonomy_term--report_image_category",
                                              "id": "1ce9180e-8439-45a8-8e80-23161b76c2b9"
                                          }
                                      },
                                      "field_source_step": {
                                          "data": {
                                              "type": "node--gl_step",
                                              "id": "507989eb-1905-4715-bd40-3b11d7854c46"
                                          }
                                      }
                                  }
                              }
                          }`;

(function($, Drupal, drupalSettings) {

  Drupal.behaviors.csis_include_in_report = {
    attach: function (context, settings) {
      $('.snapshot', context).once("include_in_report").on('click', function(event) {

    	  var targetNid = $(this).attr('data-camera-target');
    	  var targetDiv = $('.field.field--name-field-react-mount').children("div").children("div").attr("id");

    	  var stepID = drupalSettings.csisHelpers.entityinfo.step;
    	  var stepUUID = drupalSettings.csisHelpers.entityinfo.step_uuid;
    	  var studyID = drupalSettings.csisHelpers.entityinfo.study;

    	  console.log("GL-step UUID: " + stepUUID);

    	  // set Category field of Report image, which is determined by the taxonomy termIDs of taxonomy "report image category"
    	  // currently available: Map -> 176, Table -> 177
    	  // TODO: Get those termIDs dynamically from Drupal
    	  var screenshotType = '176';
    	  if ($('#characteriseHazard-table-container').length) {
    		  screenshotType = '177';
    	  }

    	  // create the new Node of type "Report image"
    	  var newNodeJson = {};
		  newNodeJson.type = [{'target_id': 'report_image'}];
		  newNodeJson.title = [{'value': 'Created as json with the INCLUDE IN REPORT button'}];
		  newNodeJson.field_source_step = [{'target_id': stepID, 'target_type': 'node'}];
		  newNodeJson.field_report_category = [{'target_id': screenshotType, 'target_type': 'taxonomy_term'}];

    	  // TODO: add taken screenshot to Report image node and post it via JSON:API
//    	  html2canvas(document.getElementById(targetDiv), {logging: true, foreignObjectRendering: false}).then(canvas => {
//  		    document.body.appendChild(canvas)
//    	  });

		  getCsrfToken(function (csrfToken) {
			  getReportImageArray(csrfToken, stepUUID);
			});

      });
    }
  };
})(jQuery, Drupal, drupalSettings);

function getCsrfToken(callback) {
	jQuery
	  .get(Drupal.url('rest/session/token'))
	  .done(function (data) {
	    var csrfToken = data;
	    callback(csrfToken);
	  });
}

function getReportImageArray(csrfToken, stepUUID) {
	jQuery.ajax({
		  url: "/jsonapi/node/gl_step/" + stepUUID,
		  method: "GET",
		  headers: {
			"X-CSRF-Token": csrfToken,
		    "Content-Type": "application/vnd.api+json"
		  },
		  success: function(data, status, xhr) {
			     var reportImagesArray = data.data.relationships.field_report_images
			     console.log("report image received");
			     takeScreenshot(csrfToken, stepUUID)
		  }
		});
}

function takeScreenshot(csrfToken, stepUUID) {
	//TODO: take screenshot and save it via JSON:API

	postReportImage(csrfToken, stepUUID);
}

function postReportImage(csrfToken, stepUUID) {
  jQuery.ajax({
		  url: "/jsonapi/node/report_image",
		  method: "POST",
		  headers: {
			  "X-CSRF-Token": csrfToken,
		    "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json"
		  },
      data: reportImageTemplate,
		  success: function(data, status, xhr) {
           console.log(data);
           console.log(status);
           console.log(xhr);
			     patchStep(csrfToken, stepUUID);
		  },
      error: function() {
        console.log("error posting report image");
      }
		});
}

function patchStep(csrfToken, stepUUID) {
  console.log("ToDo: patch GL-Step");
}
/*
jQuery.window.html2canvas(document.getElementById(elementId), {logging: true, foreignObjectRendering: foreignObjectRendering}).then(canvas => {
    //document.body.appendChild(canvas);
    //var imageBlob = canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, '');

    canvas.toBlob(function uploadImage(imageBlob) {
        // function is invoked on button press, so we can safely assume that the token promise was resolved.
        // TODO: add some error checking before going live
        var reportImageFileResource = createReportImageFileResource($this.drupalRestApi.token, imageName);
        reportImageFileResource.store(imageBlob)
                .$promise.then(function uploadImageFileSuccess(imageResponse) {
                    var imageFileUuid = imageResponse.data.id;
                    console.log('upload image file "' + imageName + '" + finished: ' + imageFileUuid);

                    reportImageTemplate.data.attributes.title = title;
                    reportImageTemplate.data.attributes.field_comment.value = comment;
                    reportImageTemplate.data.relationships.field_image.data.id = imageFileUuid;
                    reportImageTemplate.data.relationships.field_source_step.data.id = $this.drupalRestApi.eventData.stepUuid;
                    var reportImageResource = createReportImageResource($this.drupalRestApi.token);
                    reportImageResource.store(reportImageTemplate).$promise.then(function storeReportImageSuccess(reportImageResponse) {
                        if (reportImageResponse && reportImageResponse.data && reportImageResponse.data.id) {
                            if ($this.drupalRestApi.glStepInstance && $this.drupalRestApi.glStepInstance.data &&
                                    $this.drupalRestApi.glStepInstance.data.relationships && $this.drupalRestApi.glStepInstance.data.relationships.field_report_images && $this.drupalRestApi.glStepInstance.data.relationships.field_report_images.data &&
                                    $this.drupalRestApi.glStepInstance.data.relationships.field_report_images.data.length > 0) {
                                console.log('adding resource image to ' + $this.drupalRestApi.glStepInstance.data.relationships.field_report_images.data.length + ' existing relationships');
                                glStepTemplate.data.relationships.field_report_images.data = $this.drupalRestApi.glStepInstance.data.relationships.field_report_images.data;
                            }

                            var reportImageRelationship = {
                                'id': reportImageResponse.data.id,
                                'type': 'node--report_image'
                            };

                            glStepTemplate.data.id = $this.drupalRestApi.eventData.stepUuid;
                            glStepTemplate.data.relationships.field_report_images.data.push(reportImageRelationship);
                            console.log('assigning report image ' + reportImageResponse.data.id + ' to GL Step ' + $this.drupalRestApi.eventData.stepUuid);

                            $http(
                                    {
                                        method: 'PATCH',
                                        url: $this.drupalRestApi.host + '/jsonapi/node/gl_step/' + $this.drupalRestApi.eventData.stepUuid,
                                        headers: {
                                            'Accept': 'application/vnd.api+json',
                                            'Content-Type': 'application/vnd.api+json',
                                            'X-CSRF-Token': $this.drupalRestApi.token
                                        },
                                        data: glStepTemplate
                                    }
                            ).then(function successCallback(glStepResponse) {
                                console.log('report image ' + reportImageResponse.data.id + ' successfully assigned to GL Step ' + $this.drupalRestApi.eventData.stepUuid);
                            }, function errorCallback(glStepErrorResponse) {
                                console.log('error updating GL Step ' + $this.drupalRestApi.eventData.stepUuid + ': ' + glStepErrorResponse);
                            });
                        } else {
                            console.error('error processing stored ReportImage entity: ' + reportImageResponse);
                        }

                    }, function storeReportImageError(reportImageErrorResponse) {
                        console.log('error storing ReportImage entity: ' + reportImageErrorResponse.statusText);
                        $q.reject(reportImageErrorResponse);
                    });
                }, function uploadImageFileError(imageErrorResponse) {
                    console.log('error uploading Image: ' + imageErrorResponse.statusText);
                    $q.reject(imageErrorResponse);
                });
    });
});
*/