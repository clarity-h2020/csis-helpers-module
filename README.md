CSIS Helpers Drupal Module
--------------------------

This module is a collection of functions that allow other components to interact with the CSIS and expands its features. As the name suggests this module is specifically designed for the usage in the CSIS and its highly specialized **Study group**. Key features are:
- the $entityinfo variable (which makes certain information about nodes and groups available as JSON)
- taking screenshots of map and table components
- updating GL-step relations (needed for including/removing Twins)
- updating the progress indicator of the Study
- notifying Emikat about new Studies and reveicing the EmikatID for each individual Study

### Configuration
This module provides a settings form in the BE, which can be accessed by navigation to Configuration -> Development -> CSIS module settings (.../admin/config/csis_helpers/default).
There the credentials for external applications can be set and the list of studies available to anonymous users can be managed.

### Managing access to Studies
This module checks for every Study and Study-related content, if a user can access it or not. By default anonymous users cannot access a Study, unless it is marked in the settings form of this module, where a list of all published Studies is available.
Logged in users have access to all Studies that have been published by the respective Study owners. Also, the logged in users have access to all unpublished Studies that they are a member of. 

### $studyInfo object
For this variable certain information about the Study group and the involved group nodes are extracted and provided as JSON in the DrupalSettings. Those DrupalSettings are loaded via inline javascript as JSON and can be accessed by other modules like e.g. the map component. Two different functions are required, since the $entityinfo can be either requested through a Node entity or a Group entity.

Currently it stores the following values (if applicable/set in the entity, otherwise value is `null`):
- `calculation_status`: status of the current calculation done in external systems (e.g. Emikat)
- `city_code`: unique 5-letter code to identify each city in Europe
- `eea_city_name`: EEA city name of the City/region selected in the Study
- `is_anonymous`: Boolean, true if user not logged in
- `is_member`: Boolen, true if user is part of Study group
- `step`: NodeID of the GL-Step
- `step_uuid`: UUID of the GL-Step
- `study`: GroupID of the Study group
- `study_uuid`: UUID of the Study group
- `study_emikat_id`: Emikat-internal ID to each Study advanced enough for calculations
- `study_datapackage_uuid`: UUID of the data package used in the Study
- `study_area`: bounding box information of the study area, e.g.:(POLYGON((coordinates1, coordinates2,...)))
- `study_presets`: stores information about the **currently selected and active** study preset
- `study_scenarios`: stores all defined study presets
- `write_permissions`: '1' if user has the right to edit the Study, '0' otherwise
- `trigger_permissions`: '1' if user has the right to trigger Study calculations, '0' otherwise

### Including report images in the study (a.k.a. "Taking screenshots of maps")
To create screenshots of dynamic content (like maps) html2canvas is used to generate the screenshots. Using the JSON:API the resulting canvas is stored as a file on the Drupal system. After that a new Report image content type is posted linking to this new file.

Inside the csis_helpers_node_insert function each Report image is then added as Group content to the corresponding Study group based on the GL-Step that is referenced in the Report image. (We might want to think about using Business rules to do that for us).

### Updating GL-Step relations
Unlike Report images (which existing only in the context of a Study) other Content types (like Twins and Adaptation options) can exist independently of Studies and therefore need a different handling. Twins (and possibly also other Content types later) are added/removed via JSON:API as relationsships of the individual GL-Steps of a Study. (We might want to consider adding those relations directly to the Study group and not the group content. However, there seem to be quite some issues when it comes to using JSON:API in combination with the Group module like e.g.: https://www.drupal.org/project/group/issues/2872645).

### Updating progress indicator of a Study
**This feature is currently not used!**<br>
The steps of a Study should be done in a predefined order, so it is necessary to disable those steps that should not yet be available to the user. The field_progress_indicator of the Study is used and compared to the currently visited Gl-Step and updated (= incremented by 1 to allow the user to visit the next step) if requirements are met. Those requirements need to be further specified.

### Communication with Emikat
Certain Study types require calculations in Emikat. For those Studies the module provides the communication with Emikat. Calculations can only be triggered manually by the Study owner once all necessary fields are set. Re-calculation of a Study is only possible after relevant fields have changed and all previous calculations have finished. Again, this can only be triggered manually by the Study owner.
Studies which are stored in Emikat receive an EmikatID, which is stored in the CSIS and used for further communcation with Emikat.

As of now the following fields are considered relevant (relevant for Emikat, ongoing discussion here: https://github.com/clarity-h2020/emikat/issues/6):
- Study title
- Study goal
- Study area
- Country code, city and city code
- used data package

### Communication with TM application
Certain Study types use the TM application as external service. For those Studies this module communicates with the TM via REST and sends all relevant data to it. At the moment this happens automatically right after the Study is created. Changes in relevant fields are, again automatically, send to the TM. 

For now, these fields are considered relevant:
- Study title
- Study goal

### Pulling current calculation status from Emikat for ongoing calculations
In the Study-step of each Study the module checks the calculation_status in the $studyInfo object to see if calculations are still ongoing or not. If they are active, it periodically pulls the current status from Emikat via AJAX and prints it for the user until calculations are completed or have failed. In case of errors or successfull completion the field_calculation_status in the Study is set to 0 (==non-active/done). Everytime calculations are triggered in Emikat, this field is set to 1 (==active) and the status is again pulled periodically.

### Testing Emikat calculations
This module provides a limited way to test the functionality of Emikat, by sending a request to recalculate a specific test Study, which is otherwise not used and not changed. A request to start the calculations can be triggered by visiting:\ 
**.../maintenance/trigger-emikat-test** (admin access reqired!)
Results of the calculations are checked based on the results of the corresponding batchjobs. Batchjobs with an `ERR` status are categorized as errors, batchjobs with an `OK` status and results greater 0 are marked "ok" and any other batchjob results are labelled as a potential problem.  
The batchjobs for the last calculation can be requested by visiting:\
**.../maintenance/check-emikat-results** (again admin access is required to visit this URL)


### Modifications for Entity browsers
There are two libraies in this module which you can attach to a view entity browser display of a view.
- `entitybrowser_helpers`: this attaches a javascript to the entity browser which implements a single selection behavior. ON selection of an element all othe selected elements get unselected
- `entitybrowser_reorder`: Add css which reorders the elements of a view from header-content-footer to footer-content-header so that controlls in the footer will not be only reachable by scrolling. Additional it also reverts the order of the footer content of the view.
