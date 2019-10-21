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

        // if user can't write to this group/node then hide the element
        // hiding is in this case enough since Drupal itself will also check permissions
        // when a form is called and block users without necessary permissions
        if (writePermissions == 0) {
          $(this).hide();
        }

      });
    }
  };
})(jQuery, Drupal, drupalSettings);

