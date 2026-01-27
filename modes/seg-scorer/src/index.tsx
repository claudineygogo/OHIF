import { DicomMetadataStore } from '@ohif/core';
import { id } from './id';
import toolbarButtons from './toolbarButtons';
import initToolGroups from './initToolGroups';
import setUpAutoTabSwitchHandler from './utils/setUpAutoTabSwitchHandler';
import StructureSelectionModal from './components/StructureSelectionModal';
import LoadingModal from './components/LoadingModal';

const ohif = {
  layout: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
  sopClassHandler: '@ohif/extension-default.sopClassHandlerModule.stack',
  hangingProtocol: '@ohif/extension-default.hangingProtocolModule.default',
  leftPanel: '@ohif/extension-default.panelModule.seriesList',
};

const cornerstone = {
  viewport: '@ohif/extension-cornerstone.viewportModule.cornerstone',
  labelMapSegmentationPanel:
    '@ohif/extension-cornerstone.panelModule.panelSegmentationWithToolsLabelMapScorer',
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
        uiModalService,
      } = servicesManager.services;

      // Add customization to show the submit button in the segmentation panel
      customizationService.setCustomizations({
        'panelSegmentation.showSubmitButton': {
          id: 'panelSegmentation.showSubmitButton',
          visible: true,
        },
        'layoutSelector.commonPresets': [
          {
            icon: 'layout-common-1x1',
            commandOptions: {
              numRows: 1,
              numCols: 1,
            },
          },
        ],
        'layoutSelector.advancedPresetGenerator': () => [
          {
            title: 'MPR',
            icon: 'layout-advanced-mpr',
            commandOptions: {
              protocolId: 'mpr',
              commandName: 'setHangingProtocolWithLoader',
            },
          },
          {
            title: 'Axial Primary',
            icon: 'layout-advanced-axial-primary',
            commandOptions: {
              protocolId: 'primaryAxial',
              commandName: 'setHangingProtocolWithLoader',
            },
          },
        ],
      });

      // Register custom command for layout switching with loader
      const contextName = 'seg-scorer';
      commandsManager.createContext(contextName);
      commandsManager.registerCommand(contextName, 'setHangingProtocolWithLoader', async props => {
        uiModalService.show({
          content: LoadingModal,
          contentProps: {
            message: 'Loading Layout...',
          },
          title: 'Please Wait',
          shouldCloseOnOverlayClick: false,
        });

        // Wait for UI to paint
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          await commandsManager.run('setHangingProtocol', props);
        } finally {
          // Keep loader for a moment to ensure rendering completes?
          // Or hide immediately? User layout sync logic might also run.
          // Let's add a small delay to ensure the heavy tasks in 'setHangingProtocol' which might be async-ish (like volume building)
          // have visually started.
          // Actually, the hanging protocol service is what takes time.
          setTimeout(() => uiModalService.hide(), 500);
        }
      });

      commandsManager.registerCommand(contextName, 'toggleCrosshairs', ({ toolGroupIds }) => {
        const toolGroupId = toolGroupIds ? toolGroupIds[0] : 'mpr';
        const toolGroup = toolGroupService.getToolGroup(toolGroupId);

        if (!toolGroup) {
          return;
        }

        const activeTool = toolGroup.getActivePrimaryMouseButtonTool();
        // Identify if Crosshairs is currently active
        const isCrosshairsActive = activeTool === 'Crosshairs';

        if (isCrosshairsActive) {
          // Toggle Off -> Revert to a default tool (e.g. WindowLevel)
          commandsManager.run('setToolActiveToolbar', {
            toolName: 'WindowLevel',
            toolGroupIds: [toolGroupId],
          });
        } else {
          // Toggle On
          commandsManager.run('setToolActiveToolbar', {
            toolName: 'Crosshairs',
            toolGroupIds: [toolGroupId],
          });
        }
      });

      // CSS HACK: Hide specific header elements for this mode
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
            /* Hide Settings Cogwheel */
            .absolute.right-0 > .flex-shrink-0:last-child {
               display: none !important;
            }
            /* Hide the 'Label map segmentations' panel header */
            .flex-shrink-0.overflow-hidden button[type="button"][aria-expanded] {
              display: none !important;
            }
            /* Hide the inner headers of the segmentation table */
            .bg-primary-dark.flex.h-10.w-full.items-center.space-x-1 {
               display: none !important;
            }
            /* Hide collapsed content if it appears */
            .collapsed-content {
               display: none !important;
            }
            /* Hide 'Shape' sub-element label in Tool Settings */
            .flex.items-center.justify-between.text-\\[13px\\] {
               display: none !important;
            }

            /* --- TAB VISIBILITY LOGIC --- */
            body:not(.grading-complete) div[data-cy="scorePanel-btn"] {
              display: none !important;
            }
            body.grading-complete div[data-cy="panelSegmentationWithToolsLabelMapScorer-btn"] {
              display: none !important;
            }
            body.grading-complete div[data-cy="scorePanel-btn"] {
              display: flex !important;
            }

            /* --- LAYOUT SELECTOR CUSTOMIZATION --- */
            [data-cy="layout-custom-grid"] {
              display: none !important;
            }

            /* --- VIEWPORT ELEMENTS HIDING --- */
            /* Hide arrow-left / top-right element */
            .pointer-events-auto.flex.items-center.absolute.top-\\[4px\\].right-\\[16px\\].right-viewport-scrollbar {
              display: none !important;
            }

            /* Hide acquisition date / top-left overlay */
            .absolute.pointer-events-none.viewport-overlay.overlay-top.left-viewport {
              display: none !important;
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
        'Reset',
        'Crosshairs',
        'Layout',
      ]);

      toolbarService.updateSection(toolbarService.sections.viewportActionMenu.topLeft, []);

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

      toolbarService.updateSection('LabelMapTools', ['BrushTools']);
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

      toolbarService.updateSection('LabelMapUtilities', []);
      toolbarService.updateSection('ContourUtilities', [
        'LogicalContourOperations',
        'SimplifyContours',
        'SmoothContours',
      ]);

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
      let referenceSegmentationId = null;

      // PARSE URL PARAMS
      const searchParams = new URLSearchParams(window.location.search);
      const urlPatientId = searchParams.get('patientId');
      const urlStructure = searchParams.get('structure'); // Track setup to prevent unexpected modal reopenings

      // Track if we have completed the setup (selection made) to prevent modal from reopening
      let setupComplete = false;

      // 4. Persistence
      const setSessionContext = (pid, struct) => {
        sessionStorage.setItem(
          'OHIF_SCORER_CONTEXT',
          JSON.stringify({
            patientId: pid,
            structureName: struct,
          })
        );
        console.log(`[SegScorer] Context set: ${pid} / ${struct}`);
        // Dispatch event for UI updates (e.g. StructureNameDisplay)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ohif:scorerContextUpdated', {
              detail: { structureName: struct },
            })
          );
        }
      };

      // Helper to ensure segmentation is added and has correct visibility in a viewport
      const updateViewportSegmentation = async (viewportId, segId, shouldHide) => {
        // 1. Ensure representation exists
        const segmentationRepresentations =
          segmentationService.getSegmentationRepresentations(viewportId);
        const hasRepresentation = segmentationRepresentations.some(
          rep => rep.segmentationId === segId
        );

        if (!hasRepresentation) {
          await segmentationService.addSegmentationRepresentation(viewportId, {
            segmentationId: segId,
          });
        }

        // 2. Set Visibility
        if (shouldHide) {
          const segmentation = segmentationService.getSegmentation(segId);
          if (segmentation && segmentation.segments) {
            const segmentIndices = Object.keys(segmentation.segments);
            for (const segmentIndex of segmentIndices) {
              segmentationService.setSegmentVisibility(
                viewportId,
                segId,
                parseInt(segmentIndex),
                false
              );
            }
          }
        } else {
          // If we represent it newly in "grading-complete" state (or it was hidden), ensure it is visible?
          // The user requirement implies it "appears" when submitted.
          // New representations default to visible.
          // But if it was previously hidden in this viewport, we might need to show it?
          // This helper is called on layout change.
          // If we simply don't hide it, it should be fine for new viewports.
          // For existing viewports, if it was hidden, the "Submit" action should have shown it.
          // Use case: User is in review mode, changes layout. New viewport needs rep.
          // Defaults to visible. Safe.
        }
      };

      const syncReferenceSegmentationOnLayout = async () => {
        if (!referenceSegmentationId) {
          return;
        }
        const state = viewportGridService.getState();
        const viewports = Array.from(state.viewports.keys());

        // Check grading state
        const isGradingComplete = document.body.classList.contains('grading-complete');
        const shouldHide = !isGradingComplete;

        // Apply to all viewports
        for (const viewportId of viewports) {
          // 1. Ensure Reference Segmentation is present (and set visibility)
          await updateViewportSegmentation(viewportId, referenceSegmentationId, shouldHide);

          // 2. Ensure User Segmentation is ON TOP (Rendered Last)
          const allSegmentations = segmentationService.getSegmentations();
          const userSegmentations = allSegmentations.filter(
            s => s.segmentationId !== referenceSegmentationId
          );

          for (const userSeg of userSegmentations) {
            const userSegId = userSeg.segmentationId;

            // Check if it exists in viewport
            const reps = segmentationService.getSegmentationRepresentations(viewportId);
            const isPresent = reps.some(r => r.segmentationId === userSegId);

            // Re-stacking logic:
            // If the user segmentation acts as the "active" layer, it should be top-most.
            // If we just added the Reference layer, it might now be on top.
            // By Removing and Re-Adding the User layer, we move it to the end of the render list.
            if (isPresent) {
              // Only re-stack if Reference is ALSO present (otherwise order doesn't matter)
              const refIsPresent = reps.some(r => r.segmentationId === referenceSegmentationId);
              if (refIsPresent) {
                // Get config before removing?
                // The service preserves segmentation data, but representation config (color/visibility) might reset?
                // Usually Segment visibility is stored in global state or hydrated config.
                // Ideally we shouldn't flicker.
                // Check indices?
                const refIndex = reps.findIndex(r => r.segmentationId === referenceSegmentationId);
                const userIndex = reps.findIndex(r => r.segmentationId === userSegId);

                if (refIndex > userIndex) {
                  // Reference is higher up (later in array) than User. Swap needed.
                  // Remove User
                  // Note: 'removeSegmentationRepresentations' takes an array of specs? No, singular in our helper usage.
                  // Actually segmentationService.removeSegmentationRepresentations(viewportId, spec)
                  segmentationService.removeSegmentationRepresentations(viewportId, {
                    segmentationId: userSegId,
                  });
                  // Add User back
                  await segmentationService.addSegmentationRepresentation(viewportId, {
                    segmentationId: userSegId,
                  });
                }
              }
            } else {
              // If User layer exists globally but not in this viewport (e.g. new viewport), add it!
              // This ensures multi-viewport sync for user layer too.
              await segmentationService.addSegmentationRepresentation(viewportId, {
                segmentationId: userSegId,
              });
            }
          }
        }
      };

      // Subscribe to layout changes
      _unsubscriptions.push(
        viewportGridService.subscribe(
          viewportGridService.EVENTS.GRID_STATE_CHANGED,
          syncReferenceSegmentationOnLayout
        )
      );

      // Automatically load reference segmentation
      // MODIFIED: Now accepts a specific targetSegId (simulating user selection)
      const loadReferenceSegmentation = async (targetStructureName, targetSegId) => {
        if (referenceSegmentationLoaded || isReferenceSegmentationLoading) {
          return;
        }

        const displaySets = displaySetService.getActiveDisplaySets();
        let segDisplaySet;

        if (targetSegId) {
          // 1. Direct ID match (Simulated User Click)
          segDisplaySet = displaySets.find(ds => ds.displaySetInstanceUID === targetSegId);
        } else {
          // 2. Fallback: This path should ideally not be reached if the "Simulated Modal" works
          // keeping it for safety
          console.warn(
            '[SegScorer] verifyAutoMatch: Calling load w/o ID. Attempting fallback fuzzy match...'
          );
          const lowerTarget = targetStructureName.toLowerCase();
          segDisplaySet = displaySets.find(
            ds =>
              ds.Modality === 'SEG' &&
              ((ds.SeriesDescription && ds.SeriesDescription.toLowerCase().includes(lowerTarget)) ||
                ((ds as unknown as Record<string, any>).segmentLabels &&
                  (ds as unknown as Record<string, any>).segmentLabels.some((label: string) =>
                    label.toLowerCase().includes(lowerTarget)
                  )))
          );
        }

        if (segDisplaySet) {
          console.log('✅ [SegScorer] Loading Reference SEG:', {
            id: segDisplaySet.displaySetInstanceUID,
            desc: segDisplaySet.SeriesDescription,
          });

          isReferenceSegmentationLoading = true;

          // SHOW LOADING SPINNER
          uiModalService.show({
            content: LoadingModal,
            contentProps: {
              message: 'Initializing Scoring Engine...',
            },
            title: 'Please Wait',
            shouldCloseOnOverlayClick: false,
          });

          try {
            // Load the SEG DisplaySet first
            if (segDisplaySet.load) {
              await segDisplaySet.load({ headers: {} }); // Force load to ensure content is ready
            }

            // Create the segmentation
            const segmentationId =
              await segmentationService.createSegmentationForSEGDisplaySet(segDisplaySet);

            // Store the ID
            commandsManager.run('setReferenceSegmentationId', { segmentationId });
            referenceSegmentationId = segmentationId;

            // Add to ALL viewports
            const state = viewportGridService.getState();
            const viewports = Array.from(state.viewports.keys());

            for (const viewportId of viewports) {
              // Add and Hide
              await updateViewportSegmentation(viewportId, segmentationId, true);
            }

            // Create User Layer
            const activeViewportId = viewportGridService.getActiveViewportId();
            if (activeViewportId) {
              const newSegmentationId = (await commandsManager.run('createLabelmapForViewport', {
                viewportId: activeViewportId,
              })) as string;
              console.log('✨ [SegScorer] User layer created:', newSegmentationId);

              // Customize User Layer
              if (newSegmentationId) {
                const segmentation = segmentationService.getSegmentation(newSegmentationId);
                if (segmentation) {
                  segmentation.label = 'User Segmentation';
                }

                const segmentIndex = 1;
                segmentationService.setSegmentLabel(
                  newSegmentationId,
                  segmentIndex,
                  targetStructureName || 'Structure 1'
                );
                // Set Color (Blue)
                segmentationService.setSegmentColor(
                  activeViewportId,
                  newSegmentationId,
                  segmentIndex,
                  [30, 25, 226, 255]
                );

                // Activate Brush
                setTimeout(() => {
                  commandsManager.run('setToolActive', {
                    toolName: 'CircularBrush',
                  });
                  // Open the Right Panel (Segmentation Tools) now that we are ready
                  // Using 'customizationService' or just forcing it open via commands not always standard
                  // But we can usually rely on 'setPanelOpen' if implemented, or we use panelService.
                  // Since we have panelService in scope:
                  // Note: The panelId must match what was registered.
                  // cornerstone.labelMapSegmentationPanel = '@ohif/extension-cornerstone.panelModule.panelSegmentationWithToolsLabelMap'

                  // Try to open it:
                  try {
                    // This is the preferred way in v3.8+ if available, but let's check legacy/default ways
                    if (panelService) {
                      // Activate the panel (makes it visible)
                      panelService.activatePanel(
                        '@ohif/extension-cornerstone.panelModule.panelSegmentationWithToolsLabelMapScorer',
                        true
                      );
                      // Or open it (expands the sidebar)
                      // Actually 'togglePanel' is common command.
                      // Let's assume manual toggle or activation.
                      // Ideally:
                      commandsManager.run('showPanel', {
                        id: '@ohif/extension-cornerstone.panelModule.panelSegmentationWithToolsLabelMapScorer',
                      });
                    }
                  } catch (e) {
                    console.warn('Could not auto-open panel', e);
                  }
                }, 100);
              }
            }
            referenceSegmentationLoaded = true;
          } catch (error) {
            console.error('❌ [SegScorer] Load failed:', error);
            isReferenceSegmentationLoading = false;
          } finally {
            uiModalService.hide();
          }
        }
      };

      // Modal Logic
      const showSelectionModal = () => {
        if (setupComplete) {
          return;
        }

        const displaySets = displaySetService.getActiveDisplaySets();
        // Filter for only SEG
        const segSets = displaySets.filter(ds => ds.Modality === 'SEG');

        // Extract PatientID from the first available display set if not in URL
        let currentPatientId = urlPatientId;
        if (!currentPatientId && displaySets.length > 0) {
          const ds = displaySets[0] as unknown as {
            StudyInstanceUID?: string;
            PatientID?: string;
            images?: { PatientID: string }[];
            instance?: { PatientID: string };
          };
          if (ds.StudyInstanceUID) {
            const study = DicomMetadataStore.getStudy(ds.StudyInstanceUID);
            if (study) {
              currentPatientId = study.PatientID;
            }
          }

          // Fallback
          if (!currentPatientId) {
            currentPatientId =
              ds.PatientID ||
              (ds.images && ds.images[0] && ds.images[0].PatientID) ||
              (ds.instance && ds.instance.PatientID);
          }
        }

        uiModalService.show({
          content: StructureSelectionModal,
          contentProps: {
            segDisplaySets: segSets,
            onSelect: ({ patientId, structureName, selectedSegId }) => {
              setupComplete = true; // Mark as complete to prevent reopening
              uiModalService.hide();
              setSessionContext(patientId, structureName);
              loadReferenceSegmentation(structureName, selectedSegId);
            },
            onClose: () => uiModalService.hide(),
            patientId: currentPatientId || 'Unknown Patient',
          },
          title: 'Welcome to Segmentation Scorer',
          // Prevent closing by clicking outside?
          shouldCloseOnOverlayClick: false,
        });
      };

      // Initialize Logic
      console.log('[SegScorer] 🚀 Mode initialization...');
      if (urlPatientId && urlStructure) {
        console.log(
          `[SegScorer] ✅ AUTOMATIC MODE: Patient=${urlPatientId}, Structure=${urlStructure}`
        );
        setSessionContext(urlPatientId, urlStructure);

        // --- SIMULATED MODAL AGENT ---
        // This function acts like the user staring at the modal and waiting for the right option to appear.
        const attemptAutoMatchAndLoad = () => {
          if (referenceSegmentationLoaded || isReferenceSegmentationLoading) {
            return;
          }

          const displaySets = displaySetService.getActiveDisplaySets();
          const segSets = displaySets.filter(ds => ds.Modality === 'SEG');

          if (segSets.length === 0) {
            return;
          }

          const activeViewportId = viewportGridService.getActiveViewportId();
          if (!activeViewportId) {
            return;
          }

          console.log(
            `[SegScorer] Background Agent: Searching for "${urlStructure}" among ${segSets.length} candidates...`
          );
          segSets.forEach(ds => console.log(` - Candidate: ${ds.SeriesDescription}`));

          // Standardize target
          const decodedStructure = decodeURIComponent(urlStructure);
          const target = decodedStructure.toLowerCase().trim();

          console.log(`[SegScorer] Background Agent: Target Structure (Raw): "${urlStructure}"`);
          console.log(
            `[SegScorer] Background Agent: Target Structure (Decoded): "${decodedStructure}"`
          );
          console.log(`[SegScorer] Background Agent: Target Structure (Normalized): "${target}"`);

          // Priority 1: Exact Match on Series Description
          let matchedSeg = segSets.find(
            ds => ds.SeriesDescription && ds.SeriesDescription.toLowerCase().trim() === target
          );

          // Priority 2: Fuzzy Match (Contains) on Series Description
          if (!matchedSeg) {
            matchedSeg = segSets.find(
              ds => ds.SeriesDescription && ds.SeriesDescription.toLowerCase().includes(target)
            );
          }

          // Priority 3: Check internal Segment Labels
          if (!matchedSeg) {
            matchedSeg = segSets.find(
              (ds: any) =>
                ds.segmentLabels &&
                ds.segmentLabels.some(label => label.toLowerCase().includes(target))
            );
          }

          if (matchedSeg) {
            console.log(
              `✅ [SegScorer] Background Agent: Match Found! Auto-selecting: ${matchedSeg.SeriesDescription} (UID: ${matchedSeg.displaySetInstanceUID})`
            );
            loadReferenceSegmentation(urlStructure, matchedSeg.displaySetInstanceUID);
          } else {
            console.warn(
              `[SegScorer] Background Agent: No match found yet for "${urlStructure}". Waiting for more data...`
            );
          }
        };

        // Subscribe to verify continuously
        const unsubscribeDS = displaySetService.subscribe(
          displaySetService.EVENTS.DISPLAY_SETS_ADDED,
          attemptAutoMatchAndLoad
        );
        _unsubscriptions.push(unsubscribeDS);

        // NEW: Also retry when viewport becomes active (crucial for user layer creation)
        const unsubscribeVP = viewportGridService.subscribe(
          viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
          attemptAutoMatchAndLoad
        );
        _unsubscriptions.push(unsubscribeVP);

        // Polling fall-back (Vital for race conditions)
        const intervalId = setInterval(attemptAutoMatchAndLoad, 2000);
        _unsubscriptions.push(() => clearInterval(intervalId));

        // Try immediately
        setTimeout(attemptAutoMatchAndLoad, 500);
      } else {
        console.log('[SegScorer] No URL Params. Waiting for data to show Modal...');
        // We need to wait until at least some display sets are loaded to show the modal with SEG options
        // Or just show it immediately with empty list if none

        // Better: subscribe, if we get sets, update?
        // Modal component updates?
        // For simplicity: Wait for first batch of display sets

        const handleDisplaySetsAdded = () => {
          const displaySets = displaySetService.getActiveDisplaySets();
          if (displaySets.length > 0) {
            showSelectionModal();
            // Unsubscribe single-shot? No, user might load more?
            // Actually we only want to show modal ONCE on start.
          }
        };

        const unsubscribe = displaySetService.subscribe(
          displaySetService.EVENTS.DISPLAY_SETS_ADDED,
          handleDisplaySetsAdded
        );
        _unsubscriptions.push(unsubscribe);

        // Check immediately
        if (displaySetService.getActiveDisplaySets().length > 0) {
          showSelectionModal();
        }
      }
    },
    onModeExit: ({ servicesManager, commandsManager }: withAppTypes) => {
      const {
        toolGroupService,
        syncGroupService,
        segmentationService,
        cornerstoneViewportService,
        uiDialogService,
        uiModalService,
      } = servicesManager.services;

      commandsManager.clearContext('seg-scorer');

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
                '@ohif/extension-cornerstone.panelModule.panelSegmentationWithToolsLabelMapScorer',
                // cornerstone.contourSegmentationPanel,
                '@ohif/extension-default.panelModule.scorePanel',
              ],
              rightPanelResizable: true,
              rightPanelClosed: true,
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
