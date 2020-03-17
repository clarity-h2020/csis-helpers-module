<?php

namespace Drupal\csis_helpers\Controller;

use Drupal\Core\Controller\ControllerBase;

/**
 * Defines StudyCalculationController class.
 */
class StudyCalculationController extends ControllerBase
{
  /**
   * Display whether or not Emikat was successfully notified of updates in the test Study.
   *
   * @return array Return Study update notification array.
   */
  public function triggerEmikatTest()
  {
    // TODO: instead use the config form to load and set a Study that should be used for
    // this kind of testing
    $item = new \stdClass(); // create a dummy object for the queue/service
    $item->gid = 60; // The ID of our special Study group reserved for tests

    /** @var \Drupal\csis_helpers\Utils\TestingService $testingService */
    $testingService = \Drupal::service('csis_helpers.testing');

    // returns true if calculations for this Study are still running
    $calculationRunning = $testingService->isCalculationRunning($item);
    if (!$calculationRunning) {
      // returns true if Study updates were successfully sent to Emikat
      $result = $testingService->sendTestStudy($item);
    }
    else {
      // since calculation is still running, EmikatTrigger did not fire
      $result = false;
    }

    return array(
      '#theme' => 'emikat_trigger',
      '#result' => $result,
      '#title' => 'Triggering Emikat calculations test'
    );
  }

  /**
   * Display the results of the batchjobs received from Emikat.
   *
   * @return array Return batchjob array.
   */
  public function checkEmikatResults()
  {
    // TODO: instead use the config form to load and set a Study that should be used for
    // this kind of testing
    $item = new \stdClass(); // create a dummy object for the queue/service
    $item->gid = 60; // The ID of our special Study group reserved for tests

    /** @var \Drupal\csis_helpers\Utils\TestingService $testingService */
    $testingService = \Drupal::service('csis_helpers.testing');

    // returns the batchjobs as an array + the total number of errors/warnings found
    $results = $testingService->checkTestResults($item);
    $batchjobs = $results[0];

    return array(
      '#theme' => 'emikat_results',
      '#items' => $batchjobs,
      '#warningCount' => $results[1],
      '#title' => 'Results for Emikat test Study ' . $item->gid
    );
  }
}
