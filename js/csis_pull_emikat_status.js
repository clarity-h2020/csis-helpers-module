(function ($, Drupal, drupalSettings) {

  $(document).ready(function () {
    console.log("in the emikat status puller...");

    if (drupalSettings.csisHelpers === undefined) {
      return;
    }

    var calculationStatus = drupalSettings.csisHelpers.studyInfo.calculation_status;

    if (calculationStatus == 1) {

      var emikatID = drupalSettings.csisHelpers.studyInfo.study_emikat_id;
      getUserEndpoint(emikatID);
      // periodically ask for the Emikat status via ajax call if calcStat == 1 (1 meaning it's running)
      //console.log("calculation is active, so pull status from Emikat");
      //setTimeout(pullEmikatStatusReal(emikatID), 5000);
    }
    else {
      console.log("calculation not active, so no action needed");
    }

  });

})(jQuery, Drupal, drupalSettings);


function getUserEndpoint(emikatID) {
  jQuery.ajax({
    url: "/jsonapi",
    method: "GET",
    success: function (data, status, xhr) {
      var userEndpoint = data.meta.links.me.href;
      getUserCredentials(userEndpoint, emikatID);

    },
    error: function (xhr, textStatus, error) {
      console.log("Error getting user endpoint");
      console.log(xhr.responseText);
    }
  });
}

function getUserCredentials(userEndpoint, emikatID) {
  jQuery.ajax({
    url: userEndpoint,
    method: "GET",
    success: function (data, status, xhr) {
      var authInfo = data.data.attributes.field_basic_auth_credentials;
      pullEmikatStatusReal(authInfo, emikatID);

    },
    error: function (xhr, textStatus, error) {
      console.log("Error getting user credentials");
      console.log(xhr.responseText);
    }
  });
}

// AJAX Call to Emikat about the status of the current study calculations
function pullEmikatStatusReal(authInfo, emikatID) {
  jQuery.ajax({
    url: "https://service.emikat.at/EmiKatTst/api/scenarios/" + emikatID + "/feature/tab.AD_V_BATCH_IN_QUEUE.1710/table/data?rownum=20&filter=SZM_SZENARIO_REF=" + emikatID +"&sortby=OBJECT_ID=DESC",
    method: "GET",
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Authorization': 'Basic '+btoa(authInfo),
    },
    success: function (data, status, xhr) {
      console.log(data);
      processCalculationStatus(data['rows']);

    },
    error: function (xhr, textStatus, error) {
      console.log("Error getting calculation status from Emikat:");
      console.log(xhr);
      console.log(textStatus);
      console.log(error);
    }
  });
}

// analyze returned batchjobs and create appropriate message for user
function processCalculationStatus(batchJobs) {
  batchJobs.forEach(function (job, index) {
    console.log("JobID: " + job['values'][0] + " with status: " + job['values'][4]);
  });
}

// function pullEmikatStatus() {
//   var responseStatus = 0
//   jQuery
//     .get(Drupal.url('rest-test'))
//     .done(function (data) {
//       responseStatus = data[0].status;
//       console.log(responseStatus);

//       // calculation still running
//       if (responseStatus == 0) {
//         console.log("calculation not done, triggering again...");
//         printStatus("running...");
//         setTimeout(pullEmikatStatus, 2000); // you could choose not to continue on failure...
//       }
//       // calculation returned an error
//       else if (responseStatus == 1) {
//         console.log("calculation returned an error");
//         printStatus("error");
//         //TODO: now set via REST the field_calculation_status to 0 (zero meaning it's not runnig)
//       }
//       // calculation finished successfully
//       else {
//         console.log("calculation finished successfully!");
//         printStatus("success");
//         //TODO: now set via REST the field_calculation_status to 0 (zero meaning it's not runnig)
//       }
//     });
// }

// prints the received status into a DIV element for the users to see
function printStatus(message) {

  var msgContainer = document.createElement('div')
  msgContainer.setAttribute("id", "calculation-status")
  msgContainer.setAttribute("class", "messages messages--status")
  msgContainer.innerHTML = "<p>" + message + "</p>"

  // check if DIV element with Calculation status already exists (=> overwrite) or otherwise create one
  if (jQuery("#calculation-status").length) {
    jQuery("#calculation-status").replaceWith(msgContainer);
  }
  else {
    jQuery("#block-clarity-content").prepend(msgContainer);
  }
}
