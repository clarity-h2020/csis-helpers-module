

(function($, Drupal, drupalSettings){
  Drupal.behaviors.csis_entitybrowser_helpers = {
    attach: function (context, settings) {
      $('.views-field-entity-browser-select input[type="checkbox"]').on('change', function(event){
        var value = $(this).val();
        var id = value.split(':')[1];
        $('.views-field-entity-browser-select input[type="checkbox"]').each(function(){
          if($(this).val() != value){//event.target.getAttribute("value")){
            $(this).prop('checked',false);
          }
        });
        var ajaxurl = '/rest/html/datapackages/summary/' + id +'?_format=json'
        
        $.getJSON(ajaxurl, function(result){
          $('.selection-preview').html(result[0].nid);
        });
      });
    }
  };
})(jQuery, Drupal, drupalSettings);

