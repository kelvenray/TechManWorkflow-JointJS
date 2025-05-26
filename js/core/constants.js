// 应用配置常量
const CONFIG = {
  canvas: {
    gridSize: 10,
    background: '#f8f9fa',
    minScale: 0.3,
    maxScale: 2.0,
    scaleStep: 0.1,
    sidebarWidth: 140
  },
  nodes: {
    defaultSize: { width: 120, height: 60 },
    colors: {
      start: '#4caf50',
      startStroke: '#388e3c',
      end: '#f44336',
      endStroke: '#b71c1c',
      process: '#2196f3',
      processStroke: '#1565c0',
      decision: '#ffeb3b',
      decisionStroke: '#fbc02d',
      switch: '#9c27b0',
      switchStroke: '#6a1b9a',
      container: '#FFFFFF',
      containerStroke: '#CCCCCC',
      groupSetting: '#ff9800',
      groupSettingStroke: '#e65100'
    },
    sizes: {
      start: { width: 80, height: 80 },
      end: { width: 80, height: 80 },
      process: { width: 120, height: 80 },
      decision: { width: 120, height: 120 },
      switch: { width: 140, height: 80 },
      container: { width: 300, height: 240 },
      groupSetting: { width: 140, height: 80 }
    }
  },
  ui: {
    minimapSize: { width: 220, height: 180 },
    minimapScale: 0.15,
    iconSize: 16,
    resizeHandleSize: 12,
    debounceDelay: 20, // 一般防抖延迟，适用于大多数事件
    mouseMoveDebounceDelay: 10, // 鼠标移动事件的特定延迟（较短以保持良好的用户体验）
    dragThrottleDelay: 5, // 拖拽操作的节流延迟（非常短以确保平滑的拖拽体验）
    hideIconDelay: 300
  },
  ports: {
    radius: 4,
    hoverRadius: 5,
    opacity: {
      hidden: 0,
      visible: 1
    }
  }
};

// 端口分组配置
const PORT_GROUPS = {
  bottom: {
    position: { name: 'bottom' },
    attrs: {
      circle: {
        r: CONFIG.ports.radius,
        magnet: true,
        stroke: '#333',
        strokeWidth: 1,
        fill: '#fff',
        cursor: 'crosshair',
        opacity: CONFIG.ports.opacity.hidden
      }
    },
    markup: [
      {
        tagName: 'circle',
        selector: 'circle',
        attributes: {
          'r': CONFIG.ports.radius,
          'magnet': 'true',
          'fill': '#fff',
          'stroke': '#333',
          'stroke-width': 1
        }
      }
    ]
  },
  switchPorts: {
    position: function(ports, elBBox) {
      if (ports.length === 1) {
        return [{ x: elBBox.width / 2, y: elBBox.height }];
      } else if (ports.length > 1) {
        const spacing = elBBox.width / (ports.length + 1);
        return ports.map((port, index) => {
          return {
            x: spacing * (index + 1),
            y: elBBox.height
          };
        });
      }
      return [];
    },
    attrs: {
      circle: {
        r: CONFIG.ports.radius,
        magnet: true,
        stroke: '#333',
        strokeWidth: 1,
        fill: '#fff',
        cursor: 'crosshair',
        opacity: CONFIG.ports.opacity.hidden
      }
    },
    markup: [
      {
        tagName: 'circle',
        selector: 'circle',
        attributes: {
          'r': CONFIG.ports.radius,
          'magnet': 'true',
          'fill': '#fff',
          'stroke': '#333',
          'stroke-width': 1
        }
      }
    ]
  }
};

// 键盘快捷键配置
const SHORTCUTS = {
  'Ctrl+Z': 'undo',
  'Ctrl+Y': 'redo',
  'Ctrl+S': 'save',
  'Ctrl+A': 'selectAll',
  'Delete': 'deleteSelected',
  'Backspace': 'deleteSelected',
  'Escape': 'clearSelection',
  'Ctrl++': 'zoomIn',
  'Ctrl+=': 'zoomIn',
  'Ctrl+-': 'zoomOut',
  'Ctrl+0': 'resetZoom',
  'Ctrl+M': 'toggleMinimap',
  'Space': 'panMode'
};

// 节点类型定义
const NODE_TYPES = {
  START: 'start',
  END: 'end',
  PROCESS: 'process',
  DECISION: 'decision',
  SWITCH: 'switch',
  CONTAINER: 'container',
  GROUP_SETTING: 'groupSetting'
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, PORT_GROUPS, SHORTCUTS, NODE_TYPES };
} else {
  window.CONFIG = CONFIG;
  window.PORT_GROUPS = PORT_GROUPS;
  window.SHORTCUTS = SHORTCUTS;
  window.NODE_TYPES = NODE_TYPES;
}
