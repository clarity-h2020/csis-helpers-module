CSIS Helpers Drupal Module
--------------------------

This module is a collection of functions that allow other components to interact with the CSIS and expands its features. As the name suggests this module is specifically designed for the usage in the CSIS and its highly specialized **Study group**. Key features are:
- the $entityinfo variable (which makes certain information about nodes and groups available as JSON)
- taking screenshots of map and table components
- updating GL-step relations (needed for including/removing Twins)
- updating the progress indicator of the Study
- notifying Emikat about new Studies and reveicing the EmikatID for each individual Study

### $entityinfo variable
For this variable certain information about the Study group and the involved group nodes are extracted and provided as JSON in the DrupalSettings. Those DrupalSettings are loaded via inline javascript as JSON and can be accessed by other modules like e.g. the map component.

### Including report images in the study (a.k.a. "Taking screenshots of maps")
To create screenshots of dynamic content (like maps) html2canvas is used to generate the screenshots. Using the JSON:API the resulting canvas is stored as a file on the Drupal system. After that a new Report image content type is posted linking to this new file.

Inside the csis_helpers_node_insert function each Report image is then added as Group content to the corresponding Study group based on the GL-Step that is referenced in the Report image. (We might want to think about using Business rules to do that for us).

### Updating GL-Step relations
Unlike Report images (which existing only in the context of a Study) other Content types (like Twins and Adaptation options) can exist independently of Studies and therefore need a different handling. Twins (and possibly also other Content types later) are added/removed via JSON:API as relationsships of the individual GL-Steps of a Study. (We might want to consider adding those relations directly to the Study group and not the group content. However, there seem to be quite some issues when it comes to using JSON:API in combination with the Group module like e.g.: https://www.drupal.org/project/group/issues/2872645).

### Updating progress indicator of a Study
The steps of a Study should be done in a predefined order, so it is necessary to disable those steps that should not yet be available to the user. The field_progress_indicator of the Study is used and compared to the currently visited Gl-Step and updated (= incremented by 1 to allow the user to visit the next step) if requirements are met. Those requirements need to be further specified.

### Communication with Emikat
This module checks each time a Study gets updated if Emikat is aware of this Study or not. In case Emikat is already aware of this Study, the CSIS received an EmikatID as a response, which is stored inside the Study.
