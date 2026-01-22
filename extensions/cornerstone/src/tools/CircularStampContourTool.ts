import { PlanarFreehandContourSegmentationTool, utilities as cstUtils } from '@cornerstonejs/tools';
import { metaData, getEnabledElement } from '@cornerstonejs/core';

/**
 * CircularStampContourTool - A tool that creates a circular contour on click.
 */
class CircularStampContourTool extends PlanarFreehandContourSegmentationTool {
  static toolName = 'CircularStampContourTool';

  constructor(toolProps = {}) {
    super(toolProps);

    // Set defaults manually since the parent constructor signature is rigid
    if (this.configuration.defaultRadiusMM === undefined) {
      this.configuration.defaultRadiusMM = 10;
    }
    if (this.configuration.samples === undefined) {
      this.configuration.samples = 36;
    }

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

      // 4. Add the annotation to the tool state
      this.addAnnotation(annotation, element);

      // 5. Trigger a render so it appears immediately
      const viewportIdsToRender = [viewport.id];
      cstUtils.triggerAnnotationRenderForViewportIds(viewportIdsToRender);

      // 6. Return assignment (important for internal logic)
      return annotation;
    };
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
