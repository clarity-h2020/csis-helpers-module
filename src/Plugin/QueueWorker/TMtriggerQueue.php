<?php
namespace Drupal\csis_helpers\Plugin\Queueworker;

use Drupal\Core\Entity\EntityStorageInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Queue\QueueWorkerBase;
use Symfony\Component\DependencyInjection\ContainerInterface;


/**
 * A Study queue that sends relevant Studies to the TM and stores the received TM ID
 * inside the Study object
 *
 * @QueueWorker(
 *   id = "tm_trigger_queue",
 *   title = @Translation("TM trigger queue"),
 * )
 */
class TMtriggerQueue extends QueueWorkerBase implements ContainerFactoryPluginInterface
{

  /**
   * The group storage.
   *
   * @var \Drupal\Core\Entity\EntityStorageInterface
   */
  protected $groupStorage;

  /**
   * Creates a new TMtriggerQueue object.
   *
   * @param \Drupal\Core\Entity\EntityStorageInterface $group_storage
   * The group storage.
   */
  public function __construct(EntityStorageInterface $group_storage)
  {
    $this->groupStorage = $group_storage;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition)
  {
    return new static(
      $container->get('entity.manager')->getStorage('group')
    );
  }

  /**
   * {@inheritdoc}
   * Not used since queue is processed directly inside the hook and not via CRON
   * or specific URL call!
   */
  public function processItem($data)
  {
    /** @var GroupInterface $study */
    $study = $this->groupStorage->load($data->gid);
    if ($study) {
      return $study->save();
    }
  }
}
