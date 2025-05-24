# Enhanced Container Node Drag-and-Drop Implementation

## Overview
This implementation adds enhanced drag-and-drop functionality to container nodes in the JointJS application, allowing nodes to be dragged into and out of containers with visual feedback and automatic embedding/unembedding behavior.

## Features Implemented

### 1. Drag-and-Drop into Containers
- **Target Nodes**: All node types except Start and End nodes can be dragged into container nodes
- **Visual Feedback**: When dragging a node over a container, the container's border displays a light red shadow/highlight effect
- **Embedding Logic**: When the mouse button is released while hovering over a container, the dragged node is automatically embedded inside the container
- **Style Reset**: After successful drop, the container's border styling returns to normal

### 2. Container Movement Behavior
- **Automatic Group Movement**: JointJS's built-in `embeddingMode` automatically handles moving embedded nodes when their parent container moves
- **Relative Positioning**: The relative positions of embedded nodes within the container are maintained during movement
- **Native Implementation**: Uses JointJS's native embedding functionality for robust and reliable container-child relationships

### 3. Drag-and-Drop out of Containers
- **Boundary Detection**: Nodes that are currently embedded in container nodes can be dragged out of the container
- **Automatic Unembedding**: When dragging an embedded node outside the container boundaries, it is automatically removed from the container's embedded elements
- **Independence**: The node becomes independent again after being moved out

### 4. Visual Feedback System
- **Highlight Effects**: Clear visual indicators (light red border shadow) when hovering over valid drop targets
- **Smooth Transitions**: CSS transitions for smooth border styling changes
- **Enhanced Styling**: Additional CSS classes for improved visual feedback

## Technical Implementation

### Files Modified

#### 1. `js/core/graph.js`
**New Event Handlers:**
- `handleElementPointerDown()`: Tracks when dragging starts for non-container, non-start/end nodes
- `handleElementPointerUp()`: Handles container embedding logic when dragging ends
- `handleDragOverContainers()`: Provides visual feedback during drag operations

**Enhanced Methods:**
- `highlightContainer()`: Adds visual highlight to containers during drag-over
- `clearContainerHighlight()`: Removes visual highlight
- `handleContainerEmbedding()`: Main logic for embedding/unembedding nodes
- `removeFromAllContainers()`: Utility to remove node from all containers

**State Management:**
- Added `isDragging`, `draggedNode`, `hoveredContainer` to application state
- Enhanced `element:pointermove` event to handle drag feedback

#### 2. `index.html`
**New CSS Styles:**
```css
/* 容器拖拽高亮效果 */
.container-drag-highlight {
    stroke: #ff6b6b !important;
    stroke-width: 2 !important;
    filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.5)) !important;
    transition: all 0.2s ease !important;
}

/* 拖拽状态下的光标 */
.dragging-cursor {
    cursor: grabbing !important;
}

/* 容器节点悬停效果增强 */
.container-hover-effect {
    transition: all 0.2s ease;
}
```

**JointJS Paper Configuration:**
- Added `embeddingMode: true` to enable automatic embedding functionality
- Added `validateEmbedding` function to control which elements can be embedded
- Added `findParentBy: 'bbox'` for bounding box-based parent detection

#### 3. `js/core/constants.js`
**Configuration Updates:**
- Maintained existing `mouseMoveDebounceDelay` configuration
- Ensured proper debounce timing for smooth drag operations

### Key Algorithms

#### Container Detection Algorithm
```javascript
isElementInContainer(element, container) {
    const bbox = container.getBBox();
    const elementBBox = element.getBBox();
    const center = elementBBox.center();

    return center.x > bbox.x &&
           center.x < bbox.x + bbox.width &&
           center.y > bbox.y &&
           center.y < bbox.y + bbox.height;
}
```

#### Embedding Logic Flow
1. **Drag Start**: Mark node as being dragged (`isDragging = true`)
2. **Drag Move**: Check if node is over any container and provide visual feedback
3. **Drag End**:
   - If over container: embed node and adjust position
   - If not over container: remove from all containers
   - Clear all visual feedback

#### JointJS Native Embedding
The implementation leverages JointJS's built-in embedding functionality:
```javascript
// Paper configuration enables automatic embedding
embeddingMode: true,
findParentBy: 'bbox',
validateEmbedding: (childView, parentView) => {
    const child = childView.model;
    const parent = parentView.model;

    // Only container nodes can be parents
    if (!parent.isContainer) return false;

    // Start/End nodes cannot be embedded
    if (this.isStartOrEndNode && this.isStartOrEndNode(child)) return false;

    // Containers cannot be nested
    if (child.isContainer) return false;

    return true;
}
```

## Usage Instructions

### For Users
1. **Drag into Container**: Drag any regular node over a container node to see the red highlight effect
2. **Drop to Embed**: Release the mouse button while over the container to embed the node
3. **Move Container**: Drag the container to move all embedded nodes together
4. **Drag out**: Drag an embedded node outside the container boundaries to unembed it

### For Developers
1. **Container Identification**: Ensure container nodes have `isContainer = true` property
2. **Node Exclusions**: Start and End nodes are automatically excluded from embedding
3. **Event Handling**: The system automatically handles all drag-and-drop events
4. **Visual Feedback**: CSS classes are automatically applied and removed

## Testing

### Test File: `test-container-drag-drop.html`
A dedicated test file has been created to verify the functionality:
- Creates a container node and three regular nodes
- Provides visual instructions for testing
- Demonstrates all implemented features

### Test Scenarios
1. **Basic Embedding**: Drag node1 into the container
2. **Visual Feedback**: Observe red highlight during drag-over
3. **Group Movement**: Move container with embedded nodes
4. **Unembedding**: Drag embedded node outside container
5. **Multiple Nodes**: Test with multiple nodes in the same container

## Browser Compatibility
- Modern browsers supporting ES6+ features
- CSS3 transitions and filters
- JointJS 3.7.7 compatibility

## Performance Considerations
- Debounced mouse move events (10ms delay)
- Efficient container detection using bounding box calculations
- Minimal DOM manipulation for visual feedback
- Optimized event handling to prevent performance issues

## Future Enhancements
- Support for nested containers (containers within containers)
- Configurable visual feedback styles
- Drag-and-drop validation rules
- Undo/redo support for embedding operations
- Keyboard shortcuts for embedding/unembedding
