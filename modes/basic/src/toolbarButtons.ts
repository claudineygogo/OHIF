import { Types } from '@ohif/core';
import i18n from 'i18next';

export const setToolActiveToolbar = {
  commandName: 'setToolActiveToolbar',
  commandOptions: {
    toolGroupIds: ['default', 'mpr', 'SRToolGroup', 'volume3d'],
  },
};

const toolbarButtons: Types.Button[] = [
  {
    id: 'Zoom',
    uiType: 'ohif.toolButton',
    props: {
      type: 'tool',
      icon: 'tool-zoom',
      label: i18n.t('Buttons:Zoom'),
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'Pan',
    uiType: 'ohif.toolButton',
    props: {
      type: 'tool',
      icon: 'tool-move',
      label: i18n.t('Buttons:Pan'),
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'TrackballRotate',
    uiType: 'ohif.toolButton',
    props: {
      type: 'tool',
      icon: 'tool-3d-rotate',
      label: i18n.t('Buttons:3D Rotate'),
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'WindowLevel',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-window-level',
      label: i18n.t('Buttons:Window Level'),
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'Capture',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-capture',
      label: i18n.t('Buttons:Capture'),
      commands: 'showDownloadViewportModal',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'Layout',
    uiType: 'ohif.layoutSelector',
    props: {
      rows: 3,
      columns: 4,
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'Crosshairs',
    uiType: 'ohif.toolButton',
    props: {
      type: 'tool',
      icon: 'tool-crosshair',
      label: i18n.t('Buttons:Crosshairs'),
      commands: {
        commandName: 'setToolActiveToolbar',
        commandOptions: {
          toolGroupIds: ['mpr'],
        },
      },
      evaluate: {
        name: 'evaluate.cornerstoneTool',
        disabledText: 'Select an MPR viewport to enable this tool',
      },
    },
  },
  {
    id: 'MoreTools',
    uiType: 'ohif.toolButtonList',
    props: {
      buttonSection: true,
    },
  },
  {
    id: 'SubmitContour',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-more-menu',
      label: 'Submit Contour',
      tooltip: 'Submit Contour for Grading',
      commands: 'submitContourForGrading',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'SegmentLabelTool',
    uiType: 'ohif.toolBoxButton',
    props: {
      icon: 'tool-segment-label',
      label: i18n.t('Buttons:Segment Label Display'),
      tooltip: i18n.t(
        'Buttons:Click to show or hide segment labels when hovering with your mouse.'
      ),
      commands: { commandName: 'toggleSegmentLabel' },
      evaluate: [
        'evaluate.cornerstoneTool.toggle',
        { name: 'evaluate.cornerstone.hasSegmentation' },
      ],
    },
  },
];

export default toolbarButtons;
