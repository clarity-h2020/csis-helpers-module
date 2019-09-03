/**
 * Exposes a initMapComponent() function that can be used in "ExtendedIframe" Entities to
 * initialise the map component iframe. 
 * 
 * Examples: https://github.com/clarity-h2020/map-component/tree/dev/examples
 * 
 */
(function (drupalSettings) {

	/*$(document).ready(function() {

    }*/

    /**
     * Update iFrame src attribute.
     * 
     * @param {String} mapType 
     * @param {String} grouping_tag 
     * @param {Object} iFrameMapComponent 
     */
    function initMapComponent(mapType = 'GenericMap', grouping_tag = 'taxonomy_term--eu_gl', iFrameMapComponent = document.getElementById('map-component')) {
        try {
            var host = window.location.host, study_uuid, study_area, emikat_id, datapackage_uuid, write_permissions, resource_uuid, minx, miny, maxx, maxy;

            if (undefined !== drupalSettings && undefined !== drupalSettings.csisHelpers) {
                var csisHelpers = drupalSettings.csisHelpers;

                if (undefined !== csisHelpers.resourceInfo) {
                    console.info(`showing ${mapType} for resource ${csisHelpers.resourceInfo.name}`);
                    resource_uuid = csisHelpers.resourceInfo.uuid;
                    minx = csisHelpers.resourceInfo.minx;
                    miny = csisHelpers.resourceInfo.miny;
                    maxx = csisHelpers.resourceInfo.maxx;
                    maxy = csisHelpers.resourceInfo.maxy;
                    write_permissions = csisHelpers.resourceInfo.write_permissions;
                }
                else if (undefined !== csisHelpers.datapackageInfo) {
                    console.info(`showing ${mapType} for datapackage ${csisHelpers.datapackageInfo.name}`);
                    datapackage_uuid = csisHelpers.datapackageInfo.uuid;
                    minx = csisHelpers.datapackageInfo.minx;
                    miny = csisHelpers.datapackageInfo.miny;
                    maxx = csisHelpers.datapackageInfo.maxx;
                    maxy = csisHelpers.datapackageInfo.maxy;
                    write_permissions = csisHelpers.datapackageInfo.write_permissions;
                } else if (undefined !== csisHelpers.studyInfo) {
                    console.info(`showing ${mapType} for study ${csisHelpers.studyInfo.name}`);
                    study_uuid = csisHelpers.studyInfo.uuid;
                    study_area = csisHelpers.studyInfo.study_area;
                    emikat_id = csisHelpers.studyInfo.study_emikat_id;
                    datapackage_uuid = csisHelpers.studyInfo.study_datapackage_uuid;
                    write_permissions = csisHelpers.studyInfo.write_permissions;
                } else if (undefined !== csisHelpers.entityinfo) {
                    console.warn(`showing ${mapType} for study ${csisHelpers.entityinfo.study_uuid} for **deprecated** drupalSettings.csisHelpers.entityinfo`);
                    study_uuid = csisHelpers.entityinfo.study_uuid;
                    study_area = csisHelpers.entityinfo.study_area;
                    emikat_id = csisHelpers.entityinfo.study_emikat_id;
                    datapackage_uuid = csisHelpers.entityinfo.study_datapackage_uuid;
                    write_permissions = csisHelpers.entityinfo.write_permissions;
                } else {
                    console.error('no entityinfo objects found, map component embedded for unsupported entity type!')
                }

                /**
                 * Base map component URL
                 * 
                 * @type {String}
                 */
                var mapComponentUrl = `https://${host}/apps/map-component/build/${mapType}/?host=${host}`;

                study_uuid ? mapComponentUrl.append(`&study_uuid=${study_uuid}`) : noop;
                study_area ? mapComponentUrl.append(`&study_area=${study_area}`) : noop;
                emikat_id ? mapComponentUrl.append(`&emikat_id=${emikat_id}`) : noop;
                datapackage_uuid ? mapComponentUrl.append(`datapackage_uuid=${datapackage_uuid}`) : noop;
                write_permissions ? mapComponentUrl.append(`&write_permissions=${write_permissions}`) : noop;
                resource_uuid ? mapComponentUrl.append(`&resource_uuid=${resource_uuid}`) : noop;
                minx ? mapComponentUrl.append(`&minx=${minx}`) : noop;
                miny ? mapComponentUrl.append(`&miny=${miny}`) : noop;
                maxx ? mapComponentUrl.append(`&maxx=${maxx}`) : noop;
                maxy ? mapComponentUrl.append(`&maxy=${maxy}`) : noop;

                console.debug(`initilizing iFrame with ${mapComponentUrl}`);
                iFrameMapComponent.setAttribute('src', mapComponentUrl);
            } else {
                console.error('no global csisHelpers object found, probably not connected to Drupal!')
            }
        }
        catch (undefinedError) {
            console.error('no global drupalSettings object found, probably not connected to Drupal!', undefinedError);
        }
    }

    /**
     * TODO
     */
    function initTableComponent() {

    }
})(drupalSettings);