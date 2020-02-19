<?php

namespace Drupal\csis_helpers\Utils;

use \GuzzleHttp\Exception\RequestException;
use Drupal\taxonomy\Entity\Term;
use Drupal\Component\Utility\Html;

/**
 * Class TMHelperFunctions.
 */
class TMHelperFunctions
{

  // supported types by MessengerInterface are: error, status, warning
  private $result = array(
    "message" => "TM notification",
    "type" => "status"
  );

  /**
   * Checks based on relevant fields whether the TM should be triggered or not
   * considered "relevant" are for now the following fields:
   * - Study type
   * - Study title
   * - Study goal
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   * @return integer status code
   */
  private function checkStudyChanges(\Drupal\Core\Entity\EntityInterface $entity)
  {

    /*
    status codes:
      0 -> don't trigger TM
      1 -> trigger TM
    */

    $status = 0;

    // if Study was just created, TM needs to be triggered. Since both title and goal are required fields,
    // all relevant information is available right away
    if ($entity->isNew()) {
      $status = 1;
      return $status;
    }

    // check relevant fields and set status
    if ($entity->label() != $entity->original->label()) {
      $status = 1;
    } else if ($entity->get("field_study_goa")->getString() != $entity->original->get("field_study_goa")->getString()) {
      $status = 1;
    }

    return $status;
  }


  // public function triggerTM(\Drupal\Core\Entity\EntityInterface $entity) {
  //   $csrfToken = $this->getCSRFToken();
  //   return $csrfToken;
  // }

  /**
   * Retrieve a CSRF-Token from the TM module
   *
   * @return String with the CSRF-Token
   */
  private function getCSRFToken() {
    $client = \Drupal::httpClient();
    $csrfToken = "";

    try {
      $request = $client->get(
        "https://clarity.saver.red/api-auth/login/"
      );

      // extract the token from the response headers and strip away unnecessary content
      $cookieHeader = $request->getHeaderLine("Set-Cookie");
      $body = $request->getBody();
      dump($body->getContents());
      $html = Html::load($body->getContents());
      dump($html);
      foreach ($html->getElementsByTagName('input') as $inputElement) {
        dump($inputElement);
      }

      $csrfToken = str_replace("csrftoken=", "", $cookieHeader);
      $csrfToken = strstr($csrfToken, ";", true);

    } catch (RequestException $e) {
      // generate error messages for BE and FE
      \Drupal::logger('TMHelperFunctions')->error(
        "Retrieving CSRF token from TM module returned an error: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      $this->result['message'] = "Retrieving CSRF token from TM module failed. For more details check recent log messages.";
      $this->result['type'] = "error";
    }
    dump($csrfToken);
    return $csrfToken;
  }

  /**
   * Notifies the TM via Put or Post request about new or updated Study if necessary
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   * @return array with message and status type
   */
  public function triggerTM(\Drupal\Core\Entity\EntityInterface $entity)
  {

    // check whether or not relevant changes have been made in the Study
    $statusCode = $this->checkStudyChanges($entity);

    // Don't notify TM if nothing relevant was changed
    if ($statusCode == 0) {
      \Drupal::logger('TMHelperFunctions')->info(
        "TM not notified because study " . $entity->id() . " is either not fully ready or no relevant fields have changed"
      );
      $this->result['message'] = "TM was not notified because study is either not ready or no relevant fields have changed.";
      return $this->result;
    }

    // extract all necessary field information for Request body
    $studyGoal = substr($entity->get("field_study_goa")->getString(), 0, 2000);
    $studyID = $entity->id();
    $externalID = $entity->get("field_emikat_id")->getString();


    // get credentials for Emikat server
    $config = \Drupal::config('csis_helpers.default');
    $auth = array($config->get('emikat_username'), $config->get('emikat_password'));
    // we will need another auth user for the TM

    $payload = json_encode(
      array(
        "name" => $entity->label(),
        "description" => $studyGoal,
        "reference" => $studyID
      )
    );

    // ---------- PUT request with updated Study ----------
    if ($externalID) {
      $this->sendPutRequest($payload, $auth, $externalID, $studyID);
      // store the given ID from the TM and set calculation status to 1 (= active/ongoing)
    }
    // -----------------------------------------------------
    // ---------- POST request with new Study ----------
    else {
      $externalID = $this->sendPostRequest($payload, $auth);
      $entity->set("field_emikat_id", $externalID);

      if ($externalID > 0) {
        // generate status messages for FE and BE
        \Drupal::logger('TMHelperFunctions')->notice(
          "TM was notified via POST of new Study " . $studyID
        );
        $this->result['message'] = "TM was notified of new Study " . $studyID;
      }
    }

    // return a message that will be shown to admins and developers directly in FE
    return $this->result;
  }


  /**
   * Sends a PUT request to TM with updates of a Study
   *
   * @param [JSON] $payload
   * @return String externalID of study stored in the TM
   */
  private function sendPutRequest($payload, $auth, $externalID, $studyID)
  {
    $client = \Drupal::httpClient();

    try {
      $request = $client->put(
        "https://clarity.saver.red/es/simmer/api/study/" . $externalID . "/",
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
            'X-CSRFToken' => 'WE NEED A TOKEN!!!'
          ),
          'body' => $payload,
        )
      );

      $response = json_decode($request->getBody()->getContents(), true);
      \Drupal::logger('TMHelperFunctions')->notice("TM was notified via PUT of of updates in Study " . $studyID);
      $this->result['message'] = "Notification of an update in a Study was sent to the TM.";

    } catch (RequestException $e) {
      // generate error messages for BE and FE
      \Drupal::logger('TMHelperFunctions')->error(
        "PUT Request to the TM returned an error: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      $this->result['message'] = "PUT request to TM failed. For more details check recent log messages.";
      $this->result['type'] = "error";
    }

  }


  /**
   * Sends a POST request to TM with a new Study
   *
   * @param [JSON] $payload
   * @param [array] $auth
   * @return String externalID of study stored in the TM
   */
  private function sendPostRequest($payload, $auth)
  {
    $externalID = 0;
    $client = \Drupal::httpClient();

    try {
      $request = $client->post(
        "https://clarity.saver.red/es/simmer/api/study/",
        array(
          'auth' => $auth,
          'headers' => array(
            'Content-type' => 'application/json',
            'X-CSRFToken' => 'WE NEED A TOKEN!!!'
          ),
          'body' => $payload,
        )
      );

      $response = json_decode($request->getBody()->getContents(), true);
      //dump($response);
      $externalID = $response["id"];

    } catch (RequestException $e) {
      // generate error messages for BE and FE and set $success to false
      \Drupal::logger('TMHelperFunctions')->error(
        "POST Request to TM returned an error: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      $this->result['message'] = "POST request to TM failed. For more details check recent log messages.";
      $this->result['type'] = "error";
      $externalID = -1;
    }

    return $externalID;
  }
}
