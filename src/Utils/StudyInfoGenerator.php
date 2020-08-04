<?php
namespace Drupal\csis_helpers\Utils;

use Drupal\taxonomy\Entity\Term;
use Drupal\group\Entity\GroupContent;
use Drupal\paragraphs\Entity\Paragraph;

/**
 * Class StudyInfoGenerator.
 */
class StudyInfoGenerator {

  /**
   * Extract information from STUDY's GL_STEP **node** entity.
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   * @return array with Study informations
   */
  public function generateStudyInfoNode(\Drupal\Core\Entity\EntityInterface $entity) {
    $groupid = array();
    $groupuuid = array();
    $groupEmikatID = null;
    $datapackageUUID = null;
    $groupArea = null;
    $groupName = null;
    $groupEeaName = null;
    $groupCityCode = null;
    $calculationStatus = null;
    $relations = GroupContent::loadByEntity($entity);
    $studyPreset = array();
    $studyPresets = array(); // stores ONLY 1 preset, will be replaced by $studyScenarios
    $studyScenarios = array(); // replacing $studyPresets in the future
    $adaptedScenario = False; // declares whether or not an Adaptation Strategy has been defined by the user
    $stepName = null;

    // write-permissions inside a Study need to be checked upon a group-member level and not on user level
    $userAccount = \Drupal::currentUser();
    $user = \Drupal\user\Entity\User::load($userAccount->id());
    $has_user_special_roles = false;
    $isAnonymous = true;
    $isMember = false;

    if (!$userAccount->isAnonymous()) {
      $isAnonymous = false;
    }

    foreach ($relations as $relation) {
      $groupid[] = $relation->getGroup()->id();
      $groupuuid[] = $relation->getGroup()->uuid();
      $groupEmikatID = $relation->getGroup()->get('field_emikat_id')->value;
      $groupEmikatID = empty($groupEmikatID) ? -1 : intval($groupEmikatID);
      $calculationStatus = $relation->getGroup()->get('field_calculation_status')->value;
      $groupName = $relation->getGroup()->get('field_name')->value;
      $groupDatapackageID = $relation->getGroup()->get('field_data_package')->target_id;
      $groupArea = $relation->getGroup()->get('field_area')->value;
      $groupCityTerm = (!$relation->getGroup()->get('field_city_region')->isEmpty() ? Term::load($relation->getGroup()->get('field_city_region')->target_id) : false);

      $member = $relation->getGroup()->getMember($userAccount);
      if ($member) {
        $isMember = true;
        $memberRoles = $member->getRoles();
        foreach ($memberRoles as $role) {
          // GL-steps should be writable for owners and team members, but not observers
          if ($role->id() == "study-owner" || $role->id() == "study-team") {
            $has_user_special_roles = true;
            break;
          }
        }
      }

      // bypass member roles permissions for admins
      if ($user->hasRole("administrator")) {
        $has_user_special_roles = true;
        $isMember = true;
      }

      // get Study presets (combination of time-period, emission scenario and event frequency) from Paragraph reference
      foreach ($relation->getGroup()->get('field_study_presets') as $paraReference) {
        $paragraph = Paragraph::load($paraReference->target_id);

        if ($paragraph && $paragraph->getType() == "variable_set") {
          // load all the necessary taxonomy terms
          $termEmScenario = Term::load($paragraph->get('field_emission_scenario')->target_id);
          $termEventFreq = Term::load($paragraph->get('field_event_frequency')->target_id);
          $termTimePeriod = Term::load($paragraph->get('field_time_period')->target_id);
          //$termStudyVariant = Term::load($paragraph->get('field_study_variant')->target_id);

          if (!$termTimePeriod || !$termEmScenario || !$termEventFreq) {
            // although in the Study preset (aka Study scenario) all fields are required
            // and therefore must exist if the paragraph exists, it could happen that
            // the related taxonomy term has been removed from the system
            // -> in such a case break for-loop and don't add an incomplete preset
            // should be resolved once Drupal introduces a possiblity to unpublish taxonomy terms
            break;
          }

          // extract preset label and all needed values from those terms
          $studyPreset['label'] = $paragraph->get('field_label')->value;
          $studyPreset['time_period'] = $termTimePeriod->get('field_var_meaning')->value;
          $studyPreset['emission_scenario'] = $termEmScenario->get('field_var_meaning')->value;
          $studyPreset['event_frequency'] = $termEventFreq->get('field_var_meaning')->value;
          //$studyPreset['study_variant'] = $termStudyVariant->get('field_var_meaning')->value;

          array_push($studyScenarios, $studyPreset);

          // this can later be removed, once we switch to the $studyScenarios object
          $studyPresets['time_period'] = $termTimePeriod->get('field_var_meaning')->value;
          $studyPresets['emission_scenario'] = $termEmScenario->get('field_var_meaning')->value;
          $studyPresets['event_frequency'] = $termEventFreq->get('field_var_meaning')->value;
          //$studyPresets['study_variant'] = $termStudyVariant->get('field_var_meaning')->value;
        }
      }

      $activeScenario = $relation->getGroup()->get('field_active_scenario')->value;
      if ($activeScenario) {
        $paragraph = Paragraph::load($activeScenario);
        $termEmScenario = Term::load($paragraph->get('field_emission_scenario')->target_id);
        $termEventFreq = Term::load($paragraph->get('field_event_frequency')->target_id);
        $termTimePeriod = Term::load($paragraph->get('field_time_period')->target_id);
        //$termStudyVariant = Term::load($paragraph->get('field_study_variant')->target_id);
        $studyPresets['time_period'] = $termTimePeriod->get('field_var_meaning')->value;
        $studyPresets['emission_scenario'] = $termEmScenario->get('field_var_meaning')->value;
        $studyPresets['event_frequency'] = $termEventFreq->get('field_var_meaning')->value;
        //$studyPresets['study_variant'] = $termStudyVariant->get('field_var_meaning')->value;
      }

      // check if Study has an Adaptation Project (ap) set
      $ap = $relation->getGroup()->getContentEntities("group_node:adaptation_project");
      if ($ap) {
        $adaptedScenario = True;
      }

      $euTerm = (!$entity->get('field_field_eu_gl_methodology')->isEmpty() ? Term::load($entity->get('field_field_eu_gl_methodology')->target_id) : false);
      if ($euTerm) {
        $termID = $euTerm->get('field_eu_gl_taxonomy_id')->value;
        switch ($termID) {
          case "eu-gl:hazard-characterization":
            $stepName = "hazard";
            break;
          case "eu-gl:hazard-characterization:local-effects":
            $stepName = "hazard_local";
            break;
          case "eu-gl:exposure-evaluation":
            $stepName = "exposition";
            break;
          case "eu-gl:vulnerability-analysis":
            $stepName = "vulnerability";
            break;
          case "eu-gl:risk-and-impact-assessment":
            $stepName = "risk";
            break;
          case "eu-gl:adaptation-options:identification":
            $stepName = "adaptation_identification";
            break;
          case "eu-gl:adaptation-options:appraisal":
            $stepName = "adaptation_appraisal";
            break;
          case "eu-gl:adaptation-action-plans:implementation":
            $stepName = "adaptation_implementation";
            break;
          default:
            $stepName = "unknown_EU_GL_ID";
        }
      }

      if ($groupDatapackageID) {
        $datapackageNode = \Drupal\node\Entity\Node::load($groupDatapackageID);
        $datapackageUUID = $datapackageNode->uuid();
      }

      if ($groupCityTerm) {
        $groupEeaName = $groupCityTerm->get('field_eea_city_profile_name')->value;
        $groupCityCode = $groupCityTerm->get('field_city_code')->value;
      }
    }

    $studyEntityInfo = array(
      'name' => $groupName,
      'step' => $entity->id(),
      'step_uuid' => $entity->uuid(),
      'step_name' => $stepName,
      'study' => (empty($groupid) ? -1 : $groupid[0]), //deprecated -> use  entitiyinfo.study.id
      'study_uuid' => (empty($groupuuid) ? -1 : $groupuuid[0]), //deprecated -> use  entitiyinfo.study.uuid
      'id' => (empty($groupid) ? -1 : $groupid[0]), //overwrites $entityinfo.id from csis_helpers_node_entity_info
      'uuid' => (empty($groupuuid) ? -1 : $groupuuid[0]), //overwrites $entityinfo.uuid from csis_helpers_node_entity_info
      'study_emikat_id' => $groupEmikatID,
      'calculation_status' => $calculationStatus,
      'study_datapackage_uuid' => $datapackageUUID,
      'study_area' => $groupArea,
      'eea_city_name' => $groupEeaName,
      'city_code' => $groupCityCode,
      'study_presets' => $studyPresets,
      'study_scenarios' => $studyScenarios,
      'has_adapted_scenario' => $adaptedScenario,
      'is_anonymous' => $isAnonymous,
      'is_member' => $isMember,
      'write_permissions' => ($has_user_special_roles ? 1 : 0),
    );
    return $studyEntityInfo;
  }

  /**
   * sets for each Study group the $entityInfo variable
   * Extract information from STUDY **GROUP** entity.
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   * @return array with Study informations
   */
  public function generateStudyInfoGroup(\Drupal\Core\Entity\EntityInterface $entity) {
    $datapackageUUID = null;
    $eeaName = null;
    $cityCode = null;
    $studyPreset = array();
    $studyPresets = array(); // stores ONLY 1 preset, will be replaced by $studyScenarios
    $studyScenarios = array(); // replacing $studyPresets in the future
    $adaptedScenario = False; // declares whether or not an Adaptation Strategy has been defined by the user

    // Load the data package
    $groupDatapackageID = $entity->get('field_data_package')->target_id;
    if ($groupDatapackageID) {
      $datapackageNode = \Drupal\node\Entity\Node::load($groupDatapackageID);
      $datapackageUUID = $datapackageNode->uuid();
    }

    // load city term, if it has already been set in the Study
    $cityTerm = (!$entity->get('field_city_region')->isEmpty() ? Term::load($entity->get('field_city_region')->target_id) : false);
    if ($cityTerm) {
      $eeaName = $cityTerm->get('field_eea_city_profile_name')->value;
      $cityCode = $cityTerm->get('field_city_code')->value;
    }

    // get Study presets (combination of time-period, emission scenario and event frequency) from Paragraph reference
    if (!$entity->get('field_study_presets')->isEmpty()) {
      foreach ($entity->get('field_study_presets') as $paraReference) {
        // apparently when adding a new paragraph instance, it is first generated empty, which means that
        // at first the new study scenario will have no reference and therefore generate a warning here after
        if (!$paraReference->target_id) {
          continue;
        }

        $paragraph = Paragraph::load($paraReference->target_id);

        if ($paragraph && $paragraph->getType() == "variable_set") {
          // load all the necessary taxonomy terms
          $termTimePeriod = Term::load($paragraph->get('field_time_period')->target_id);
          $termEmScenario = Term::load($paragraph->get('field_emission_scenario')->target_id);
          $termEventFreq = Term::load($paragraph->get('field_event_frequency')->target_id);
          //$termStudyVariant = Term::load($paragraph->get('field_study_variant')->target_id);

          if (!$termTimePeriod || !$termEmScenario || !$termEventFreq) {
            // although in the Study preset (aka Study scenario) all fields are required
            // and therefore must exist if the paragraph exists, it could happen that
            // the related taxonomy term has been removed from the system
            // -> in such a case break for-loop and don't add an incomplete preset
            // should be resolved once Drupal introduces a possiblity to unpublish taxonomy terms
            break;
          }

          // extract preset label and all needed values from those terms
          $studyPreset['label'] = $paragraph->get('field_label')->value;
          $studyPreset['time_period'] = $termTimePeriod->get('field_var_meaning')->value;
          $studyPreset['emission_scenario'] = $termEmScenario->get('field_var_meaning')->value;
          $studyPreset['event_frequency'] = $termEventFreq->get('field_var_meaning')->value;
          //$studyPreset['study_variant'] = $termStudyVariant->get('field_var_meaning')->value;

          array_push($studyScenarios, $studyPreset);

          // this can later be removed, once we switch to the $studyScenarios object
          $studyPresets['time_period'] = $termTimePeriod->get('field_var_meaning')->value;
          $studyPresets['emission_scenario'] = $termEmScenario->get('field_var_meaning')->value;
          $studyPresets['event_frequency'] = $termEventFreq->get('field_var_meaning')->value;
          //$studyPresets['study_variant'] = $termStudyVariant->get('field_var_meaning')->value;
        }
      }
    }

    // check if Study has an Adaptation Project (ap) set
    $ap = $entity->getContentEntities("group_node:adaptation_project");
    if ($ap) {
      $adaptedScenario = True;
    }

    // write-permissions inside a Study need to be checked upon a group-member level and not a user level
    $userAccount = \Drupal::currentUser();
    $user = \Drupal\user\Entity\User::load($userAccount->id());
    $has_user_special_roles = false;
    $isAnonymous = true;
    $isMember = false;

    if (!$userAccount->isAnonymous()) {
      $isAnonymous = false;
    }

    $member = $entity->getMember($userAccount);
    if ($member) {
      $isMember = true;
      $memberRoles = $member->getRoles();
      foreach ($memberRoles as $role) {
        // Study group itself should be writable for owners only
        if ($role->id() == "study-owner") {
          $has_user_special_roles = true;
          break;
        }
      }
    }

    // bypass member roles permissions for admins
    if ($user->hasRole("administrator")) {
      $has_user_special_roles = true;
      $isMember = true;
    }

    $emikatId = $entity->get('field_emikat_id')->value;
    $emikatId = empty($emikatId) ? -1 : intval($emikatId);
    $calculationStatus = $entity->get('field_calculation_status')->value;

    $groupEntityInfo = array(
      //'title' => $entity->get('title')->value, // inconsistency: no title field ins study group!
      'step' => -1,
      'step_uuid' => -1,
      'step_name' => 'none',
      'id' => $entity->id(),
      'uuid' => $entity->uuid(),
      'study' => $entity->id(), //deprecated -> use  entitiyinfo.study.id
      'study_uuid' => $entity->uuid(), //deprecated -> use  entitiyinfo.study.uuid
      'study_emikat_id' => $emikatId,
      'calculation_status' => $calculationStatus,
      'study_datapackage_uuid' => $datapackageUUID,
      'study_area' => $entity->get('field_area')->value,
      'eea_city_name' => $eeaName,
      'city_code' => $cityCode,
      'study_presets' => $studyPresets,
      'study_scenarios' => $studyScenarios,
      'has_adapted_scenario' => $adaptedScenario,
      'is_anonymous' => $isAnonymous,
      'is_member' => $isMember,
      'write_permissions' => ($has_user_special_roles ? 1 : 0),
      'trigger_permissions' => ($has_user_special_roles ? 1 : 0),

    );
    return $groupEntityInfo;
  }
}
