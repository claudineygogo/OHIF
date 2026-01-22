import {
  PlanarFreehandContourSegmentationTool,
  utilities as cstUtils,
  drawing,
  Enums,
} from '@cornerstonejs/tools';
import { metaData, getEnabledElement } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';

const { ToolModes } = Enums;

/**
 * CircularStampContourTool - A tool that creates a circular contour on click.
 */
class CircularStampContourTool extends PlanarFreehandContourSegmentationTool {
  static toolName = 'CircularStampContourTool';
  _hoverData;
  _registeredElements;

  constructor(toolProps = {}) {
    super(toolProps);

    // Set defaults manually since the parent constructor signature is rigid
    if (this.configuration.defaultRadiusMM === undefined) {
      this.configuration.defaultRadiusMM = 10;
    }
    if (this.configuration.samples === undefined) {
      this.configuration.samples = 36;
    }

    // Capture parent mouseMoveCallback if it exists (it's likely an instance property)
    const parentMouseMoveCallback = this.mouseMoveCallback;

    this._registeredElements = new WeakSet();

    this.mouseMoveCallback = evt => {
      // 1. Update our cursor state
      if (this.mode === ToolModes.Active) {
        this._updateCursor(evt);

        const { element } = evt.detail;
        if (!this._registeredElements.has(element)) {
          element.addEventListener('pointerleave', this._mouseLeaveCallback);
          this._registeredElements.add(element);
        }
      }

      // 2. Call parent behavior (e.g. handle highlighting)
      if (parentMouseMoveCallback) {
        parentMouseMoveCallback.call(this, evt);
      }
    };

    this._mouseLeaveCallback = evt => {
      const element = evt.currentTarget;
      this._hideCursor(element);
    };

    // CRITICAL: We override addNewAnnotation Here in the constructor.
    // The parent class (PlanarFreehandROITool) assigns this.addNewAnnotation in its constructor.
    // To ensure we replace it, we must assign it AFTER super().
    this.addNewAnnotation = evt => {
      console.log('CircularStampContourTool: addNewAnnotation override EXECURED');

      const eventDetail = evt.detail;
      const { element, currentPoints } = eventDetail;
      const { world: worldPoint } = currentPoints;
      const enabledElement = getEnabledElement(element);
      const { viewport } = enabledElement;

      // 1. Create a standard annotation using the parent logic
      // This sets up UIDs, basic metadata, etc.
      const annotation = this.createAnnotation(evt);

      // 2. Generate the circle geometry
      const radiusMM = this.configuration.radiusMM ?? this.configuration.defaultRadiusMM;
      const samples = this.configuration.samples;
      const imageId = viewport.getCurrentImageId();

      if (imageId) {
        const instance = metaData.get('instance', imageId);
        if (instance) {
          const polylinePatient = this._buildCirclePolylineInPatientCoords(
            worldPoint,
            radiusMM,
            instance,
            samples
          );
          annotation.data.contour.polyline = polylinePatient;
          annotation.data.contour.closed = true;

          // Ensure FrameOfReferenceUID is set
          if (!annotation.metadata.FrameOfReferenceUID) {
            annotation.metadata.FrameOfReferenceUID = instance.FrameOfReferenceUID;
          }
        }
      }

      // 3. Mark as invalidated to trigger syncing
      annotation.invalidated = true;

      // 4. Add to state
      this.addAnnotation(annotation, element);

      // 5. Trigger a render so it appears immediately
      const viewportIdsToRender = [viewport.id];
      cstUtils.triggerAnnotationRenderForViewportIds(viewportIdsToRender);

      // 6. Return assignment
      return annotation;
    };
  }

  _hideCursor(element) {
    if (!this._hoverData) {
      return;
    }

    // We do NOT remove the event listener here.
    // This allows the listener to persist so it can fire again if the mouse re-enters and leaves.

    this._hoverData = undefined;

    if (element) {
      const enabledElement = getEnabledElement(element);
      if (enabledElement && enabledElement.viewport) {
        cstUtils.triggerAnnotationRenderForViewportIds([enabledElement.viewport.id]);
      }
    }
  }

  _updateCursor(evt) {
    const eventData = evt.detail;
    const { element } = eventData;
    const { currentPoints } = eventData;
    const centerCanvas = currentPoints.canvas;

    // Simple hover data structure
    this._hoverData = {
      centerCanvas,
      viewportIdsToRender: [getEnabledElement(element).viewport.id],
    };

    this._calculateCursor(element, centerCanvas);

    // Trigger render to show the cursor
    cstUtils.triggerAnnotationRenderForViewportIds(this._hoverData.viewportIdsToRender);
  }

  _calculateCursor(element, centerCanvas) {
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement;
    const { canvasToWorld } = viewport;
    const camera = viewport.getCamera();
    const radiusMM = this.configuration.radiusMM ?? this.configuration.defaultRadiusMM;

    const viewUp = vec3.fromValues(camera.viewUp[0], camera.viewUp[1], camera.viewUp[2]);
    const viewPlaneNormal = vec3.fromValues(
      camera.viewPlaneNormal[0],
      camera.viewPlaneNormal[1],
      camera.viewPlaneNormal[2]
    );
    const viewRight = vec3.create();
    vec3.cross(viewRight, viewUp, viewPlaneNormal);

    const centerCursorInWorld = canvasToWorld([centerCanvas[0], centerCanvas[1]]);

    // Calculate 4 points on the circle circumference in world space
    // Using radiusMM directly
    const bottomCursorInWorld = vec3.create();
    const topCursorInWorld = vec3.create();
    const leftCursorInWorld = vec3.create();
    const rightCursorInWorld = vec3.create();

    for (let i = 0; i <= 2; i++) {
      bottomCursorInWorld[i] = centerCursorInWorld[i] - viewUp[i] * radiusMM;
      topCursorInWorld[i] = centerCursorInWorld[i] + viewUp[i] * radiusMM;
      leftCursorInWorld[i] = centerCursorInWorld[i] - viewRight[i] * radiusMM;
      rightCursorInWorld[i] = centerCursorInWorld[i] + viewRight[i] * radiusMM;
    }

    this._hoverData.cursorPoints = [
      bottomCursorInWorld,
      topCursorInWorld,
      leftCursorInWorld,
      rightCursorInWorld,
    ];
  }

  renderAnnotation(enabledElement, svgDrawingHelper) {
    // 1. Render standard annotations (existing contours)
    super.renderAnnotation(enabledElement, svgDrawingHelper);

    // 2. Render our cursor preview if active/hovering AND tool is active
    if (this.mode !== ToolModes.Active) {
      return;
    }

    if (!this._hoverData || !this._hoverData.cursorPoints) {
      return;
    }

    const { viewport } = enabledElement;
    const viewportIdsToRender = this._hoverData.viewportIdsToRender;

    if (!viewportIdsToRender.includes(viewport.id)) {
      return;
    }

    const points = this._hoverData.cursorPoints;
    // Map world points to canvas
    const canvasCoordinates = points.map(p => viewport.worldToCanvas(p));
    const bottom = canvasCoordinates[0];
    const top = canvasCoordinates[1];

    // Calculate center and radius in canvas space
    // We approximate the circle in canvas space based on the top/bottom points
    // This assumes square pixels/parallel projection effectively for the cursor, which is close enough.
    const center = [(bottom[0] + top[0]) / 2, (bottom[1] + top[1]) / 2];
    const radius = Math.hypot(bottom[0] - top[0], bottom[1] - top[1]) / 2;

    const color = 'rgb(0, 255, 0)'; // Green cursor

    // Unique UID for the cursor
    const annotationUID = 'stamp-cursor-preview';
    const circleUID = '0';

    drawing.drawCircle(svgDrawingHelper, annotationUID, circleUID, center, radius, {
      color,
      lineWidth: 2,
    });
  }

  _buildCirclePolylineInPatientCoords(center, radiusMM, instance, samples = 36) {
    const { ImageOrientationPatient } = instance;
    const IOP = ImageOrientationPatient;

    const rowDir = [IOP[0], IOP[1], IOP[2]];
    const colDir = [IOP[3], IOP[4], IOP[5]];

    const polyline = [];
    for (let i = 0; i < samples; i++) {
      const theta = (2 * Math.PI * i) / samples;
      const off = [
        Math.cos(theta) * radiusMM * colDir[0] + Math.sin(theta) * radiusMM * rowDir[0],
        Math.cos(theta) * radiusMM * colDir[1] + Math.sin(theta) * radiusMM * rowDir[1],
        Math.cos(theta) * radiusMM * colDir[2] + Math.sin(theta) * radiusMM * rowDir[2],
      ];
      polyline.push([center[0] + off[0], center[1] + off[1], center[2] + off[2]]);
    }
    // Close the loop
    polyline.push([...polyline[0]]);
    return polyline;
  }
}

export default CircularStampContourTool;
