(function($, Drupal, drupalSettings){
  function getEntityInfo() {
    return drupalSettings.csisHelpers.entityinfo;
  }

  function EntityIsGroup() {

    if (drupalSettings.csisHelpers.entityinfo.step == null && drupalSettings.csisHelpers.entityinfo.study != null){
      return true;
    } else {
      return false;
    }
  }

  function EntityIsNode() {

    if (drupalSettings.csisHelpers.entityinfo.step != null){
      return true;
    } else {
      return false;
    }
  }

  function EntityIsGroupNode() {

    if (drupalSettings.csisHelpers.entityinfo.step != null && drupalSettings.csisHelpers.entityinfo.study != null){
      return true;
    } else {
      return false;
    }
  }



})(jQuery, Drupal, drupalSettings);
