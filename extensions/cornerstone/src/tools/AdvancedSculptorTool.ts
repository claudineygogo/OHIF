import { SculptorTool, Enums } from '@cornerstonejs/tools';

export default class AdvancedSculptorTool extends SculptorTool {
  static toolName = 'SculptorTool';

  constructor(toolProps = {}, defaultToolProps) {
    super(toolProps, defaultToolProps);

    // Capture the parent's mouseMoveCallback immediately after super()
    const parentMouseMoveCallback = this.mouseMoveCallback;

    // Override the mouseMoveCallback instance property
    this.mouseMoveCallback = evt => {
      // If not actively sculpting (dragging), try to auto-select the tool under cursor
      if (this.mode === Enums.ToolModes.Active && !this.isActive) {
        const eventData = evt.detail;
        this.selectFreehandTool(eventData);
      }

      // Call the original parent implementation
      if (parentMouseMoveCallback) {
        return parentMouseMoveCallback.call(this, evt);
      }
    };
  }
}
