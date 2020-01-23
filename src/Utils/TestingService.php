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
   */
  public function sendTestStudy($data) {
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
  }


  /**
   * Checks the Emikat results for the given test study
   *
   * @param object $data
   * @return void
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
    $warnings += $this->checkBatchjobs($emikatID, $auth);

    // check if the results for the HC local effects table are there
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
   * @return int number of warnings found
   */
  private function checkBatchjobs($emikatID, $auth) {
    $client = \Drupal::httpClient();
    $warnings = 0;
    try {
      $request = $client->get(
        "https://service.emikat.at/EmiKatTst/api/scenarios/" . $emikatID . "/feature/tab.AD_V_BATCH_IN_QUEUE.1710/table/data?rownum=20&filter=SZM_SZENARIO_REF=" . $emikatID . "&sortby=Oid%20DESC",
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
          ),
        )
      );
      $response = json_decode($request->getBody(), true);

      foreach ($response["rows"] as $row) {
        if ($row["values"][4] != "OK") {
          $warnings += 1;
        }
        // for all Groovy batchjobs raise a warning if it returns 0 results
        else if ($row["values"][5] == "Groovy") {
          if ($row["values"][6] == "Result=0") {
            $warnings += 1;
          }
        }

        // break loop once last batchjob of current calculation is reached
        // Note: the title of that batchjob might change in the future!
        if ($row["values"][1] == "Rebuild Table CLY_PARAMETER#1976") {
          break;
        }
      }
      return $warnings;

    } catch (RequestException $e) {
      // generate error messages for BE and FE and set $success to false
      \Drupal::logger('csis_helpers_testing')->error(
        "Automated testing: couldn't get Batchjobs: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      return $warnings + 1;
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
