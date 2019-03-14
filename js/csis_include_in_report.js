(function($, Drupal, drupalSettings) {
	
  Drupal.behaviors.csis_include_in_report = {	  
    attach: function (context, settings) { 	
      $('.snapshot', context).once("include_in_report").on('click', function(event) {

    	  var targetNid = $(this).attr('data-camera-target');
    	  var targetDiv = $('.field.field--name-field-react-mount').children("div").children("div").attr("id");
    	  
    	  var stepID = drupalSettings.csisHelpers.entityinfo.step;
    	  var stepUUID = drupalSettings.csisHelpers.entityinfo.step_uuid;
    	  var studyID = drupalSettings.csisHelpers.entityinfo.study;

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
		  
      });   
    }
  }; 
})(jQuery, Drupal, drupalSettings);



