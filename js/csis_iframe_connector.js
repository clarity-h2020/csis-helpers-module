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

    if(!drupalSettings.csisHelpers) {
        drupalSettings.csisHelpers = {};
    }

    drupalSettings.csisHelpers.initMapComponent = function initMapComponent(mapType = 'GenericMap', grouping_tag = 'taxonomy_term--eu_gl', iFrameMapComponent = document.getElementById('map-component')) {
        try {
            
            if(undefined == iFrameMapComponent || null == iFrameMapComponent) {
                console.warn('initMapComponent(): no iFrameMapComponent available');
            }
            
            // window.location.origin instead of window.location.host: we need the protocol, too!
            var host = window.location.origin, study_uuid, study_area, emikat_id, datapackage_uuid, write_permissions, resource_uuid, minx, miny, maxx, maxy;

            if (undefined !== drupalSettings && undefined !== drupalSettings.csisHelpers) {
                var csisHelpers = drupalSettings.csisHelpers;

                if (undefined !== csisHelpers.resourceInfo && mapType == 'ResourcePreviewMap') {
                    console.info(`showing ${mapType} for resource ${csisHelpers.resourceInfo.name}`);
                    resource_uuid = csisHelpers.resourceInfo.uuid;
                    minx = csisHelpers.resourceInfo.minx;
                    miny = csisHelpers.resourceInfo.miny;
                    maxx = csisHelpers.resourceInfo.maxx;
                    maxy = csisHelpers.resourceInfo.maxy;
                    write_permissions = csisHelpers.resourceInfo.write_permissions;
                }
                else if (undefined !== csisHelpers.datapackageInfo && mapType == 'DataPackagePreviewMap' ) {
                    console.info(`showing ${mapType} for datapackage ${csisHelpers.datapackageInfo.name}`);
                    datapackage_uuid = csisHelpers.datapackageInfo.uuid;
                    minx = csisHelpers.datapackageInfo.minx;
                    miny = csisHelpers.datapackageInfo.miny;
                    maxx = csisHelpers.datapackageInfo.maxx;
                    maxy = csisHelpers.datapackageInfo.maxy;
                    write_permissions = csisHelpers.datapackageInfo.write_permissions;
                } else if (undefined !== csisHelpers.studyInfo) { // implicitly use for study preview map
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
                    console.error(`no entityinfo objects found for ${mapType} map component embedded for unsupported entity type!`);
                }

                /**
                 * Base map component URL
                 * 
                 * @type {String}
                 */
                var mapComponentUrl = `${host}/apps/map-component/build/${mapType}/?host=${host}`;

                mapComponentUrl += study_uuid ? `&study_uuid=${study_uuid}` : '';
                mapComponentUrl += study_area ? `&study_area=${study_area}` : '';
                mapComponentUrl += emikat_id ? `&emikat_id=${emikat_id}` : '';
                mapComponentUrl += datapackage_uuid ? `&datapackage_uuid=${datapackage_uuid}` : '';
                mapComponentUrl += write_permissions ? `&write_permissions=${write_permissions}` : '';
                mapComponentUrl += resource_uuid ? `&resource_uuid=${resource_uuid}` : '';
                mapComponentUrl += minx ? `&minx=${minx}` : '';
                mapComponentUrl += miny ? `&miny=${miny}` : '';
                mapComponentUrl += maxx ? `&maxx=${maxx}` : '';
                mapComponentUrl += maxy ? `&maxy=${maxy}` : '';

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