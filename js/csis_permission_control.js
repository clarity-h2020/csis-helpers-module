(function ($, Drupal, drupalSettings) {

  if (!drupalSettings.csisHelpers) {
    return;
  }

  Drupal.behaviors.csis_permission_control = {
    attach: function (context, settings) {
      // search for all elements containing that class (will be buttons or links)
      $('.token-field-check-permissions', context).once('checkPermissions').each(function () {
        //console.debug('checking permissions');

        // get write permissions for current user based on their role in the group
        var writePermissions = drupalSettings.csisHelpers.studyInfo.write_permissions

        if (writePermissions == 0) {
          $(this).remove();
        }

      });

      $('.token-field-check-anonymous', context).once('checkAnonymous').each(function () {
        //console.debug('checking anonymous');

        // remove element for anonymous users
        var isAnonymous = drupalSettings.csisHelpers.studyInfo.is_anonymous

        if (isAnonymous == 1) {
          $(this).remove();
        }

      });

      $('.token-field-check-member', context).once('checkMember').each(function () {
        //console.debug('checking member');

        // check if user is member and remove element if it is not the case
        var isMember = drupalSettings.csisHelpers.studyInfo.is_member

        if (isMember == 0) {
          $(this).remove();
        }

      });

      $('.token-field-check-trigger', context).once('checkMember').each(function () {
        //console.debug('checking member');

        // check if user has permission to trigger Study calculations (ATM just study-owner)
        var triggerPermissions = drupalSettings.csisHelpers.studyInfo.trigger_permissions
        var calcStatus = drupalSettings.csisHelpers.studyInfo.calculation_status

        if (triggerPermissions == 0) {
          $(this).remove();
        }
      });
    }
  };
})(jQuery, Drupal, drupalSettings);

