<?php
namespace Drupal\csis_helpers\Utils;

use \GuzzleHttp\Exception\RequestException;
use Drupal\taxonomy\Entity\Term;

/**
 * Class EmikatHelperFunctions.
 */
class EmikatHelperFunctions {

  // supported types by MessengerInterface are: error, status, warning
  private $result = array(
    "message" => "Emikat notification",
    "type" => "status"
  );

  /**
   * This function checks based on relevant fields whether Emikat should be triggered or not
   * and if recalculation on Emikat-side is necessary.
   *
   * As decided in https://github.com/clarity-h2020/csis-helpers-module/issues/12, it will
   * no longer be possible to change the Study type once it has been selected. Therefore,
   * we don't need to compare current Study type with original Study type anymore.
   *
   * Considered "relevant" are for now the following fields:
   * - Study area
   * - referenced Data package
   * - Study title and goal (but they don't require recalculations in case they are changed)
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   * @return integer status code
   */
  private function checkStudyChanges(\Drupal\Core\Entity\EntityInterface $entity) {

    /*
    status codes:
      0 -> don't trigger Emikat
      1 -> trigger Emikat, recalculation not required
      2 -> trigger Emikat, recalculation required
    */

    $status = 0;

    // if Study was just created it cannot yet have all necessary data since intial form doesn't provide those needed fields
    // likewise don't trigger Emikat if some relevant fields are still missing
    if ($entity->isNew() || $entity->get('field_study_type')->isEmpty() || $entity->get("field_study_goa")->isEmpty() || $entity->get("field_area")->isEmpty() || $entity->field_data_package->isEmpty()) {
      return $status;
    }

    // check relevant fields and set status
    if ($entity->label() != $entity->original->label()) {
      $status = 1;
    }
    else if ($entity->get("field_study_goa")->getString() != $entity->original->get("field_study_goa")->getString()) {
      $status = 1;
    }
    else if ($entity->get("field_area")->getString() != $entity->original->get("field_area")->getString()) {
      $status = 2;
    }

    // since it's a Reference field, check data package field contents before trying to access them
    // (needs to be done everytime since user could potentially remove data package from Study and leave it empty)
    $datapackage = ($entity->field_data_package->isEmpty() ? "empty" : $entity->field_data_package->entity->label());
    $datapackageOrig = ($entity->original->field_data_package->isEmpty() ? "empty" : $entity->original->field_data_package->entity->label());
    if ($datapackage != $datapackageOrig) {
      $status = 2;
    }

    return $status;
  }

  /**
   * Notifies Emikat via Put or Post request about new or updated Study if necessary
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   * @return array with message and status type
   */
  public function triggerEmikat(\Drupal\Core\Entity\EntityInterface $entity) {

    // check whether or not relevant changes have been made in the Study
    $statusCode = $this->checkStudyChanges($entity);

    // Don't notify Emikat if nothing relevant was changed
    if ($statusCode == 0) {
      \Drupal::logger('EmikatHelperFunctions')->info(
        "Emikat not notified because study " . $entity->id() . " is either not fully ready or no relevant fields have changed"
      );
      $this->result['message'] = "Emikat was not notified because study is either not ready or no relevant fields have changed.";
      return $this->result;
    }

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

    // let Emikat know whether the changes in the Study require a recalculation (only used in POST requests, since PUT sends new Studies)
    $forceRecalculate = false;
    if ($statusCode == 2) {
      $forceRecalculate = true;
    }

    // ---------- PUT request with new Study ----------
    if (!$emikatID) {
      //create payload
      $payload = json_encode(
        array(
          "name" => $entity->label() . " | " . $studyID,
          "description" => $description,
          "status" => "AKT",
          "forceRecalculate" => true
        )
      );
      $emikatID = $this->sendPutRequest($payload, $auth, $studyID);
      // store the given ID from Emikat and set calculation status to 1 (= active/ongoing)
      $entity->set("field_emikat_id", $emikatID);
      $entity->set("field_calculation_status", 1);
    }
    // -----------------------------------------------------
    // ---------- POST request with updated Study ----------
    else {
      // emikatID already exists -> current Study needs to be updated via POST
      $payload = json_encode(
        array(
          "name" => $entity->label() . " | " . $studyID,
          "description" => $description,
          "status" => "AKT",
          "forceRecalculate" => $forceRecalculate
        )
      );
      $success = $this->sendPostRequest($payload, $auth, $emikatID);

      if ($success) {
        // set calculation status to 1 (= active/ongoing) if recalculation needed
        if ($forceRecalculate) {
          $entity->set("field_calculation_status", 1);
        }
        // generate status messages for FE and BE
        \Drupal::logger('EmikatHelperFunctions')->notice(
          "Emikat was notified via POST of updates in Study " . $studyID
          . " with Recalculate flag set to: " . var_export($forceRecalculate, true)
        );
        $this->result['message'] = "Emikat was notified of updates in Study with Recalculate flag set to: " . var_export($forceRecalculate, true);
      }
    }

    // return a message that will be shown to admins and developers directly in FE
    return $this->result;
  }


  /**
   * Sends a PUT request to Emikat with a new Study
   *
   * @param [JSON] $payload
   * @return String with Emikat-internal ID of the Study
   */
  private function sendPutRequest($payload, $auth, $studyID) {
    $client = \Drupal::httpClient();
    $emikatID = "";

    try {
      $request = $client->put(
        "https://service.emikat.at/EmiKatTst/api/scenarios",
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
          ),
          'body' => $payload,
        )
      );

      $response = json_decode($request->getBody()->getContents(), true);
      //dump($response);
      $emikatID = $response["id"];
      \Drupal::logger('EmikatHelperFunctions')->notice("Emikat was notified via PUT of new Study " . $studyID);
      $this->result['message'] = "Initial notification of a new Study was sent Emikat.";

    } catch (RequestException $e) {
      // generate error messages for BE and FE
      \Drupal::logger('EmikatHelperFunctions')->error(
        "PUT Request to Emikat returned an error: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      $this->result['message'] = "PUT request to Emikat failed. For more details check recent log messages.";
      $this->result['type'] = "error";
    }

    return $emikatID; // emikatID from Response
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
      $request = $client->post(
        "https://service.emikat.at/EmiKatTst/api/scenarios/" . $emikatID,
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
          ),
          'body' => $payload,
        )
      );

      $response = json_decode($request->getBody()->getContents());

    } catch (RequestException $e) {
      // generate error messages for BE and FE and set $success to false
      \Drupal::logger('EmikatHelperFunctions')->error(
        "POST Request to Emikat returned an error: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      $this->result['message'] = "POST request to Emikat failed. For more details check recent log messages.";
      $this->result['type'] = "error";
      $success = false;
    }

    return $success;
  }

}
