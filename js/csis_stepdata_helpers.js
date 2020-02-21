

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
            $('.item-preview').append('<button class="scroll-back">Scroll back up</button>');

            $('html, body').animate({
              scrollTop: $(".item-preview").offset().top
            }, 1000);

            $('.show-in-preview').removeClass('active');
            $(event.target).addClass('active');
            Drupal.attachBehaviors();
          });
        }
        event.stopImmediatePropagation();
      });

      $('.scroll-back').on('click', function (event) {
        $('html, body').animate({
          scrollTop: $(".show-in-preview.active").offset().top
        }, 1000);
      });
    }
  };
})(jQuery, Drupal, drupalSettings);

