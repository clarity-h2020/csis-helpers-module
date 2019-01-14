(function($, Drupal, drupalSettings){
  function getEntityInfo() {
    return drupalSettings.csisHelper.entityinfo;
  }

  function EntityIsGroup() {

    if (drupalSettings.csisHelper.entityinfo.step == null && drupalSettings.csisHelper.entityinfo.study != null){
      return true;
    } else {
      return false;
    }
  }

  function EntityIsNode() {

    if (drupalSettings.csisHelper.entityinfo.step != null){
      return true;
    } else {
      return false;
    }
  }

  function EntityIsGroupNode() {

    if (drupalSettings.csisHelper.entityinfo.step != null && drupalSettings.csisHelper.entityinfo.study != null){
      return true;
    } else {
      return false;
    }
  }



})(jQuery, Drupal, drupalSettings);
