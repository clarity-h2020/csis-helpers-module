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
   * - Study title
   * - Study goal
   * - Country (needed to define the Simulation type)
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

    // if Study was just created, don't trigger TM because not all necessary fields can be set yet
    if ($entity->isNew() || !isset($entity->original) || $entity->get("field_study_goa")->isEmpty() || $entity->field_country->isEmpty()) {
      $status = 0;
      return $status;
    }

    // check relevant fields and set status
    if ($entity->label() != $entity->original->label()) {
      $status = 1;
    }
    else if ($entity->get("field_study_goa")->getString() != $entity->original->get("field_study_goa")->getString()) {
      $status = 1;
    }

    // since it's a Reference field, check data package field contents before trying to access them
    // (needs to be done everytime since user could potentially remove data package from Study and leave it empty)
    $country = ($entity->field_country->isEmpty() ? "empty" : $entity->field_country->entity->label());
    $countryOrig = ($entity->original->field_country->isEmpty() ? "empty" : $entity->original->field_country->entity->label());
    if ($country != $countryOrig) {
      $status = 1;
    }

    return $status;
  }

  /**
   * Retrieve a CSRF-Token from the TM module
   *
   * @return String with the CSRF-Token
   */
  private function getAuthToken($auth)
  {
    $client = \Drupal::httpClient();
    $authToken = null;

    $payload = json_encode(
      array(
        "username" => $auth[0],
        "password" => $auth[1]
      )
    );

    try {
      $request = $client->post(
        "https://clarity.saver.red/api-token-auth/",
        array(
          'headers' => array(
            'Content-type' => 'application/json'
          ),
          'body' => $payload,
        )
      );

      $response = json_decode($request->getBody()->getContents(), true);
      $authToken = $response["token"];
    } catch (RequestException $e) {
      // generate error messages for BE and FE
      \Drupal::logger('TMHelperFunctions')->error(
        "Couldn't get Token from TM API: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      $this->result['message'] = "Error while trying to get a token from TM API. Check Drupal logs for details.";
      $this->result['type'] = "error";
    }
    return $authToken;
  }

  /**
   * Notifies the TM via PATCH or POST request about new or updated Study if necessary
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   * @return array with message and status type
   */
  public function triggerTM(\Drupal\Core\Entity\EntityInterface $entity)
  {
    // get credentials for TM app server
    $config = \Drupal::config('csis_helpers.default');
    $auth = array($config->get('tm_username'), $config->get('tm_password'));

    $authToken = $this->getAuthToken($auth);

    if ($authToken) {
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
      $users = array();
      $country = $entity->get("field_country")->entity->get("name")->value;
      $simulationType = 118;

      if ($country != "Spain") {
        $simulationType = 158;
      }

      // get usernames from the Groupmembers, so that they will be granted access inside the TM
      $members = $entity->getMembers();

      foreach ($members as $member) {
        $account = $member->getUser(); // get userAccount
        $user = \Drupal\user\Entity\User::load($account->id());
        if ($user->hasRole("administrator")) {
          // ATM admins are not part of the SSO, so the TM doesn't recognize these users and gives an error when trying
          // to create a simulation with these users included
          continue;
        }
        $name = $account->getUsername();
        array_push($users, $name);
      }

      // simulation type has to be set according to the specifications of the TM API
      // and will be for Clarity 118, as long as there is just one TM relevant Study type
      $payload = json_encode(
        array(
          "name" => $entity->label(),
          "description" => $studyGoal,
          "simulationtype" => $simulationType,
          "reference" => $studyID,
          "users" => $users
        )
      );

      // ---------- PATCH request with updated Study ----------
      if ($externalID) {
        $this->sendPatchRequest($authToken, $payload, $externalID, $studyID);
      }
      // -----------------------------------------------------
      // ---------- POST request with new Study ----------
      else {
        $externalID = $this->sendPostRequest($authToken, $payload);

        if ($externalID >= 0) {
          $entity->set("field_emikat_id", $externalID);
          // generate status messages for FE and BE
          \Drupal::logger('TMHelperFunctions')->notice(
            "TM was notified via POST of new Study " . $studyID
          );
          $this->result['message'] = "TM was notified of new Study " . $studyID;
        }
      }
    }

    // return a message that will be shown to admins and developers directly in FE
    return $this->result;
  }


  /**
   * Sends a PATCH request to TM with updates of a Study
   *
   * @param [JSON] $payload
   * @return String externalID of study stored in the TM
   */
  private function sendPatchRequest($authToken, $payload, $externalID, $studyID)
  {
    $client = \Drupal::httpClient();

    try {
      $request = $client->patch(
        "https://clarity.saver.red/es/simmer/api/study/" . $externalID . "/",
        array(
          'headers' => array(
            'Authorization' => 'Token ' . $authToken,
            'Content-type' => 'application/json'
          ),
          'body' => $payload,
        )
      );

      $response = json_decode($request->getBody()->getContents(), true);
      \Drupal::logger('TMHelperFunctions')->notice("TM was notified via PATCH of updates in Study " . $studyID);
      $this->result['message'] = "Notification of an update in a Study was sent to the TM.";
    } catch (RequestException $e) {
      // generate error messages for BE and FE
      \Drupal::logger('TMHelperFunctions')->error(
        "PATCH Request to the TM returned an error: %error",
        array(
          '%error' => $e->getMessage(),
        )
      );
      $this->result['message'] = "PATCH request to TM failed. For more details check recent log messages.";
      $this->result['type'] = "error";
    }
  }


  /**
   * Sends a POST request to TM with a new Study
   *
   * @param [JSON] $payload
   * @return String externalID of study stored in the TM
   */
  private function sendPostRequest($authToken, $payload)
  {
    $externalID = -1;
    $client = \Drupal::httpClient();

    try {
      $request = $client->post(
        "https://clarity.saver.red/es/simmer/api/study/",
        array(
          'headers' => array(
            'Authorization' => 'Token ' . $authToken,
            'Content-type' => 'application/json'
          ),
          'body' => $payload,
        )
      );

      $response = json_decode($request->getBody()->getContents(), true);
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
    }

    return $externalID;
  }
}
