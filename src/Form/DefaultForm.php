<?php

namespace Drupal\csis_helpers\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Class DefaultForm.
 */
class DefaultForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [
      'csis_helpers.default',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'default_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('csis_helpers.default');
    $form['emikat_username'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Emikat username'),
      '#description' => $this->t('Credentials for Emikat REST service'),
      '#maxlength' => 64,
      '#size' => 64,
      '#default_value' => $config->get('emikat_username'),
    ];
    $form['emikat_password'] = [
      '#type' => 'password',
      '#title' => $this->t('Emikat password'),
      '#description' => $this->t('Credentials for Emikat REST service'),
      '#maxlength' => 64,
      '#size' => 64,
      '#default_value' => $config->get('emikat_password'),
    ];
    $form['tm_username'] = [
      '#type' => 'textfield',
      '#title' => $this->t('TM app username'),
      '#description' => $this->t('Credentials for TM app REST service'),
      '#maxlength' => 64,
      '#size' => 64,
      '#default_value' => $config->get('tm_username'),
    ];
    $form['tm_password'] = [
      '#type' => 'password',
      '#title' => $this->t('TM app password'),
      '#description' => $this->t('Credentials for TM app REST service'),
      '#maxlength' => 64,
      '#size' => 64,
      '#default_value' => $config->get('tm_password'),
    ];
    # the options to display in our checkboxes
    $studies = array(
      '1' => t('Study 1'),
      '33' => t('Study 33'),
      '55' => t('Study 55')
    );

    $config = $this->config('csis_helpers.default');
    $form['allowed_studies'] = [
      '#type' => 'select',
      '#title' => $this->t('Studies accessible to anonymous users'),
      '#description' => $this->t('Select Studies that will be available to anonymous users'),
      '#options' => $this->getStudiesArray(),
      '#multiple' => 'true',
      '#default_value' => $config->get('allowed_studies'),
      '#attributes' => array(
        'id' => 'edit-select-user',
        'style' => 'height:200px',
      )
    ];
    dump($config->get('allowed_studies'));
    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state) {
    parent::validateForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    parent::submitForm($form, $form_state);

    $this->config('csis_helpers.default')
      ->set('emikat_username', $form_state->getValue('emikat_username'))
      ->set('tm_username', $form_state->getValue('tm_username'));

    // for passwords first check if a value has been set, otherwise ignore these fields in the submit
    if ($form_state->getValue('emikat_password')) {
      $this->config('csis_helpers.default')->set('emikat_password', $form_state->getValue('emikat_password'));
    }
    if ($form_state->getValue('tm_password')) {
      $this->config('csis_helpers.default')->set('tm_password', $form_state->getValue('tm_password'));
    }

    $this->config('csis_helpers.default')->set('allowed_studies', $form_state->getValue('allowed_studies'));

    $this->config('csis_helpers.default')->save();
  }

  private function getStudiesArray() {
    $array = array();
    $gids = \Drupal::entityQuery('group')
      ->condition('type', 'study')
      ->sort('id', 'ASC')
      ->execute();
    $studies = \Drupal\group\Entity\Group::loadMultiple($gids);
    foreach ($studies as $study) {
      if ($study->get('field_publish')->value) {
        $array[$study->id()] = $study->id() . " - " . $study->label();
      }
    }
    return $array;
  }

}
