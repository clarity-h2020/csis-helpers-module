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
   * Checks based on relevant fields whether Emikat should be triggered or not
   * and if recalculation on Emikat-side is necessary
   * considered "relevant" are for now the following fields:
   * - Study area
   * - referenced Data package
   * - Study title and goal (but they don't require recalculations in case they are changed)
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   * @return integer status code
   */
  private function checkStudyChanges(\Drupal\Core\Entity\EntityInterface $entity) {
    /*Todo: implement following workflow
    - if calcMethod does not contain "emikat":
      - if origCalcMethod contains "emikat" --> immediately return status = 3 (Study no longer active in Emikat)
      - else --> immediately return status = 0, since Study was/is not relevant for Emikat
    - else:
      - if calcMethod != origCalcMethod:
        - if origCalcMethod contains "emikat" --> set status = 2, since calculations need to be completed again
        - else --> potentially trigger initial PUT request
      - else --> do nothing since calcMethod didn't change

      Questions: would it be better to first check if studytype has changed?
    */

    $studyTypeTerm = Term::load($entity->get('field_study_type')->target_id);
    //dump($studyTypeTerm);
    $calcMethodTerms = $studyTypeTerm->get('field_study_calculation')->referencedEntities();
    //dump($calcMethodTerms);
    foreach ($calcMethodTerms as $calcMethodTerm) {
      $calcMethodID = $calcMethodTerm->get("field_calculation_method_id")->value;
      //dump($calcMethodID);
    }


    /*
      status codes:
      0 -> don't trigger Emikat
      1 -> trigger Emikat, recalculation not required
      2 -> trigger Emikat, recalculation required
      3 -> trigger Emikat, set Study to non-active since StudyType no longer compatible with Emikat
    */
    $status = 0;

    // if Study was just created it cannot yet have all necessary data since intial form doesn't provide those needed fields
    // likewise don't trigger Emikat if some relevant fields are still missing
    if ($entity->isNew() || $entity->get('field_study_type')->isEmpty() || $entity->get("field_study_goa")->isEmpty() || $entity->get("field_area")->isEmpty() || $entity->field_data_package->isEmpty()) {
      return $status;
    }

    $studyType = Term::load($entity->get('field_study_type')->target_id);

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

    // since it's a Reference field, check datapackage field contents before trying to access them
    // (needs to be done everytime since user could potentially remove datapackage from Study and leave it empty)
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
    $city = $entity->get("field_city_region")->entity->label();

    // get credentials for Emikat server
    $config = \Drupal::config('csis_helpers.default');
    $auth = array($config->get('emikat_username'), $config->get('emikat_password'));

    $baseURL = \Drupal::request()->getSchemeAndHttpHost();
    $studyRestURL = $baseURL . "/rest/emikat/study/" . $studyID;
    $description = $studyGoal .
      " \nCSIS_STUDY_AREA: " . $rawArea['left'] . ", " . $rawArea['bottom'] . ", " . $rawArea['right'] . ", " . $rawArea['top'] .
      " \nCSIS_URL: " . $studyRestURL .
      " \nCSIS_COUNTRY_CODE: " . $countryCode .
      " \nCSIS_CITY: " . $city;

    // let Emikat know whether the changes in the Study require a recalculation (only needed in POST request)
    $forceRecalculate = false;
    if ($statusCode == 2) {
      $forceRecalculate = true;
    }

    // if no emikatID -> Study not yet existant in Emikat -> send new Study via PUT (otherwise update existing one via POST)
    if (!$emikatID) {
      //create payload
      $payload = json_encode(
        array(
          "name" => $entity->label() . " | " . $studyID,
          "description" => $description,
          "status" => "AKT"
        )
      );
      $emikatID = $this->sendPutRequest($payload, $auth);
      //$emikatID = 1234;
      // store the given ID from Emikat
      $entity->set("field_emikat_id", $emikatID);
    }
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
      $this->sendPostRequest($payload, $auth, $emikatID);
    }

    return $this->result;
  }


  /**
   * Sends a PUT request to Emikat with a new Study
   *
   * @param [JSON] $payload
   * @return String with Emikat-internal ID of the Study
   */
  private function sendPutRequest($payload, $auth) {
    $client = \Drupal::httpClient();
    $emikatID = "";

    try {
      $request = $client->put(
        "https://service.emikat.at/EmiKatTst/api/scenarios",
        array(
          'auth' => ['username', 'password'],
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
      $this->result['message'] = "Emikat was notified for the first time of new Study.";
    } catch (RequestException $e) {
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
   * @return boolean true if request returned no error, false otherwise
   */
  private function sendPostRequest($payload, $auth, $emikatID) {
    $success = true;
    $client = \Drupal::httpClient();

    try {
      $request = $client->post(
        "https://service.emikat.at/EmiKatTst/api/scenarios/" . $emikatID,
        array(
          ['username', 'password'],
          'headers' => array(
            'Content-type' => 'application/json',
          ),
          'body' => $payload,
        )
      );

      $response = json_decode($request->getBody()->getContents());

    } catch (RequestException $e) {
      \Drupal::logger('EmikatHelperFunctions')->error(
        "Post Request to Emikat returned an error: %error",
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
