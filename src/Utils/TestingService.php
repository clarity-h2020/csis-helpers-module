<?php

namespace Drupal\csis_helpers\Utils;

use Drupal\group\Entity\Group;
use \GuzzleHttp\Exception\RequestException;
use Drupal\taxonomy\Entity\Term;

/**
 * TestingService is used to send test studies and check if calculations are available
 */
class TestingService {

  // supported types by Logger (used in BE) are:
  //   - alert, critical, debug, emergency, error, info, log, notice, warning

  /**
   * Send test study to Emikat.
   *
   * @return boolean true if Study update was successfully sent to Emikat, false otherwise
   */
  public function sendTestStudy($data) {

    if (\Drupal::request()->getSchemeAndHttpHost() == "https://csis.myclimateservice.eu") {
      $entity = Group::load($data->gid); // our test study

      // extract all necessary field information for Request body
      $rawArea = $entity->get("field_area")->get(0)->getValue();
      $studyGoal = substr($entity->get("field_study_goa")->getString(), 0, 500);
      $studyID = $entity->id();
      $emikatID = $entity->get("field_emikat_id")->getString();
      $countryCode = $entity->get("field_country")->entity->get("field_country_code")->value;
      $city = null;
      $cityCode = null;
      $cityTerm = (!$entity->get('field_city_region')->isEmpty() ? Term::load($entity->get('field_city_region')->target_id) : false);
      if ($cityTerm) {
        $city = $entity->get("field_city_region")->entity->label();
        $cityCode = $cityTerm->get('field_city_code')->value;
      }

      // get credentials for Emikat server
      $config = \Drupal::config('csis_helpers.default');
      $auth = array($config->get('emikat_username'), $config->get('emikat_password'));

      $baseURL = \Drupal::request()->getSchemeAndHttpHost();
      $studyRestURL = $baseURL . "/rest/emikat/study/" . $studyID;
      $description = $studyGoal .
        " \nCSIS_STUDY_AREA: " . $rawArea['left'] . ", " . $rawArea['bottom'] . ", " . $rawArea['right'] . ", " . $rawArea['top'] .
        " \nCSIS_URL: " . $studyRestURL .
        " \nCSIS_COUNTRY_CODE: " . $countryCode .
        " \nCSIS_CITY: " . $city .
        " \nCSIS_CITY_CODE: " . $cityCode;


      // emikatID already exists -> current Study needs to be updated via POST
      $payload = json_encode(
        array(
          "name" => $entity->label() . " | " . $studyID,
          "description" => $description,
          "status" => "AKT",
          "forceRecalculate" => true
        )
      );
      $success = $this->sendPostRequest($payload, $auth, $emikatID);

      if ($success) {
        $entity->set("field_calculation_status", 1);
        // generate status messages for FE and BE
        \Drupal::logger('csis_helpers_testing')->notice(
          "Automated testing: test Study sent to Emikat for calculations."
        );
        $entity->save();
      }

      return $success;
    }
    else {
      \Drupal::logger('csis_helpers_testing')->notice(
        "Automated testing not active on local or development instances of CSIS."
      );
      return false;
    }

  }


  /**
   * Checks the Emikat results for the given test study
   *
   * @param object $data object containing the Group ID of the test Study
   * @return array $results contains details about the batchjobs and the number of total
   * warnings/errors and time when calculation was started
   */
  public function checkTestResults($data)
  {
    /* what can we check?
    - status of batchjobs (must all be done after 3 hours)
    - call HCLE table and check if content available
    - call EE table and check if content available
    - call RIA table and check if content available
    */
    $warnings = 0;
    $entity = Group::load($data->gid); // our test study
    $emikatID = $entity->get("field_emikat_id")->getString();

    // get credentials for Emikat server
    $config = \Drupal::config('csis_helpers.default');
    $auth = array($config->get('emikat_username'), $config->get('emikat_password'));

    // check available batchjobs for status and number of results
    $results = $this->checkBatchjobs($emikatID, $auth);
    $warnings += $results[1];

    // check if the results for the HC local effects table are there
    // should there be any warnings for the tables, don't add that to the results,
    // since CI testing component can test those tables on its own. We only do this
    // for the internal Drupal logging
    $warnings += $this->checkTables($emikatID, $auth);

    if ($warnings == 0) {
      \Drupal::logger('csis_helpers_testing')->notice(
        "Checks showed no problems for the test study"
      );
    } else {
      \Drupal::logger('csis_helpers_testing')->error(
        "Checks showed " . $warnings . " problem(s) for the test study. Please check Emikat."
      );
    }

    return $results;
  }

  /**
   * Checks Emikat batchjobs to see whether or not calculations for this Study have finished yet
   *
   * @param object $data object containing the Group ID of the test Study
   * @return boolean true if calculations are still running, false otherwise
   */
  public function isCalculationRunning($data)
  {
    $entity = Group::load($data->gid); // our test study
    $emikatID = $entity->get("field_emikat_id")->getString();

    // get credentials for Emikat server
    $config = \Drupal::config('csis_helpers.default');
    $auth = array($config->get('emikat_username'), $config->get('emikat_password'));

    // get available batchjobs and check if any of them is still running or in "INI" state
    $results = $this->checkBatchjobs($emikatID, $auth);

    foreach ($results[0] as $result) {
      if ($result['status'] == "INI" || $result['status'] == "RUN") {
        // some of the batchjobs are not completed yet => calculations for this Study still active
        return true;
      }
    }

    // all batchjobs have finished => calculations are completed for this Study
    return false;
  }

  /**
   * Sends a POST request to Emikat to update an existing Study
   *
   * @param [JSON] $payload
   * @param [array] $auth
   * @param [string] $emikatID
   * @return boolean true if request was successful, false otherwise
   */
  private function sendPostRequest($payload, $auth, $emikatID) {
    $success = true;
    $client = \Drupal::httpClient();

    try {
      $client->post(
        "https://service.emikat.at/EmiKatTst/api/scenarios/" . $emikatID,
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
          ),
          'body' => $payload,
        )
      );
    } catch (RequestException $e) {
      // generate error messages for BE and FE and set $success to false
      \Drupal::logger('csis_helpers_testing')->error(
        "Automated testing: POST Request to Emikat returned an error: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      $success = false;
    }

    return $success;
  }


  /**
   * Checks current batchjobs for the study and their status and number of results
   *
   * @param string $emikatID
   * @param array $auth
   * @return array batchjob details, the number of warnings found and time when calculation started
   */
  private function checkBatchjobs($emikatID, $auth) {
    $client = \Drupal::httpClient();
    $warningsCount = 0;
    $calcStarted = 0;
    $batchjobs = array();
    try {
      $request = $client->get(
        "https://service.emikat.at/EmiKatTst/api/scenarios/" . $emikatID . "/feature/tab.AD_V_BATCH_IN_QUEUE.1710/table/data?rownum=30&filter=SZM_SZENARIO_REF=" . $emikatID . "&sortby=Oid%20DESC",
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
          ),
        )
      );
      $response = json_decode($request->getBody(), true);

      foreach ($response["rows"] as $key => $row) {
        $batchjobs[$key] = array(
          "id" => $row["values"][0],
          "name" => $row["values"][1],
          "status" => $row["values"][4],
          "message" => $row["values"][6],
          "class" => "batchjob-ok"
        );

        if ($row["values"][4] == "ERR") {
          $warningsCount += 1;
          $batchjobs[$key]["class"] = "batchjob-error";
        }
        else if ($row["values"][4] != "OK") {
          $warningsCount += 1;
          $batchjobs[$key]["class"] = "batchjob-warning";
        }
        // for all Groovy batchjobs raise a warning if it returns 0 results
        else if ($row["values"][5] == "Groovy") {
          if ($row["values"][6] == "Result=0") {
            $warningsCount += 1;
            $batchjobs[$key]["class"] = "batchjob-warning";
          }
        }

        // break loop once last batchjob of current calculation is reached
        // Note: the title of that batchjob might change in the future!
        if ($row["values"][1] == "Rebuild Table CLY_PARAMETER#1976") {
          $calcStarted = $row["values"][10];
          break;
        }
      }
      return array ($batchjobs, $warningsCount, $calcStarted);

    } catch (RequestException $e) {
      // generate error messages for BE and FE and set $success to false
      \Drupal::logger('csis_helpers_testing')->error(
        "Automated testing: couldn't get Batchjobs: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      return array ($batchjobs, $warningsCount + 1);
    }
  }


  /**
   * Checks if tables for HCLE, EE and RIA have any results accessible
   *
   * @param string $emikatID
   * @param array $auth
   * @return int number of warnings found
   */
  private function checkTables($emikatID, $auth)
  {
    $client = \Drupal::httpClient();
    $warnings = 0;
    try {
      // check HC Local Effects table
      $request = $client->get(
        "https://service.emikat.at/EmiKatTst/api/scenarios/". $emikatID . "/feature/view.2974/table/data?rownum=1000&filter=STUDY_VARIANT%3D%27BASELINE%27&filter=TIME_PERIOD%3D%2720410101-20701231%27&filter=EMISSIONS_SCENARIO%3D%27rcp45%27&filter=EVENT_FREQUENCY%3D%27Rare%27",
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
          ),
        )
      );
      $response = json_decode($request->getBody(), true);
      // table should always return some rows
      if (count($response["rows"]) == 0) {
        $warnings += 1;
      }

      // check Exposure Evalulation table
      $request = $client->get(
        "https://service.emikat.at/EmiKatTst/api/scenarios/" . $emikatID . "/feature/tab.CLY_EL_POPULATION_INTERPOLATED.2016/table/data?rownum=1000",
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
          ),
        )
      );
      $response = json_decode($request->getBody(), true);
      // table should always return some rows
      if (count($response["rows"]) == 0) {
        $warnings += 1;
      }

      // check Risk & Impact Analysis table
      $request = $client->get(
        "https://service.emikat.at/EmiKatTst/api/scenarios/" . $emikatID . "/feature/view.2975/table/data?rownum=1000&filter=STUDY_VARIANT%3D%27BASELINE%27&filter=TIME_PERIOD%3D%27Baseline%27&filter=EMISSIONS_SCENARIO%3D%27Baseline%27&filter=EVENT_FREQUENCY%3D%27Rare%27",
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
          ),
        )
      );
      $response = json_decode($request->getBody(), true);
      // table should always return some rows
      if (count($response["rows"]) == 0) {
        $warnings += 1;
      }

      return $warnings;

    } catch (RequestException $e) {
      // generate error messages for BE and FE and set $success to false
      \Drupal::logger('csis_helpers_testing')->error(
        "Automated testing: couldn't get table: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      return $warnings + 1;
    }
  }

}
