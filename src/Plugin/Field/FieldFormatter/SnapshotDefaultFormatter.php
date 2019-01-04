<?php

namespace Drupal\csis_helpers\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Field\FieldItemListInterface;

/**
 * Plugin implementation of the 'snapshot_default' formatter.
 *
 * @FieldFormatter(
 *   id = "snapshot_default",
 *   label = @Translation("Snapshot button"),
 *   field_types = {
 *     "snapshot"
 *   }
 * )
 */
class SnapshotDefaultFormatter extends FormatterBase {

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $summary = [];
    $summary[] = $this->t('Displays the app ID.');
    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $element = [];
    $node = \Drupal::routeMatch()->getParameter('node');
    $nid = 0;
    if ($node instanceof \Drupal\node\NodeInterface) {
      // Problem: only works when calling the node itself in the URL, but not when accessing the group node
      $nid = $node->id();
    }

    foreach ($items as $delta => $item) {
      // Render each element as markup.
      $element[$delta] = array(
        '#markup' => '<div class="button snapshot" data-camera-target="'. $item->value . '" data-node="' . $nid . '">include in report</div>',
      );
    }

    return $element;
  }

}
