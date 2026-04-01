# TODO: Rotation Drag Bug

**Issue**: Dragging the perpendicular line in TopView does not rotate the monitor. The onPointerDown event on the circle handle does not trigger the rotation logic.

**Last code state** (commit ea7b5df or ff5bdfc):
- setPointerCapture was added to the circle handle
- The handlePointerMove in TopView should calculate new rotation based on dx

**Possible fixes to try**:
1. Add explicit onPointerMove/onPointerUp handlers directly on the circle element (not relying on SVG-level handlers)
2. Use a transparent wider hit area for the line
3. Check if there's a CSS/pointer-events issue blocking the events
4. Try using onMouseDown instead of onPointerDown
5. Add console.log to debug if events are firing
