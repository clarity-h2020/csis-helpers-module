/**
 * Exposes several init$Component() functions that can be used in "ExtendedIframe" Entities to
 * initialise the respective component iframe. 
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
     * Extract the parameters from CSISHelpers object and append to the iFrame scr URL as query params
     * 
     * @param {String} iFrameUrl 
     * @param {String} appType 
     * @param {Object} additionalQueryParameters extended query parameters as JS Object
     */
    const addQueryParameters = function (iFrameUrl, appType, additionalQueryParameters) {

        /**
         * Quick & Dirty JS Object -> query String
         * Credits: https://stackoverflow.com/a/1714899
         * 
         * @param {Object} obj JS object to serialize
         * @return {String} query string
         */
        const serializeQueryParametersObject = function (obj) {
            var str = [];
            for (var p in obj)
                if (obj.hasOwnProperty(p)) {
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                }
            return str.join("&");
        };

        if (undefined !== drupalSettings && undefined !== drupalSettings.csisHelpers) {
            var csisHelpers = drupalSettings.csisHelpers;
            var study_uuid, study_area, emikat_id, datapackage_uuid,
                write_permissions, resource_uuid, study_variant, time_period, emission_scenario, event_frequency;

            if (undefined !== csisHelpers.resourceInfo && appType == 'ResourcePreviewMap') {
                console.info(`showing ${appType} for resource ${csisHelpers.resourceInfo.name}`);
                resource_uuid = csisHelpers.resourceInfo.uuid;
                // Yeah, 'study_area' is not correct, but we reuse this query param since we don't want to re-implement 
                // handling of initial bbox just because the data model contains rubbish. :-/
                // See https://github.com/clarity-h2020/map-component/issues/53
                study_area = csisHelpers.resourceInfo.spatial_extent;
                write_permissions = csisHelpers.resourceInfo.write_permissions;
            }
            else if (undefined !== csisHelpers.datapackageInfo && appType == 'DataPackagePreviewMap') {
                console.info(`showing ${appType} for datapackage ${csisHelpers.datapackageInfo.name}`);
                datapackage_uuid = csisHelpers.datapackageInfo.uuid;
                study_area = csisHelpers.datapackageInfo.spatial_extent;
                write_permissions = csisHelpers.datapackageInfo.write_permissions;
            } else if (undefined !== csisHelpers.studyInfo) { // implicitly use for study preview map
                console.info(`showing ${appType} for study ${csisHelpers.studyInfo.name} (${csisHelpers.studyInfo.uuid})`);
                study_uuid = csisHelpers.studyInfo.uuid;
                study_area = csisHelpers.studyInfo.study_area;
                emikat_id = csisHelpers.studyInfo.study_emikat_id;
                datapackage_uuid = csisHelpers.studyInfo.study_datapackage_uuid;
                write_permissions = csisHelpers.studyInfo.write_permissions;
                if (undefined !== csisHelpers.studyInfo.study_presets && null !== csisHelpers.studyInfo.study_presets) {
                    time_period = csisHelpers.studyInfo.study_presets.time_period;
                    emission_scenario = csisHelpers.studyInfo.study_presets.emission_scenario;
                    event_frequency = csisHelpers.studyInfo.study_presets.event_frequency;
                    study_variant = csisHelpers.studyInfo.study_presets.study_variant;
                } else {
                    console.warn(`no study_presets found in study ${csisHelpers.studyInfo.name} (${csisHelpers.studyInfo.uuid})`);
                }
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

            if (additionalQueryParameters && additionalQueryParameters != null) {
                iFrameUrl += ('&' + serializeQueryParametersObject(additionalQueryParameters));
            }

            iFrameUrl += study_uuid ? `&study_uuid=${study_uuid}` : '';
            iFrameUrl += study_area ? `&study_area=${study_area}` : '';
            iFrameUrl += emikat_id ? `&emikat_id=${emikat_id}` : '';
            iFrameUrl += datapackage_uuid ? `&datapackage_uuid=${datapackage_uuid}` : '';
            iFrameUrl += write_permissions ? `&write_permissions=${write_permissions}` : '';
            iFrameUrl += resource_uuid ? `&resource_uuid=${resource_uuid}` : '';
            iFrameUrl += study_variant ? `&study_variant=${study_variant}` : '';
            iFrameUrl += time_period ? `&time_period=${time_period}` : '';
            iFrameUrl += emission_scenario ? `&emissions_scenario=${emission_scenario}` : '';
            iFrameUrl += event_frequency ? `&event_frequency=${event_frequency}` : '';
        } else {
            console.error('no global csisHelpers object found, probably not connected to Drupal!')
        }

        return iFrameUrl;
    }

    /**
     * Update iFrame src attribute for Map Component Apps.
     * 
     * @param {String} mapType deprecated
     * @param {String} grouping_tag deprecated
     * @param {Object} iFrameMapComponent element name, default 'map-component'
     * @param {Object} additionalQueryParameters extended query parameters as JS Object
     * 
     */
    drupalSettings.csisHelpers.initMapComponent = function initMapComponent(
        mapType = 'GenericMap',
        grouping_tag = 'taxonomy_term--eu_gl',
        iFrameMapComponent = document.getElementById('map-component'),
        additionalQueryParameters = undefined) {
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
            mapComponentUrl = addQueryParameters(mapComponentUrl, mapType, additionalQueryParameters);

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
     * @param {Object} additionalQueryParameters extended query parameters as JS Object
     */
    drupalSettings.csisHelpers.initTableComponent = function initTableComponent(
        tableType = 'GenericTable',
        iFrameTableComponent = document.getElementById('table-component'),
        additionalQueryParameters = undefined) {
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

            tableComponentUrl = addQueryParameters(tableComponentUrl, tableType, additionalQueryParameters);

            console.debug(`initilizing iFrame with ${tableComponentUrl}`);
            iFrameTableComponent.setAttribute('src', tableComponentUrl);
        }
        catch (undefinedError) {
            console.error('no global drupalSettings object found, probably not connected to Drupal!', undefinedError);
        }
    }

    /**
     * Initialise EEA's Urban Adaptation Viewer with EEA Citiy Profile. Works only for screening studies **and** when an EEA City Profile is available for
     * the selected city from the cities taxonomy!
     * 
     * @param {HTMLElement} urbanAdaptationViewer 
     */
    drupalSettings.csisHelpers.initUrbanAdaptationViewer = function initUrbanAdaptationViewer(
        urbanAdaptationViewer = document.getElementById('urban-adaptation-viewer')) {
        try {
            if (undefined == urbanAdaptationViewer || null == urbanAdaptationViewer) {
                console.warn('initUrbanAdaptationViewer(): no urbanAdaptationViewer HTML Element (urban-adaptation-viewer) available');
                return;
            }

            if (undefined !== drupalSettings && undefined !== drupalSettings.csisHelpers && undefined !== drupalSettings.csisHelpers.studyInfo
                && undefined !== drupalSettings.csisHelpers.studyInfo.eea_city_name && null !== drupalSettings.csisHelpers.studyInfo.eea_city_name) {
                /**
             * Base EEA component URL
             * 
             * @type {String}
             */
                var urbanAdaptationViewerUrl = 'https://csis.myclimateservice.eu/t/Aironline/views/2019_Urban_vulnerability_links/mainpage?iframeSizedToWindow=false&%3Aembed=y&%3AshowAppBanner=false&%3Adisplay_count=yes&%3AshowVizHome=yes&%3Atoolbar=yes&City_param=';
                console.debug(`initilizing iFrame with ${urbanAdaptationViewerUrl}`);
                urbanAdaptationViewerUrl += drupalSettings.csisHelpers.studyInfo.eea_city_name;
                urbanAdaptationViewer.setAttribute('src', urbanAdaptationViewerUrl);
            } else {
                console.warn(`no EEA city name available for study, cannot initialise Urban Adaptation Viewer`);
                if (urbanAdaptationViewer.outerHTML) {
                    urbanAdaptationViewer.outerHTML = '<h1>Sorry, this study area is not supported by EEA\'s UrbanAdaptationViewer!</h1>';
                } else {
                    console.warn('urbanAdaptationViewer.outerHTML() not available');
                }
            }
        }
        catch (undefinedError) {
            console.error('no global drupalSettings object found, probably not connected to Drupal!', undefinedError);
        }
    }

    /**
    * Initialise METEOGRID TransportApplication
    * 
    * @see https://github.com/clarity-h2020/csis/issues/134
    * @param {HTMLElement} transportApplication 
    */
    drupalSettings.csisHelpers.initTransportApplication = function initTransportApplication(
        applicationType = 'study',
        transportApplication = document.getElementById('transport-application')) {
        try {
            if (undefined == transportApplication || null == transportApplication) {
                console.error('initTransportApplication(): no transportApplication HTML Element (transportApplication) available');
                return;
            }

            if (undefined !== drupalSettings && undefined !== drupalSettings.csisHelpers && undefined !== drupalSettings.csisHelpers.studyInfo
                && undefined !== drupalSettings.csisHelpers.studyInfo.study && null !== drupalSettings.csisHelpers.studyInfo.step_name) {
                /**
             * Base transport application component URL
             * 
             * @type {String}
             */
                const study = drupalSettings.csisHelpers.studyInfo.study;
                const step = drupalSettings.csisHelpers.studyInfo.step_name;
                var transportApplicationUrl = 'https://clarity.saver.red';
                switch (applicationType) {
                    case "map":
                        transportApplicationUrl += `/study-${step}/reference/${study}/`;
                        break;
                    case "table":
                        transportApplicationUrl += `/study-${step}/reference/${study}/elements_${step}/`;
                        break;
                    case "study":
                    default:
                        transportApplicationUrl += `/studies/reference/${study}/`;
                }

                console.debug(`initilizing iFrame with ${transportApplicationUrl}`);
                transportApplication.setAttribute('src', transportApplicationUrl);
            } else {
                console.warn(`no $study or $step_name property available, cannot initialise Transport Application`);
                if (transportApplication.outerHTML) {
                    transportApplication.outerHTML = '<h1>no $study or $step_name property available, cannot initialise Transport Application</h1>';
                } else {
                    console.warn('transportApplication.outerHTML() not available');
                }
            }
        }
        catch (undefinedError) {
            console.error('no global drupalSettings object found, probably not connected to Drupal!', undefinedError);
        }
    }
})(drupalSettings);