import { id } from './id';
import toolbarButtons from './toolbarButtons';
import initToolGroups from './initToolGroups';
import setUpAutoTabSwitchHandler from './utils/setUpAutoTabSwitchHandler';

const ohif = {
  layout: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
  sopClassHandler: '@ohif/extension-default.sopClassHandlerModule.stack',
  hangingProtocol: '@ohif/extension-default.hangingProtocolModule.default',
  leftPanel: '@ohif/extension-default.panelModule.seriesList',
};

const cornerstone = {
  viewport: '@ohif/extension-cornerstone.viewportModule.cornerstone',
  labelMapSegmentationPanel:
    '@ohif/extension-cornerstone.panelModule.panelSegmentationWithToolsLabelMap',
  contourSegmentationPanel:
    '@ohif/extension-cornerstone.panelModule.panelSegmentationWithToolsContour',
  measurements: '@ohif/extension-cornerstone.panelModule.panelMeasurement',
};

const segmentation = {
  sopClassHandler: '@ohif/extension-cornerstone-dicom-seg.sopClassHandlerModule.dicom-seg',
  viewport: '@ohif/extension-cornerstone-dicom-seg.viewportModule.dicom-seg',
};

const dicomRT = {
  viewport: '@ohif/extension-cornerstone-dicom-rt.viewportModule.dicom-rt',
  sopClassHandler: '@ohif/extension-cornerstone-dicom-rt.sopClassHandlerModule.dicom-rt',
};
/**
 * Just two dependencies to be able to render a viewport with panels in order
 * to make sure that the mode is working.
 */
const extensionDependencies = {
  '@ohif/extension-default': '^3.0.0',
  '@ohif/extension-cornerstone': '^3.0.0',
  '@ohif/extension-cornerstone-dicom-seg': '^3.0.0',
  '@ohif/extension-cornerstone-dicom-rt': '^3.0.0',
};

function modeFactory({ modeConfiguration }) {
  const _unsubscriptions = [];
  return {
    /**
     * Mode ID, which should be unique among modes used by the viewer. This ID
     * is used to identify the mode in the viewer's state.
     */
    id,
    routeName: 'seg-scorer',
    /**
     * Mode name, which is displayed in the viewer's UI in the workList, for the
     * user to select the mode.
     */
    displayName: 'Seg Scorer',
    /**
     * Runs when the Mode Route is mounted to the DOM. Usually used to initialize
     * Services and other resources.
     */
    onModeEnter: ({ servicesManager, extensionManager, commandsManager }: withAppTypes) => {
      const {
        measurementService,
        toolbarService,
        toolGroupService,
        segmentationService,
        viewportGridService,
        panelService,
        displaySetService,
        customizationService,
      } = servicesManager.services;

      // Add customization to show the submit button in the segmentation panel
      customizationService.setCustomizations({
        'panelSegmentation.showSubmitButton': {
          id: 'panelSegmentation.showSubmitButton',
          visible: true,
        },
      });

      // CSS HACK: Hide specific header elements for this mode
      // This is necessary because the layout configuration doesn't easily support removing these header specific items
      if (typeof document !== 'undefined') {
        const styleId = 'seg-scorer-mode-style';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
            /* Hide OHIF Logo and Return Button */
            [data-cy="return-to-work-list"] {
              display: none !important;
            }
            /* Hide Settings Cogwheel (The last item in the right header section) */
            .absolute.right-0 > .flex-shrink-0:last-child {
               display: none !important;
            }
            /* Hide the 'Label map segmentations' panel header (Accordion Trigger) */
            /* Using a broad selector for the trigger button inside the panel section */
            .flex-shrink-0.overflow-hidden button[type="button"][aria-expanded] {
              display: none !important;
            }
            /* Hide the inner headers of the segmentation table (Expanded Header) */
            .bg-primary-dark.flex.h-10.w-full.items-center.space-x-1 {
               display: none !important;
            }
            /* Hide collapsed content if it appears */
            .collapsed-content {
               display: none !important;
            }
            /* Hide 'Shape' sub-element label in Tool Settings */
            .flex.items-center.justify-between.text-\[13px\] {
               display: none !important;
            }

            /* --- TAB VISIBILITY LOGIC --- */

            /* Initially (No grading): Hide Score Panel Tab */
            /* Using precise data-cy for Score Panel */
            body:not(.grading-complete) div[data-cy="scorePanel-btn"] {
              display: none !important;
            }

            /* Grading Complete: Hide Label Map Tab, Show Score Panel Tab */
            /* Using precise data-cy for Label Map Panel */
            body.grading-complete div[data-cy="panelSegmentationWithToolsLabelMap-btn"] {
              display: none !important;
            }
            body.grading-complete div[data-cy="scorePanel-btn"] {
              display: flex !important;
            }
          `;
          document.head.appendChild(style);
        }

        // Reset grading state on entry
        if (typeof document !== 'undefined') {
          document.body.classList.remove('grading-complete');
        }
      }

      measurementService.clearMeasurements();

      // Init Default and SR ToolGroups
      initToolGroups(extensionManager, toolGroupService, commandsManager);

      toolbarService.register(toolbarButtons);

      toolbarService.updateSection(toolbarService.sections.primary, [
        'WindowLevel',
        'Pan',
        'Zoom',
        'TrackballRotate',
        'Capture',
        'Layout',
        'Crosshairs',
        'MoreTools',
        // 'SubmitContour', // Removed from toolbar
      ]);

      toolbarService.updateSection(toolbarService.sections.viewportActionMenu.topLeft, [
        'orientationMenu',
        'dataOverlayMenu',
      ]);

      toolbarService.updateSection(toolbarService.sections.viewportActionMenu.bottomMiddle, [
        'AdvancedRenderingControls',
      ]);

      toolbarService.updateSection('AdvancedRenderingControls', [
        'windowLevelMenuEmbedded',
        'voiManualControlMenu',
        'Colorbar',
        'opacityMenu',
        'thresholdMenu',
      ]);

      toolbarService.updateSection(toolbarService.sections.viewportActionMenu.topRight, [
        'modalityLoadBadge',
        'trackingStatus',
        'navigationComponent',
      ]);

      toolbarService.updateSection(toolbarService.sections.viewportActionMenu.bottomLeft, [
        'windowLevelMenu',
      ]);

      toolbarService.updateSection('MoreTools', [
        'Reset',
        'rotate-right',
        'flipHorizontal',
        'ReferenceLines',
        'ImageOverlayViewer',
        'StackScroll',
        'invert',
        'Cine',
        'Magnify',
        'TagBrowser',
      ]);

      toolbarService.updateSection(toolbarService.sections.labelMapSegmentationToolbox, [
        'LabelMapTools',
      ]);
      toolbarService.updateSection(toolbarService.sections.contourSegmentationToolbox, [
        'ContourTools',
      ]);

      toolbarService.updateSection('LabelMapTools', [
        'BrushTools',
        // Removed: LabelmapSlicePropagation, MarkerLabelmap, RegionSegmentPlus, Shapes, LabelMapEditWithContour
      ]);
      toolbarService.updateSection('ContourTools', [
        'PlanarFreehandContourSegmentationTool',
        'SculptorTool',
        'SplineContourSegmentationTool',
        'LivewireContourSegmentationTool',
      ]);

      toolbarService.updateSection(toolbarService.sections.labelMapSegmentationUtilities, [
        'LabelMapUtilities',
      ]);
      toolbarService.updateSection(toolbarService.sections.contourSegmentationUtilities, [
        'ContourUtilities',
      ]);

      toolbarService.updateSection('LabelMapUtilities', [
        // Moved InterpolateLabelmap to BrushTools
        // Removed: SegmentBidirectional
      ]);
      toolbarService.updateSection('ContourUtilities', [
        'LogicalContourOperations',
        'SimplifyContours',
        'SmoothContours',
      ]);

      // Removed Threshold from BrushTools, added InterpolateLabelmap
      toolbarService.updateSection('BrushTools', ['Brush', 'Eraser', 'InterpolateLabelmap']);

      const { unsubscribeAutoTabSwitchEvents } = setUpAutoTabSwitchHandler({
        segmentationService,
        viewportGridService,
        panelService,
      });

      _unsubscriptions.push(...unsubscribeAutoTabSwitchEvents);

      // Track if we've already loaded the reference segmentation
      let referenceSegmentationLoaded = false;
      let isReferenceSegmentationLoading = false;

      // Automatically load reference segmentation, hide it, and create user layer
      const loadReferenceSegmentation = async () => {
        if (referenceSegmentationLoaded || isReferenceSegmentationLoading) {
          return; // Already loaded or currently loading, skip
        }

        const displaySets = displaySetService.getActiveDisplaySets();

        // DEBUG: Log ALL display sets to understand what Orthanc is providing
        console.log('🔍 [AUTO-LOAD] All active display sets:', displaySets);
        console.log('🔍 [AUTO-LOAD] Number of display sets:', displaySets.length);

        // DEBUG: Log all SEG display sets and their metadata
        const segDisplaySets = displaySets.filter(ds => ds.Modality === 'SEG');
        console.log('🔍 [AUTO-LOAD] SEG display sets found:', segDisplaySets.length);
        segDisplaySets.forEach((ds, index) => {
          console.log(`🔍 [AUTO-LOAD] SEG #${index + 1}:`, {
            SeriesDescription: ds.SeriesDescription,
            SeriesNumber: ds.SeriesNumber,
            displaySetInstanceUID: ds.displaySetInstanceUID,
            Modality: ds.Modality,
            fullDisplaySet: ds,
          });
        });

        // Look for reference segmentation - now looking for 'Reference Segmentation'
        const segDisplaySet = displaySets.find(
          ds => ds.Modality === 'SEG' && ds.SeriesDescription === 'Reference Segmentation'
        );

        if (segDisplaySet) {
          console.log('✅ Found reference SEG DisplaySet:', segDisplaySet);
          isReferenceSegmentationLoading = true;

          try {
            // Load the SEG DisplaySet first (if not already loaded)
            console.log('📥 Loading SEG DisplaySet...');
            if (segDisplaySet.load) {
              await segDisplaySet.load({ headers: {} });
            }
            console.log('✅ SEG DisplaySet ready');

            // Create the segmentation
            const segmentationId =
              await segmentationService.createSegmentationForSEGDisplaySet(segDisplaySet);
            console.log('✅ Reference segmentation created:', segmentationId);

            // Store the ID for later use (e.g. revealing after submission)
            commandsManager.run('setReferenceSegmentationId', { segmentationId });

            // Add the segmentation as a representation to the active viewport
            const activeViewportId = viewportGridService.getActiveViewportId();
            if (activeViewportId) {
              // Add it first to ensure it exists in the viewport
              await segmentationService.addSegmentationRepresentation(activeViewportId, {
                segmentationId,
              });
              console.log('✅ Reference segmentation added to viewport:', activeViewportId);

              // HIDE IT IMMEDIATELY - Iterate over segments
              const segmentation = segmentationService.getSegmentation(segmentationId);
              if (segmentation && segmentation.segments) {
                const segmentIndices = Object.keys(segmentation.segments);
                for (const segmentIndex of segmentIndices) {
                  segmentationService.setSegmentVisibility(
                    activeViewportId,
                    segmentationId,
                    parseInt(segmentIndex),
                    false
                  );
                }
                console.log('🙈 Reference segmentation segments hidden');
              } else {
                console.warn('⚠️ Could not find segments to hide individually');
              }

              // Create a NEW segmentation for the user to draw on using the correct command
              const newSegmentationId = await commandsManager.run('createLabelmapForViewport', {
                viewportId: activeViewportId,
              });
              console.log('✨ Created new user segmentation layer:', newSegmentationId);

              // Customize the new segmentation
              if (newSegmentationId) {
                // 1. Rename Segmentation
                const segmentation = segmentationService.getSegmentation(newSegmentationId);
                if (segmentation) {
                  segmentation.label = 'User Segmentation';
                  // Force update if necessary, though direct property set might be enough depending on implementation
                  // segmentationService.updateSegmentation(newSegmentationId, { label: 'User Segmentation' });
                }

                // 2. Rename Segment 1 to 'Structure 1' and set Color to #F20505
                // Note: Newly created labelmap usually has segment index 1 active
                const segmentIndex = 1;

                // Update label
                segmentationService.setSegmentLabel(newSegmentationId, segmentIndex, 'Structure 1');

                // Update color (#1E19E2 is [30, 25, 226, 255])
                segmentationService.setSegmentColor(
                  activeViewportId,
                  newSegmentationId,
                  segmentIndex,
                  [30, 25, 226, 255]
                );

                console.log(
                  '🎨 Customized user segmentation: Name=User Segmentation, Segment=Structure 1, Color=#1E19E2'
                );

                // 3. Activate the Brush tool automatically
                // Use the tool name 'CircularBrush' which is the actual Cornerstone tool name
                setTimeout(() => {
                  commandsManager.run('setToolActive', {
                    toolName: 'CircularBrush',
                  });
                }, 100);
                console.log('🖌️ Brush tool (CircularBrush) activated automatically');
              }
            } else {
              console.warn('⚠️ No active viewport found');
            }

            // Mark as loaded to prevent duplicate attempts
            referenceSegmentationLoaded = true;

            console.log('✅ Reference segmentation loaded, hidden, and user layer created');
          } catch (error) {
            console.error('❌ Error loading reference segmentation:', error);
            // Reset loading flag on error so we can try again if needed
            isReferenceSegmentationLoading = false;
          }
        } else {
          // DEBUG: No exact match found, log a warning
          console.warn(
            '⚠️ [AUTO-LOAD] No SEG with SeriesDescription="Reference Segmentation" found'
          );

          // Try fallback to old name 'Segmentation' for backward compatibility
          const fallbackSegDisplaySet = displaySets.find(
            ds => ds.Modality === 'SEG' && ds.SeriesDescription === 'Segmentation'
          );

          if (fallbackSegDisplaySet) {
            console.warn(
              '⚠️ [AUTO-LOAD] Found SEG with old name "Segmentation" - consider renaming to "Reference Segmentation"'
            );
            console.log(
              'ℹ️ [AUTO-LOAD] You can manually rename this in your DICOM data to "Reference Segmentation"'
            );
          } else if (segDisplaySets.length > 0) {
            console.warn(
              '⚠️ [AUTO-LOAD] SEG files exist but none match expected names. Available names:',
              segDisplaySets.map(ds => ds.SeriesDescription)
            );
          } else {
            console.log('ℹ️ [AUTO-LOAD] No SEG display sets found in study - skipping auto-load');
          }
        }
      };

      // Subscribe to DISPLAY_SETS_ADDED to handle async loading
      const unsubscribeDisplaySetsAdded = displaySetService.subscribe(
        displaySetService.EVENTS.DISPLAY_SETS_ADDED,
        loadReferenceSegmentation
      );

      // Also try to load immediately in case display sets are already available
      loadReferenceSegmentation();

      _unsubscriptions.push(unsubscribeDisplaySetsAdded);
    },
    onModeExit: ({ servicesManager }: withAppTypes) => {
      const {
        toolGroupService,
        syncGroupService,
        segmentationService,
        cornerstoneViewportService,
        uiDialogService,
        uiModalService,
      } = servicesManager.services;

      // Remove the custom style injected for this mode
      if (typeof document !== 'undefined') {
        const styleId = 'seg-scorer-mode-style';
        const style = document.getElementById(styleId);
        if (style) {
          style.remove();
        }
      }

      _unsubscriptions.forEach(unsubscribe => unsubscribe());
      _unsubscriptions.length = 0;

      uiDialogService.hideAll();
      uiModalService.hide();
      toolGroupService.destroy();
      syncGroupService.destroy();
      segmentationService.destroy();
      cornerstoneViewportService.destroy();
    },
    /** */
    validationTags: {
      study: [],
      series: [],
    },
    /**
     * A boolean return value that indicates whether the mode is valid for the
     * modalities of the selected studies. Currently we don't have stack viewport
     * segmentations and we should exclude them
     */
    isValidMode: ({ modalities }) => {
      // Don't show the mode if the selected studies have only one modality
      // that is not supported by the mode
      const modalitiesArray = modalities.split('\\');
      return {
        valid:
          modalitiesArray.length === 1
            ? !['SM', 'ECG', 'OT', 'DOC'].includes(modalitiesArray[0])
            : true,
        description:
          'The mode does not support studies that ONLY include the following modalities: SM, OT, DOC',
      };
    },
    /**
     * Mode Routes are used to define the mode's behavior. A list of Mode Route
     * that includes the mode's path and the layout to be used. The layout will
     * include the components that are used in the layout. For instance, if the
     * default layoutTemplate is used (id: '@ohif/extension-default.layoutTemplateModule.viewerLayout')
     * it will include the leftPanels, rightPanels, and viewports. However, if
     * you define another layoutTemplate that includes a Footer for instance,
     * you should provide the Footer component here too. Note: We use Strings
     * to reference the component's ID as they are registered in the internal
     * ExtensionManager. The template for the string is:
     * `${extensionId}.{moduleType}.${componentId}`.
     */
    routes: [
      {
        path: 'template',
        layoutTemplate: ({ location, servicesManager }) => {
          return {
            id: ohif.layout,
            props: {
              // UPDATED: Removing the Studies Panel
              leftPanels: [],
              leftPanelResizable: true,
              rightPanels: [
                cornerstone.labelMapSegmentationPanel,
                // cornerstone.contourSegmentationPanel,
                '@ohif/extension-default.panelModule.scorePanel',
              ],
              rightPanelResizable: true,
              // leftPanelClosed: true,
              viewports: [
                {
                  namespace: cornerstone.viewport,
                  displaySetsToDisplay: [ohif.sopClassHandler],
                },
                {
                  namespace: segmentation.viewport,
                  displaySetsToDisplay: [segmentation.sopClassHandler],
                },
                {
                  namespace: dicomRT.viewport,
                  displaySetsToDisplay: [dicomRT.sopClassHandler],
                },
              ],
            },
          };
        },
      },
    ],
    /** List of extensions that are used by the mode */
    extensions: extensionDependencies,
    /** HangingProtocol used by the mode */
    // Commented out to just use the most applicable registered hanging protocol
    // The example is used for a grid layout to specify that as a preferred layout
    hangingProtocol: ['@ohif/mnGrid'],
    /** SopClassHandlers used by the mode */
    sopClassHandlers: [ohif.sopClassHandler, segmentation.sopClassHandler, dicomRT.sopClassHandler],
  };
}

const mode = {
  id,
  modeFactory,
  extensionDependencies,
};

export default mode;
