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
      ->set('emikat_password', $form_state->getValue('emikat_password'))
      ->save();
  }

}
