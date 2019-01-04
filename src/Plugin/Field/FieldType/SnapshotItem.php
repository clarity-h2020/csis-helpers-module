<?php
namespace Drupal\csis_helpers\Plugin\Field\FieldType;

use Drupal\Core\Field\FieldItemBase;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\Core\TypedData\DataDefinition;

/**
 * Plugin implementation of the 'snapshot' field type.
 *
 * @FieldType(
 *   id = "snapshot",
 *   label = @Translation("Snapshot"),
 *   module = "csis_helpers",
 *   description = @Translation("Report button for adding snapshots."),
 *   default_widget = "snapshot_default",
 *   default_formatter = "snapshot_default"
 * )
 */
class SnapshotItem extends FieldItemBase {

  /**
   * {@inheritdoc}
   */
  public static function schema(FieldStorageDefinitionInterface $field_definition) {
    return array(
      'columns' => array(
        'value' => array(
          'type' => 'text',
          'size' => 'tiny',
          'not null' => FALSE,
        ),
      ),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function isEmpty() {
    $value = $this->get('value')->getValue();
    return $value === NULL || $value === '';
  }

  /**
   * {@inheritdoc}
   */
  public static function propertyDefinitions(FieldStorageDefinitionInterface $field_definition) {
    $properties['value'] = DataDefinition::create('string')
      ->setLabel(t('Enter the app ID of the target application for which a snapshot shall be created'));

    return $properties;
  }

}
