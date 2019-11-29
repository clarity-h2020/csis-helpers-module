(function ($, Drupal, drupalSettings) {
  Drupal.behaviors.csis_dp_selector_helpers = {
    attach: function (context, settings) {
      $(".form-select").on('change', function (event) {
        var id = $(this).val();

        if (id != "_none") {
          var ajaxurl = '/rest/html/datapackages/summary/' + id + '?_format=json';
          $.getJSON(ajaxurl, function (result) {
            // check if div-element already has a dp description included
            if ($('.selection-preview-dp').length) {
              $('.selection-preview-dp').replaceWith('<div class="selection-preview-dp">' + result[0].nid + '</div>');
            }
            else {
              $('.selection-preview').after('<div class="selection-preview-dp">' + result[0].nid + '</div>');
            }
          });
        }
        else {
          $('.selection-preview-dp').remove();
        }

      });
    }
  };
})(jQuery, Drupal, drupalSettings);
