<?php
namespace Drupal\csis_helpers\Utils;

use \GuzzleHttp\Exception\RequestException;

/**
 * Class EmikatHelperFunctions.
 */
class EmikatHelperFunctions {

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
  public function checkStudyChanges(\Drupal\Core\Entity\EntityInterface $entity) {
    /*
      status codes:
      0 -> don't trigger Emikat
      1 -> trigger Emikat, recalculation not required
      2- > trigger Emikat, recalculation required
    */
    $status = 0;

    // if Study was just created it cannot yet have all necessary data since intial form doesn't provide those needed fields
    // likewise don't trigger Emikat if some relevant fields are still missing
    if ($entity->isNew() || $entity->get("field_study_goa")->isEmpty() || $entity->get("field_area")->isEmpty() || $entity->field_data_package->isEmpty()) {
      // \Drupal::logger('EmikatHelperFunctions')->notice(
      //   "Emikat not notified because study either new or not all relevant fields are set"
      // );
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
   * Notifies Emikat via Put or Post request about new or updated Study
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   * @return true if Request was succesfull, otherwise false
   */
  public function triggerEmikat(\Drupal\Core\Entity\EntityInterface $entity, $statusCode) {
    $rawArea = $entity->get("field_area")->get(0)->getValue();
    $studyGoal = substr($entity->get("field_study_goa")->getString(), 0, 500);
    $studyID = $entity->id();
    $emikatID = $entity->get("field_emikat_id")->getString();
    $countryCode = $entity->get("field_country")->entity->get("field_country_code")->value;
    $city = $entity->get("field_city_region")->entity->label();

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
      $emikatID = $this-> sendPutRequest($payload, $auth);
      \Drupal::logger('EmikatHelperFunctions')->notice("Emikat was notified via PUT of new Study " . $studyID);
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
      \Drupal::logger('EmikatHelperFunctions')->notice("Emikat was notified via POST of updated Study " . $studyID);
    }

    return $emikatID;
  }


  /**
   * Sends a Put request to Emikat with a new Study
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
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
          ),
          'body' => $payload,
        )
      );

      $response = json_decode($request->getBody()->getContents(), true);
      //kint($response);
      $emikatID = $response["id"];
    } catch (RequestException $e) {
      \Drupal::logger('EmikatHelperFunctions')->error(
        "Request to Emikat returned an error: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
    }

    return $emikatID; // emikatID from Response
  }


  /**
   * Sends a Post request to Emikat to update an existing Study
   *
   * @param [JSON] $payload
   * @param [String] $emikatID
   * @return void
   */
  private function sendPostRequest($payload, $auth, $emikatID) {
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
      //kint($response);
    } catch (RequestException $e) {
      \Drupal::logger('EmikatHelperFunctions')->error(
        "Post Request to Emikat returned an error: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
    }
  }

}
