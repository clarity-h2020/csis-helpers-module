(function($, Drupal, drupalSettings){
  /**
   * @deprecated
   */
  function getEntityInfo() {
    // FIXME: entityinfo is deprecated, use entityinfo.studyInfo instead
    return drupalSettings.csisHelpers.entityinfo;
  }

  function EntityIsGroup() {
    // FIXME: entityinfo is deprecated, use entityinfo.studyInfo instead
    if (drupalSettings.csisHelpers.entityinfo.step == null && drupalSettings.csisHelpers.entityinfo.study != null){
      return true;
    } else {
      return false;
    }
  }

  function EntityIsNode() {
    // FIXME: entityinfo is deprecated, use entityinfo.studyInfo instead
    if (drupalSettings.csisHelpers.entityinfo.step != null){
      return true;
    } else {
      return false;
    }
  }

  function EntityIsGroupNode() {
    // FIXME: entityinfo is deprecated, use entityinfo.studyInfo instead
    if (drupalSettings.csisHelpers.entityinfo.step != null && drupalSettings.csisHelpers.entityinfo.study != null){
      return true;
    } else {
      return false;
    }
  }



})(jQuery, Drupal, drupalSettings);
