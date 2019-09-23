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
          id: '84577ed6-4ab5-47e8-b06b-3762386d0471' // this field needs to be changed
        }
      },
      field_report_category: {
        data: {
          type: 'taxonomy_term--report_image_category',
          id: '1ce9180e-8439-45a8-8e80-23161b76c2b9' // this field needs to be changed
        }
      },
      field_source_step: {
        data: {
          type: 'node--gl_step',
          id: '507989eb-1905-4715-bd40-3b11d7854c46' // this field needs to be changed
        }
      }
    }
  }
};

var groupContentTemplate = {
  data: {
    type: 'group_content--study-group_node-report_image',
    attributes: {
      title: 'auto-created Group-content report image'
    },
    relationships: {
      group_content_type: {
        data: {
          type: 'group_content_type--group_content_type',
          id: '57d7aa1f-1daf-4484-81fb-5374d5652bdc'
        }
      },
      gid: {
        data: {
          type: 'group--study',
          id: 'c3609e3e-f80f-482b-9e9f-3a26226a6859' // this field needs to be changed
        }
      },
      entity_id: {
        data: {
          type: 'node--report_image',
          id: '56250fce-3d1f-4fd8-9013-6020c9ecd6e6' // this field needs to be changed
        }
      }
    }
  }
};

(function ($, Drupal, drupalSettings) {

  Drupal.behaviors.csis_include_in_report = {
    attach: function (context, settings) {
      $('.snapshot', context).once("include_in_report").on('click', function (event) {
        console.debug('inlcude in report button pressed');
        // hide "Include in Report button and show loading animation
        $(this).hide();
        $(this).parent().after('<div class="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>');

        var iframeFound = false;
        var targetNid = $(this).attr('data-camera-target'); // not used anymore, so data-camera-target not needed anymore?
        var targetElement = undefined;
        if ($('.field.field--name-field-react-mount').get(0)) {
          targetElement = $('.field.field--name-field-react-mount').children("div").children("div").attr("id");
          console.warn('detected deprecated ReactMountNode: ' + targetElement + ', please replace by Extended iFrame')
        } else if ($('<iframe>').get(0)) {
          //FIXME: Support for multiple iFrames!
          targetElement = $('iframe').get(0).id;
          iframeFound = true;
          console.debug('detected extended iFrame: ' + targetElement);
        } else {
          console.warn('sorry, no inlcude in report element  found!');
          return;
        }

        var stepUUID = drupalSettings.csisHelpers.studyInfo.step_uuid;
        var stepID = drupalSettings.csisHelpers.studyInfo.step;

        var studyID = drupalSettings.csisHelpers.studyInfo.study;
        var studyUUID = drupalSettings.csisHelpers.studyInfo.study_uuid;
        var autoComment = $('div#reportInfoElement').text();

        // update Report Image template
        reportImageTemplate.data.attributes.title = "Report Image for Study " + studyID + " Step " + stepID;
        reportImageTemplate.data.attributes.field_comment.value = autoComment;
        reportImageTemplate.data.relationships.field_source_step.data.id = stepUUID;

        // if we are not in a Gl-step, we need to follow another approach
        // in a third REST call the group content for the Report image needs to be POSTed
        if (stepID == -1) {
          console.log("we are in the Study and not the GL-step!!!");
          // remove the relationship between GL-Step and Report Image, since there is no GL-step available
          delete reportImageTemplate.data.relationships.field_source_step;
          // instead prepare the template for the additional POST call
          reportImageTemplate.data.attributes.title = "Report Image for Study " + studyID;
          groupContentTemplate.data.relationships.gid.data.id = studyUUID;
        }

        // set Category field of Report image, which is determined by the taxonomy termIDs of taxonomy "report image category"
        // currently available: Map -> UUID = 1ce9180e-8439-45a8-8e80-23161b76c2b9, Table -> UUID = 36a3bb55-c6ff-40a4-92c3-92258e7d1374
        // TODO: Get those termIDs dynamically from Drupal
        var imageName = "map-snapshot.png"
        if ($('#characteriseHazard-table-container').length) {
          reportImageTemplate.data.relationships.field_report_category.data.id = "36a3bb55-c6ff-40a4-92c3-92258e7d1374";
          imageName = "table-snapshot.png";
        }

        // only take screenshot if Element	has height and width, otherwise stored file cannot be displayed properly
        // .eq(0) gets the 1st jQuery object while .get(0) get the 1st DOM Element.
        if ($('.field.field--name-field-react-mount').height() > 0 || $('iframe').eq(0).height() > 0) {
          // create screenshot and send POST request for it via JSON:API

          var elementToPrint = document.getElementById(targetElement);

          if (iframeFound) {
            //print the content document, if a iframe was found, because canvas2html cannot print an iframe element
            elementToPrint = elementToPrint.contentDocument;
          }

          if (iframeFound && elementToPrint.getElementById('#map') != null) {
            // a leaflet map was found
            // the css property translate cannot be handled properly by html2canvas, if negative values are used and that is the case, if overlay layers are used.
            // So replace the translate3d property with the top and left property. It was assumed that the third argument of translate3d is 0px
            elementToPrint = elementToPrint.getElementById('#map');
            replaceTranslate3dStyle(elementToPrint);
          } else if (iframeFound) {
            elementToPrint = elementToPrint.body.getElementsByClassName('container ng-scope')[0];
          } else if (elementToPrint.getElementsByClassName('leaflet-tile') != null && elementToPrint.getElementsByClassName('leaflet-tile').length > 0) {
            replaceTranslate3dStyle(elementToPrint);
          }

          html2canvas(elementToPrint, { useCORS: true, allowTaint: false, async: false, logging: false, foreignObjectRendering: false }).then(canvas => {
            canvas.toBlob(function (blob) {
              getCsrfToken(function (csrfToken) {
                postScreenshotFile(csrfToken, stepUUID, blob, imageName);
              });
            });
          });
        }
      });
    }
  };
})(jQuery, Drupal, drupalSettings);

/**
 * Replace the translate3d style of the given element and all children
 */
function replaceTranslate3dStyle(element) {
  replaceTranslate3dStyleByElement(element);
  var subElement = element.firstChild;

  while (subElement) {
    replaceTranslate3dStyle(subElement);
    subElement = subElement.nextSibling;
  }
}

/**
 * Replace translate3d with left and top values
 */
function replaceTranslate3dStyleByElement(element) {
  if (element.style != null) {
    var transformStyle = element.style['transform'];

    if (transformStyle != null) {
      var trans_val = transformStyle.replace('translate3d', '').replace(/px/g, '').replace('(', '').replace(')', '').split(',');
      var trans_y = parseInt(trans_val[trans_val.length - 2]),
        trans_x = parseInt(trans_val[trans_val.length - 3]);

      if (trans_y < 0 || trans_x < 0) {
        element.style['transform'] = 'translate3d(0px,0px,0px)';
        if (element.style['left'] != null && element.style['left'] != "" && element.style['left'].indexOf('px') != -1) {
          element.style['left'] = parseInt(element.style['left'].replace(/px/g, '')) + trans_x + 'px';
        } else {
          element.style['left'] = trans_x + 'px';
        }

        if (element.style['top'] != null && element.style['top'] != "" && element.style['top'].indexOf('px') != -1) {
          element.style['top'] = parseInt(element.style['top'].replace(/px/g, '')) + trans_x + 'px';
        } else {
          element.style['top'] = trans_y + 'px';
        }
      }
    }
  }
}

function getCsrfToken(callback) {
  jQuery
    .get(Drupal.url('rest/session/token'))
    .done(function (data) {
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
    success: function (data, status, xhr) {
      var fileUUID = data.data.id;
      console.log("successfully posted new file " + fileUUID);
      postReportImage(csrfToken, stepUUID, fileUUID);
    },
    error: function (xhr, textStatus, error) {
      console.log("Error posting Screenshot file");
      console.log(xhr.responseText);
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
    success: function (data, status, xhr) {
      var reportImageUUID = data.data.id;
      var reportImageNID = data.data.attributes.drupal_internal__nid;
      console.log("successfully posted new report image with uuid: " + reportImageUUID);
      // no need to create new relationship in GL-step, since ReportImage already stores relation to a GL-Step
      //postReportImageRelationship(csrfToken, stepUUID, reportImageUUID, reportImageNID);

      // if there is no GL-step, we need to create the group content via an extra JSON:API call
      if (stepUUID == -1) {
        groupContentTemplate.data.relationships.entity_id.data.id = reportImageUUID;
        postReportImageGroupContent(csrfToken, stepUUID, reportImageUUID, reportImageNID);
      }

      // open Edit form for the new Report Image
      openEditForm(reportImageNID);
    },
    error: function (xhr, textStatus, error) {
      console.log("Error posting Report Image");
      console.log(xhr.responseText);
    }
  });
}


/* not necessary anymore to store the Report Image in a GL-Step array, since Report Image already stores ID of GL-Step it belongs to */
function postReportImageRelationship(csrfToken, stepUUID, reportImageUUID, reportImageNID) {
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
    success: function (data, status, xhr) {
      console.log("successfully posted new relationship between GL-Step and Report image");
    },
    error: function (data, status, xhr) {
      console.log("error posting new relationship");
      console.log(xhr.responseText);
    }
  });
}

/* Only needed when taking a Screenshot in the Study step, where there is no
GL-step available, which could make the connection between Report image and Study group */
function postReportImageGroupContent(csrfToken, stepUUID, reportImageUUID, reportImageNID) {
  postData = {
    'data': [{
      'type': 'node--report_image',
      'id': reportImageUUID
    }]
  };

  jQuery.ajax({
    url: "/jsonapi/group_content/study-group_node-report_image",
    method: "POST",
    headers: {
      "X-CSRF-Token": csrfToken,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json"
    },
    data: JSON.stringify(groupContentTemplate),
    success: function (data, status, xhr) {
      console.log("successfully posted new Group content for Report image: " + reportImageUUID);
    },
    error: function (data, status, xhr) {
      console.log("error posting new Group content for Report image: " + reportImageUUID);
      console.log(xhr.responseText);
    }
  });
}


function openEditForm(reportImageNID) {
  var currentPath = window.location.pathname;
  var link = jQuery('<a>');
  link.addClass('use-ajax btn btn-sm btn-default');
  link.attr('href', '/node/' + reportImageNID + '/edit?destination=' + currentPath);
  link.attr('data-dialog-options', '{"width":"80%", "dialogClass":"report-image-edit-form"}');
  link.attr('data-dialog-type', 'dialog');
  link.attr('id', 'report-image-edit-link');
  link.text('edit comment');
  jQuery('.snapshot').append(link); // append link-element to something, otherwise attachBehaviors() has no effect
  Drupal.attachBehaviors(); // necessary for binding "use-ajax" class to the onclick-handler
  jQuery('#report-image-edit-link').click();
}
