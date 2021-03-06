(function ($, Drupal, drupalSettings) {

  $(document).ready(function () {

    if (drupalSettings.csisHelpers === undefined || drupalSettings.csisHelpers.studyInfo === undefined) {
      return;
    }

    var calculationStatus = drupalSettings.csisHelpers.studyInfo.calculation_status;

    // if calculation is active ( == 1) periodically pull the status until calculation is done or has failed
    if (calculationStatus == 2) {
      console.log("pulling calculation status from Emikat.");

      var emikatID = drupalSettings.csisHelpers.studyInfo.study_emikat_id;
      var studyUUID = drupalSettings.csisHelpers.studyInfo.study_uuid;
      getUserEndpoint(emikatID, studyUUID);
    }
    else {
      console.log("calculation not active, so no pulling from Emikat needed.");
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


function getUserEndpoint(emikatID, studyUUID) {
  jQuery.ajax({
    url: "/jsonapi",
    method: "GET",
    success: function (data, status, xhr) {
      var userEndpoint = data.meta.links.me.href;
      getUserCredentials(userEndpoint, emikatID, studyUUID);

    },
    error: function (xhr, textStatus, error) {
      console.log("Error getting user endpoint");
      console.log(xhr.responseText);
    }
  });
}


function getUserCredentials(userEndpoint, emikatID, studyUUID) {
  jQuery.ajax({
    url: userEndpoint,
    method: "GET",
    success: function (data, status, xhr) {
      var authInfo = data.data.attributes.field_basic_auth_credentials;
      pullEmikatStatusReal(authInfo, emikatID, studyUUID);

    },
    error: function (xhr, textStatus, error) {
      console.log("Error getting user credentials");
      console.log(xhr.responseText);
    }
  });
}


// AJAX call to Emikat requesting the status of the current study calculations
function pullEmikatStatusReal(authInfo, emikatID, studyUUID) {
  jQuery.ajax({
    url: "https://service.emikat.at/EmiKatTst/api/scenarios/" + emikatID + "/feature/tab.AD_V_BATCH_IN_QUEUE.1710/table/data?rownum=30&filter=SZM_SZENARIO_REF=" + emikatID +"&sortby=Oid%20DESC",
    method: "GET",
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Authorization': 'Basic '+btoa(authInfo),
    },
    success: function (data, status, xhr) {
      //console.log(data);
      processCalculationStatus(data['rows'], authInfo, emikatID, studyUUID);

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
function processCalculationStatus(batchJobs, authInfo, emikatID, studyUUID) {
  var job;
  var relevantJobs = 0;
  var finishedJobs = 0;
  var errors = 0;
  var relevantJobNames = [
    "Rebuild all views...",
    "Rebuild Table CLY_IMPACT_RESULT_HW#1838",
    "Rebuild Table CLY_HW_T_MRT#1856",
    "Rebuild Table CLY_HW_FLUXES#1856",
    "Rebuild Table CLY_HW_GRID_DETAILS_PROJ#1856",
    "Rebuild Table CLY_HW_GRID_DETAILS#1856",
    "Rebuild Table CLY_URBAN_ATLAS#1776",
    "Rebuild Table CLY_AO_LAYER_PARAMS#1796",
    "Rebuild Table CLY_EUROSTAT_CITIES_MORTALITY#2056",
    "Rebuild Table CLY_EL_POPULATION_INTERPOLATED#2016",
    "Rebuild Table CLY_UA_FRACTION#2016",
    "Rebuild Table CLY_ADAPTATION_OPT_ITEM#1837",
    "Rebuild Table CLY_ADAPTATION_OPTION#1837",
    "Rebuild Table CLY_PROJECT#1837",
    "Rebuild Table CLY_HAZARD_EVENTS_STUDY#2036",
    "Rebuild Table CLY_GRID_ETRS89_1K#1757",
    "Rebuild Table CLY_PARAMETER#1976"
  ];

  for (let i = 0; i < batchJobs.length; i++) {
    job = batchJobs[i];

    jobName = job['values'][1];
    isRelevant = relevantJobNames.includes(jobName);
    if (!isRelevant) {
      // don't use this batch job for calculation status, since it's not relevant
      // this batch jobs might for example only be used temporarilly during development
      continue;
    }

    console.log("JobID: " + job['values'][0] + " with status: " + job['values'][4]);

    relevantJobs++;
    if (job['values'][4] == "OK") {
      finishedJobs++;
    }
    else if (job['values'][4] == "ERR") {
      errors++;
      finishedJobs++; // just a temporary fix for an Emikat problem with the "description field". Remove this line later
    }

    // stop loop here, because all jobs after that one belong to an old calculation
    if (jobName == "Rebuild Table CLY_PARAMETER#1976") {
      break;
    }
  }

  if (errors > 1) { // just a temporary fix for an Emikat problem with the "description field". Set back to 0 later
    printStatus(
      "There have been " + errors + " errors in the calculation process. Please try to adapt your Study settings or contact the site administrators.",
      "messages--error"
    );
    getCsrfToken(function (csrfToken) {
      updateCalcStatusInStudy(csrfToken, studyUUID);
    });
  }
  else if (relevantJobs != finishedJobs) {
    printStatus(
      finishedJobs + " out of " + relevantJobs + " processes have finished. In general calculations take about 10-15 minutes depending on the size of the Study area.",
      "messages--warning"
    );
    setTimeout(function () {
      pullEmikatStatusReal(authInfo, emikatID);
    }, 30000); // repeat request to Emikat after 30 seconds
  }
  else if (relevantJobs == 0) {
    // Study probably just recently sent to Emikat for first time and no batchjobs in yet -> wait and retrigger
    setTimeout(function () {
      pullEmikatStatusReal(authInfo, emikatID);
    }, 30000); // repeat request to Emikat after 30 seconds
  }
  else {
    printStatus(
      "Calculations are completed. You should now be able to see the results in the next steps.",
      "messages--status"
    );
    getCsrfToken(function (csrfToken) {
      updateCalcStatusInStudy(csrfToken, studyUUID);
    });
  }
}


// set the calculation status of the Study to 0 (=inactive/done) if Emikat shows that it's either completed or gave an error
function updateCalcStatusInStudy(csrfToken, studyUUID) {
  postData = {
    'data': {
      'type': 'group--study',
      'id': studyUUID,
      'attributes': {
        'field_calculation_status': {
          'value': 3
        }
      }
    }
  };

  jQuery.ajax({
    url: "/jsonapi/group/study/" + studyUUID,
    method: "PATCH",
    headers: {
      "X-CSRF-Token": csrfToken,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json"
    },
    data: JSON.stringify(postData),
    success: function (data, status, xhr) {
      console.log("Successfully updated the Study calculation status");
    },
    error: function (data, status, xhr) {
      console.log("Error updating the Study calculation status");
      console.log(xhr.responseText);
    }
  });
}


// prints the received MESSAGE into a DIV element with CSS class STATUSCLASS for the users to see
function printStatus(message, statusClass) {

  var msgContainer = document.createElement('div')
  msgContainer.setAttribute("id", "calculation-status")
  msgContainer.setAttribute("class", "messages " + statusClass)
  msgContainer.innerHTML = "<p>" + message + "</p>"

  // check if DIV element with Calculation status already exists (=> overwrite) or otherwise create one
  if (jQuery("#calculation-status").length) {
    jQuery("#calculation-status").replaceWith(msgContainer);
  }
  else {
    jQuery("#block-clarity-content").prepend(msgContainer);
  }
}
