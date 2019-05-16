(function($, Drupal, drupalSettings) {

  Drupal.behaviors.update_step_relations = {
    attach: function (context, settings) {
/*    
  	  // not needed currently since we managed to split the table into two parts (included and non-included with the respective buttons)
      // get all twins which are already included in the GL-Step and change the button to perform a DELETE	
      $('.twins-map-attachment', context).once('update_step_relations_init_buttons').each(function(event) {
    	  console.log("initializing buttons for Twin-actions")
  	      initializeButtons(drupalSettings.csisHelpers.entityinfo.step_uuid);
	  });	
*/  

      // if user clicks the action button, either POST or DELETE the relation between Twin and GL-Step
      $('.update-step-relations', context).once('update_step_relations').on('click', function(event) {
    	  var targetType = $(this).attr('data-type');
    	  var stepUUID = drupalSettings.csisHelpers.entityinfo.step_uuid;
    	  var action = $(this).attr('data-action');
    	  
    	  if (action == "post") {
    		  console.log("adding " + targetType + "-relation to/from GL-Step");
    	  }
    	  else {
    		  console.log("removing " + targetType + "-relation to/from GL-Step");
    	  }
    	  
    	  // deactivate other buttons, so that only one AJAX request is being handled at a time (prevent problems with interferences)
    	  $('span.update-step-relations').attr('disabled', 'disabled');

    	  // only necessary if this functionality will be used for other content types as well
    	  if (targetType == "twin" || targetType == "showcase") {
	    	  var elUUID = $(this).attr('data-uuid');
	    	  var elID = $(this).attr('data-camera-target');
	    	  console.log("GL-step UUID: " + stepUUID);
	    	  console.log("Twin UUID: " + elUUID);
	    	  
	    	  // create payload with step-relation  (type -> node type, id -> node UUID)
	    	  var postData = {'data':[{'type': 'node--'+targetType, 'id': elUUID}]};
	    		  
	    	  getCsrfToken(function (csrfToken) {
	    		  updateRelationForStep(csrfToken, action, stepUUID, elUUID, postData);
	    	  }); 
	    	  
	    	  // remove Twin-Div if in Summary-tab
	    	  if (action == "delete") {
	    		  $('div[data-history-node-id="'+elID+'"]').remove();
	    	  }
	    	  
	    	  // replace button with css loading-animation
	    	  $(this).hide();
              $(this).after('<div class="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>');	    	  	    	  
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

//update (add or remove) a relationship between a GL-Step and a Twin/Showcase
function updateRelationForStep(csrfToken, action, stepUUID, twinUUID, postData) {
	jQuery.ajax({
		  url: "/jsonapi/node/gl_step/" + stepUUID + "/relationships/field_included_twins",
		  method: action.toUpperCase(),
		  headers: {
			"X-CSRF-Token": csrfToken,
		    "Content-Type": "application/vnd.api+json",
		    "Accept": "application/vnd.api+json"
		  },
		  data: JSON.stringify(postData),
		  success: function(data, status, xhr) {
			  //console.log(data);
			  //console.log(status);
			  //console.log(xhr);
			  console.log("successfully updated relationship for GL-Step");
			  
			  // if element in "Available-Table", it needs to be removed manually, since View is not auto-updated (due to otherwise lost filter options)
			  if (action == "post") {
			      jQuery('span[data-uuid="'+twinUUID+'"]').closest('tr').remove();
			  }
			  // once AJAX-request is done re-activate buttons
			  jQuery('span.update-step-relations').removeAttr("disabled");
			  updateView();   
		  }
	});
}

// will be necessary for refreshing tables after Twin/Showcase has been added/removed from a Study
function updateView() {
    var instances = Drupal.views.instances;
    var myViews;

    jQuery.each( instances , function getInstance( index, element){
        if (element.settings.view_display_id == "included_twins" || element.settings.view_display_id == "included_twins_ajax"){
        	myViews = element.element_settings.selector;
        	jQuery(myViews).triggerHandler('RefreshView');
        	console.log("view refreshed");
        }

    });
    //jQuery('form#views-exposed-form-twins-block-1').submit();
    //console.log("form submitted");
}

// probably this is not needed anymore, since solved using two separate View attachments
function initializeButtons(stepUUID) {
	jQuery.ajax({
		  url: "/jsonapi/node/gl_step/" + stepUUID + "/relationships/field_included_twins",
		  method: "GET",
		  headers: {
		    "Content-Type": "application/vnd.api+json",
		    "Accept": "application/vnd.api+json"
		  },
		  success: function(data) {  
			  // for each found Twin change the Button to do a DELETE request (since by default they perform a POST)
	          for (var index in data.data) {        	  	        	
	        	  jQuery('span[data-uuid="'+data.data[index]['id']+'"]').attr('data-action', 'delete').text('Remove from Report');
	          }
	          
	          jQuery('span.update-step-relations').removeAttr("disabled");
	          console.log("done initializing");
		  }
	});
}
