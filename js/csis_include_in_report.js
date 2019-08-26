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

(function ($, Drupal, drupalSettings) {

    Drupal.behaviors.csis_include_in_report = {
        attach: function (context, settings) {
            $('.snapshot', context).once("include_in_report").on('click', function (event) {
                console.debug('inlcude in report button pressed');
                // hide "Include in Report button and show loading animation
                $(this).hide();
                $(this).parent().after('<div class="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>');

                var targetNid = $(this).attr('data-camera-target'); // not used anymore, so data-camera-target not needed anymore?
                var targetElement = undefined;
                if ($('.field.field--name-field-react-mount')) {
                    targetElement = $('.field.field--name-field-react-mount').children("div").children("div").attr("id");
                    console.warn('detected deprecated ReactMountNode: ' + targetElement + ', please replace by Extended iFrame')
                } else if ($('<iframe>').get(0)) {
                    //FIXME: Support for multiple iFrames!
                    targetElement = $('iframe').get(0).id;
                    console.debug('detected extended iFrame: ' + targetElement);
                } else {
                    console.warn('sorry, no inlcude in report element  found!');
                    return;
                }

                var stepUUID = drupalSettings.csisHelpers.entityinfo.step_uuid;
                var stepID = drupalSettings.csisHelpers.entityinfo.step;
                var studyID = drupalSettings.csisHelpers.entityinfo.study;
                var autoComment = $('div#reportInfoElement').text();

                // update Report Image template
                reportImageTemplate.data.attributes.title = "Report Image for Study " + studyID + " Step " + stepID;
                reportImageTemplate.data.attributes.field_comment.value = autoComment;
                reportImageTemplate.data.relationships.field_source_step.data.id = stepUUID;

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
                    html2canvas(document.getElementById(targetElement), { useCORS: true, allowTaint: true, async: false, logging: false, foreignObjectRendering: false }).then(canvas => {
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
        error: function () {
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
        success: function (data, status, xhr) {
            var reportImageUUID = data.data.id;
            var reportImageNID = data.data.attributes.drupal_internal__nid;
            console.log("successfully posted new report image with uuid: " + reportImageUUID);
            // no need to create new relationship in GL-step, since ReportImage already stores relation to a GL-Step
            //postReportImageRelationship(csrfToken, stepUUID, reportImageUUID, reportImageNID);

            // open Edit form for the new Report Image
            openEditForm(reportImageNID);
        },
        error: function () {
            console.log("error posting report image");
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
