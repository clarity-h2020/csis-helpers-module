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


    if (!drupalSettings.csisHelpers) {
        drupalSettings.csisHelpers = {};
    }

    /**
     * Extract the parameters from CSISHelpers object and append to the iFrame scr URL
     * 
     * @param {String} iFrameUrl 
     * @param {String} appType 
     */
    const addQueryParameters = function (iFrameUrl, appType) {
        if (undefined !== drupalSettings && undefined !== drupalSettings.csisHelpers) {
            var csisHelpers = drupalSettings.csisHelpers;
            var study_uuid, study_area, emikat_id, datapackage_uuid,
                write_permissions, resource_uuid, minx, miny, maxx, maxy, study_variant, time_period, emission_scenario, event_frequency;

            if (undefined !== csisHelpers.resourceInfo && appType == 'ResourcePreviewMap') {
                console.info(`showing ${appType} for resource ${csisHelpers.resourceInfo.name}`);
                resource_uuid = csisHelpers.resourceInfo.uuid;
                // Yeah, 'study_area' is not correct, but we reuse this query param since we don't want to re-implement 
                // handling of initial bbox just because the data model contains rubbish. :-/
                // See https://github.com/clarity-h2020/map-component/issues/53
                study_area = csisHelpers.resourceInfo.spatial_extent;
                //minx = csisHelpers.resourceInfo.minx;
                //miny = csisHelpers.resourceInfo.miny;
                //maxx = csisHelpers.resourceInfo.maxx;
                //maxy = csisHelpers.resourceInfo.maxy;
                write_permissions = csisHelpers.resourceInfo.write_permissions;
            }
            else if (undefined !== csisHelpers.datapackageInfo && appType == 'DataPackagePreviewMap') {
                console.info(`showing ${appType} for datapackage ${csisHelpers.datapackageInfo.name}`);
                datapackage_uuid = csisHelpers.datapackageInfo.uuid;
                study_area = csisHelpers.datapackageInfo.spatial_extent;
                write_permissions = csisHelpers.datapackageInfo.write_permissions;
            } else if (undefined !== csisHelpers.studyInfo) { // implicitly use for study preview map
                console.info(`showing ${appType} for study ${csisHelpers.studyInfo.name}`);
                study_uuid = csisHelpers.studyInfo.uuid;
                study_area = csisHelpers.studyInfo.study_area;
                emikat_id = csisHelpers.studyInfo.study_emikat_id;
                datapackage_uuid = csisHelpers.studyInfo.study_datapackage_uuid;
                write_permissions = csisHelpers.studyInfo.write_permissions;
                study_variant = csisHelpers.studyInfo.study_variant;
                time_period = csisHelpers.studyInfo.time_period;
                emission_scenario = csisHelpers.studyInfo.emission_scenario;
                event_frequency = csisHelpers.studyInfo.event_frequency;

            } else if (undefined !== csisHelpers.entityinfo) { // DEPRECATED!
                console.warn(`showing ${appType} for study ${csisHelpers.entityinfo.study_uuid} for **deprecated** drupalSettings.csisHelpers.entityinfo`);
                study_uuid = csisHelpers.entityinfo.study_uuid;
                study_area = csisHelpers.entityinfo.study_area;
                emikat_id = csisHelpers.entityinfo.study_emikat_id;
                datapackage_uuid = csisHelpers.entityinfo.study_datapackage_uuid;
                write_permissions = csisHelpers.entityinfo.write_permissions;
            } else {
                console.error(`no entityinfo objects found iFrame ${appType} embedded for unsupported entity type!`);
            }

            iFrameUrl += study_uuid ? `&study_uuid=${study_uuid}` : '';
            iFrameUrl += study_area ? `&study_area=${study_area}` : '';
            iFrameUrl += emikat_id ? `&emikat_id=${emikat_id}` : '';
            iFrameUrl += datapackage_uuid ? `&datapackage_uuid=${datapackage_uuid}` : '';
            iFrameUrl += write_permissions ? `&write_permissions=${write_permissions}` : '';
            iFrameUrl += resource_uuid ? `&resource_uuid=${resource_uuid}` : '';
            iFrameUrl += minx ? `&minx=${minx}` : '';
            iFrameUrl += miny ? `&miny=${miny}` : '';
            iFrameUrl += maxx ? `&maxx=${maxx}` : '';
            iFrameUrl += maxy ? `&maxy=${maxy}` : '';
            iFrameUrl += study_variant ? `&maxy=${study_variant}` : '';
            iFrameUrl += time_period ? `&maxy=${time_period}` : '';
            iFrameUrl += emission_scenario ? `&maxy=${emission_scenario}` : '';
            iFrameUrl += event_frequency ? `&maxy=${event_frequency}` : '';
        } else {
            console.error('no global csisHelpers object found, probably not connected to Drupal!')
        }

        return iFrameUrl;
    }

    /**
     * Update iFrame src attribute for Map Component Apps.
     * 
     * @param {String} mapType 
     * @param {String} grouping_tag 
     * @param {Object} iFrameMapComponent 
     */
    drupalSettings.csisHelpers.initMapComponent = function initMapComponent(mapType = 'GenericMap', grouping_tag = 'taxonomy_term--eu_gl', iFrameMapComponent = document.getElementById('map-component')) {
        try {
            if (undefined == iFrameMapComponent || null == iFrameMapComponent) {
                console.warn('initMapComponent(): no iFrameMapComponent available');
                return;
            }

            // window.location.origin instead of window.location.host: we need the protocol, too!
            var host = window.location.origin;

            /**
             * Base map component URL
             * 
             * @type {String}
             */
            var mapComponentUrl = `${host}/apps/map-component/build/${mapType}/?host=${host}`;
            mapComponentUrl = addQueryParameters(mapComponentUrl, mapType);

            // grouping tag/criteria is defined in custom map components so in principle this renders
            // those custom map components useless ...
            mapComponentUrl += grouping_tag ? `&grouping_tag=${grouping_tag}` : '';

            console.debug(`initilizing iFrame with ${mapComponentUrl}`);
            iFrameMapComponent.setAttribute('src', mapComponentUrl);

        }
        catch (undefinedError) {
            console.error('no global drupalSettings object found, probably not connected to Drupal!', undefinedError);
        }
    }

    /**
     * Update iFrame src attribute for Table Component Apps.
     * 
     * @param {String} tableType 
     * @param {Object} iFrameTableComponent 
     */
    drupalSettings.csisHelpers.initTableComponent = function initTableComponent(tableType = 'GenericTable', iFrameTableComponent = document.getElementById('table-component')) {
        try {

            if (undefined == iFrameTableComponent || null == iFrameTableComponent) {
                console.warn('initTableComponent(): no iFrameTableComponent available');
                return;
            }

             // window.location.origin instead of window.location.host: we need the protocol, too!
             var host = window.location.origin;

            /**
             * Base table component URL
             * 
             * @type {String}
             */
            var tableComponentUrl = `${host}/apps/simple-table-component/build/${tableType}/?host=${host}`;

            tableComponentUrl = addQueryParameters(tableComponentUrl, tableType);

            console.debug(`initilizing iFrame with ${tableComponentUrl}`);
            iFrameTableComponent.setAttribute('src', tableComponentUrl);
        }
        catch (undefinedError) {
            console.error('no global drupalSettings object found, probably not connected to Drupal!', undefinedError);
        }
    }
})(drupalSettings);