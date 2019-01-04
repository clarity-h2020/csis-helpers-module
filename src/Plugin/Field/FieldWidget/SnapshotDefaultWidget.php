<?php

/**
 * @file
 * Definition of Drupal\csis_helpers\Plugin\Field\FieldWidget\SnapshotDefaultWidget.
 */

namespace Drupal\csis_helpers\Plugin\Field\FieldWidget;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\WidgetBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Plugin implementation of the 'snapshot_default' widget.
 *
 * @FieldWidget(
 *   id = "snapshot_default",
 *   label = @Translation("Snapshot button"),
 *   field_types = {
 *     "snapshot"
 *   }
 * )
 */
class SnapshotDefaultWidget extends WidgetBase {

  /**
     * {@inheritdoc}
     */
    public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state) {
      $value = isset($items[$delta]->value) ? $items[$delta]->value : '';
      $element += [
        '#type' => 'textfield',
        '#default_value' => $value,
        '#size' => 255,
//         '#element_validate' => [
//           [static::class, 'validate'],
//         ],
      ];
      return ['value' => $element];
    }

    /**
     * Possibility to add a validation of the App ID in future.
     */
    public static function validate($element, FormStateInterface $form_state) {

//       $value = $element['#value'];
//       if (strlen($value) == 0) {
//         $form_state->setValueForElement($element, '');
//         return;
//       }
//       if (!preg_match('/^#([a-f0-9]{6})$/iD', strtolower($value))) {
//         $form_state->setError($element, t("Color must be a 6-digit hexadecimal value, suitable for CSS."));
//       }

    }

}
