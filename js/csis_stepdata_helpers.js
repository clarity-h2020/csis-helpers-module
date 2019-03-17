

(function($, Drupal, drupalSettings){
  Drupal.behaviors.csis_stepdata_helpers = {
    attach: function (context, settings) {
      $('.show-in-preview').on('click', function(event){
        var taxonomy = $(this).attr('data-taxonomy-preview');
          // For some browsers, `attr` is undefined; for others,
          // `attr` is false.  Check for both.
        if (typeof taxonomy !== typeof undefined && taxonomy !== false) {
          var id = $(this).attr('data-taxonomy-preview');
          var ajaxurl = '/rest/html/taxonomy/description/' + id +'?_format=json'
        } else {
          console.log('click');
          var node = $(this).attr('data-node-preview');
          if (typeof node !== typeof undefined && node !== false) {
            var id = $(this).attr('data-node-preview');
            var ajaxurl = '/rest/html/resource/summary/' + id +'?_format=json'
          } 
        }
        
        if (id){
          $.getJSON(ajaxurl, function(result){
            $('.item-preview').html(""); //(result[0].nid
            $.each( result[0], function( key, value ) {
                $('.item-preview').append('<div class="' + key + '" >' + value + '</div>');
            });
          });
        }
        event.stopPropagation();
      });
    }
  };
})(jQuery, Drupal, drupalSettings);

