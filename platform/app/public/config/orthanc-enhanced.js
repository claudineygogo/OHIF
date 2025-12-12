/** @type {AppTypes.Config} */

window.config = {
  name: 'config/orthanc-enhanced.js',
  routerBasename: null,

  // =========================================================================
  // EXTENSIONS - All required extensions for full OHIF functionality
  // Including segmentation, measurement tracking, and DICOM support
  // =========================================================================
  extensions: [
    {
      packageName: '@ohif/extension-default',
    },
    {
      packageName: '@ohif/extension-cornerstone',
    },
    {
      packageName: '@ohif/extension-measurement-tracking',
    },
    {
      packageName: '@ohif/extension-cornerstone-dicom-sr',
    },
    {
      packageName: '@ohif/extension-cornerstone-dicom-seg',
    },
    {
      packageName: '@ohif/extension-cornerstone-dicom-pmap',
    },
    {
      packageName: '@ohif/extension-cornerstone-dynamic-volume',
    },
    {
      packageName: '@ohif/extension-dicom-microscopy',
    },
    {
      packageName: '@ohif/extension-dicom-pdf',
    },
    {
      packageName: '@ohif/extension-dicom-video',
    },
    {
      packageName: '@ohif/extension-tmtv',
    },
    {
      packageName: '@ohif/extension-test',
    },
    {
      packageName: '@ohif/extension-cornerstone-dicom-rt',
    },
    {
      packageName: '@ohif/extension-ultrasound-pleura-bline',
    },
  ],

  // =========================================================================
  // MODES - All available viewing modes including segmentation
  // =========================================================================
  modes: [
    '@ohif/mode-longitudinal',
    '@ohif/mode-basic',
    '@ohif/mode-segmentation',
    '@ohif/mode-seg-scorer',
    '@ohif/mode-tmtv',
    '@ohif/mode-microscopy',
    '@ohif/mode-preclinical-4d',
    '@ohif/mode-test',
    '@ohif/mode-basic-dev-mode',
    '@ohif/mode-ultrasound-pleura-bline',
  ],

  customizationService: {},
  investigationalUseDialog: {
    option: 'never',
  },
  showStudyList: true,

  // Performance settings
  maxNumberOfWebWorkers: 3,
  showWarningMessageForCrossOrigin: false, // Disabled for local Orthanc
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  experimentalStudyBrowserSort: false,
  strictZSpacingForVolumeViewport: true,
  groupEnabledModesFirst: true,
  allowMultiSelectExport: false,

  maxNumRequests: {
    interaction: 100,
    thumbnail: 75,
    prefetch: 25,
  },

  showErrorDetails: 'always',

  // Default data source for Orthanc
  defaultDataSourceName: 'Orthanc',

  // =========================================================================
  // DATA SOURCES - Orthanc DICOMweb Configuration
  // =========================================================================
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'Orthanc',
      configuration: {
        friendlyName: 'Local Orthanc Server',
        name: 'Orthanc',
        qidoRoot: 'http://localhost:8043/dicom-web',
        wadoRoot: 'http://localhost:8043/dicom-web',
        qidoSupportsIncludeField: true,
        supportsReject: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
        staticWado: false,
        singlepart: 'bulkdata,video',

        // Orthanc-specific settings
        omitQuotationForMultipartRequest: true,

        // BulkData URI configuration for Orthanc
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies',
        },

        // Support flags
        supports: {
          search: true,
          windows: true,
          series: true,
        },

        // Enable series async for better performance
        supportsSeriesAsync: true,
      },
    },

    // Fallback data sources for flexibility
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: {
        friendlyName: 'dicom json',
        name: 'json',
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
      sourceName: 'dicomlocal',
      configuration: {
        friendlyName: 'dicom local',
      },
    },
  ],

  // HTTP error handler
  httpErrorHandler: error => {
    console.warn('HTTP Error:', error.status);
    console.warn('Error details:', error);
  },

  // Hotkeys configuration (can be customized)
  hotkeys: [
    {
      commandName: 'incrementActiveViewport',
      label: 'Next Viewport',
      keys: ['right'],
    },
    {
      commandName: 'decrementActiveViewport',
      label: 'Previous Viewport',
      keys: ['left'],
    },
    {
      commandName: 'rotateViewportCW',
      label: 'Rotate Right',
      keys: ['r'],
    },
    {
      commandName: 'rotateViewportCCW',
      label: 'Rotate Left',
      keys: ['l'],
    },
    {
      commandName: 'invertViewport',
      label: 'Invert',
      keys: ['i'],
    },
    {
      commandName: 'flipViewportHorizontal',
      label: 'Flip Horizontally',
      keys: ['h'],
    },
    {
      commandName: 'flipViewportVertical',
      label: 'Flip Vertically',
      keys: ['v'],
    },
    {
      commandName: 'scaleUpViewport',
      label: 'Zoom In',
      keys: ['+'],
    },
    {
      commandName: 'scaleDownViewport',
      label: 'Zoom Out',
      keys: ['-'],
    },
    {
      commandName: 'fitViewportToWindow',
      label: 'Zoom to Fit',
      keys: ['='],
    },
    {
      commandName: 'resetViewport',
      label: 'Reset',
      keys: ['space'],
    },
    {
      commandName: 'nextImage',
      label: 'Next Image',
      keys: ['down'],
    },
    {
      commandName: 'previousImage',
      label: 'Previous Image',
      keys: ['up'],
    },
    {
      commandName: 'firstImage',
      label: 'First Image',
      keys: ['pagedown'],
    },
    {
      commandName: 'lastImage',
      label: 'Last Image',
      keys: ['pageup'],
    },
    {
      commandName: 'previousViewportDisplaySet',
      label: 'Previous Series',
      keys: ['pageup'],
    },
    {
      commandName: 'nextViewportDisplaySet',
      label: 'Next Series',
      keys: ['pagedown'],
    },
  ],
};
