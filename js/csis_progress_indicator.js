(function($, Drupal, drupalSettings){
	
	$(document).ready(function() {
		
		if(drupalSettings.csisHelpers === undefined || drupalSettings.csisHelpers.entityinfo === undefined) {
			return;
		}
		
		var stepID = drupalSettings.csisHelpers.entityinfo.step;
		var studyID = drupalSettings.csisHelpers.entityinfo.study;
		var studyProgress = $("#study-current-progress").data("step-number");
		var activeTab = $(".nav-link.main.active").data("step-number");
		
		// for now active next study step once user visits the "introduction tab" of current step
		var path = jQuery(location).attr('pathname');
		var lastPart = path.substr(path.lastIndexOf('/') + 1);
		
		// update progress indicator when user visits the current maximum step
		if (activeTab == studyProgress && lastPart == "introduction" && studyProgress !== undefined) {
			//updateStudyProgress(studyID, studyProgress + 1);
			getCsrfToken(function (csrfToken) {
				updateStudyProgress(csrfToken, studyID, studyProgress + 1);
			});
		}
	});

})(jQuery, Drupal, drupalSettings);

function getCsrfToken(callback) {
	jQuery
	  .get(Drupal.url('rest/session/token'))
	  .done(function (data) {
	    var csrfToken = data;
	    callback(csrfToken);
	  });
}

function updateStudyProgress(csrfToken, studyID, studyProgress) {
	
	jQuery.ajax({
		  url: "/group/" + studyID + "?_format=json",
		  method: "GET",
		  headers: {
		    "Content-Type": "application/json"
		  },
		  success: function(data, status, xhr) {
		    data.field_progress_indicator = [{'value': studyProgress}]

		    jQuery.ajax({
		      url: "/group/" + studyID + "?_format=json",
		      method: "PATCH",
		      data: JSON.stringify(data),
		      headers: {
		        "X-CSRF-Token": csrfToken,
		        "Accept": "application/json",
		        "Content-Type": "application/json"
		      },
		      success: function(data, status, xhr) {
		      }
		    })

		  }
	})
}
