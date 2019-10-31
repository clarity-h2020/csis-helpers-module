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
      processCalculationStatus(data['rows'], authInfo, emikatID);

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
function processCalculationStatus(batchJobs, authInfo, emikatID) {
  var job;
  var relevantJobs = 0;
  var finishedJobs = 0;
  var errors = 0;

  for (let i = 0; i < batchJobs.length; i++) {
    job = batchJobs[i];
    console.log("JobID: " + job['values'][0] + " with status: " + job['values'][4]);

    relevantJobs++;
    if (job['values'][4] == "OK") {
      finishedJobs++;
    }
    else if (job['values'][4] == "ERR") {
      errors++;
    }

    // stop loop here, because all jobs after that one belong to an old calculation
    if (job[1] == "Rebuild Table CLY_PARAMETER#1976") {
      break;
    }
  }

  if (errors > 0) {
    printStatus("There have been " + errors + " errors in the calculation process. Please try to adapt your Study settings or contact the site administrators.")
    // TODO: set field_calculation_status of the Study via JSONAPI to 0
  }
  else if (relevantJobs != finishedJobs) {
    printStatus("Calculations are still ongoing. In general this process takes about 10-15 minutes depending on the size of the Study area.");
    setTimeout(function () {
      pullEmikatStatusReal(authInfo, emikatID);
    }, 10000); // repeat request to Emikat after 10 seconds
  }
  else {
    printStatus("Calculations are completed. You should now be able to see the results in the next steps.");
    // TODO: set field_calculation_status of the Study via JSONAPI to 0
  }
}

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
