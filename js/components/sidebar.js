/**
 * 侧边栏组件
 * 提供节点拖拽面板和工具栏
 */
class Sidebar {
  /**
   * @param {WorkflowApp} app
   */
  constructor(app) {
    /**
     * @type {WorkflowApp}
     */
    this.app = app;
    /**
     * @type {NodeManager}
     */
    this.nodeManager = new NodeManager(app);
    /**
     * @type {EventManager}
     */
    this.eventManager = new EventManager();
    /**
     * @type {HTMLElement|null}
     */
    this.element = null;
    /**
     * @type {boolean}
     */
    this.isDragging = false;
  }

  /**
   * 初始化侧边栏
   */
  init() {
    try {
      this.createElement();
      if (!this.element) {
        throw new Error('Sidebar element not created');
      }
      this.createNodeItems();
      this.setupEvents();

      console.log('侧边栏初始化完成');
    } catch (error) {
      // ts(a14e0462)
      if (error instanceof Error) {
        ErrorHandler.handle(error, '侧边栏初始化');
      } else {
        ErrorHandler.handle(new Error(String(error)), '侧边栏初始化');
      }
    }
  }

  /**
   * 创建侧边栏元素
   */
  createElement() {
    this.element = DOMUtils.createElement('div', {
      id: 'sidebar',
      style: {
        width: CONFIG.canvas.sidebarWidth + 'px',
        height: '100vh',
        backgroundColor: '#f5f5f5',
        borderRight: '1px solid #ddd',
        position: 'fixed',
        left: '0',
        top: '0',
        zIndex: '1000',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '10px'
      }
    });

    // 添加标题
    const title = DOMUtils.createElement('h3', {
      style: {
        margin: '0 0 15px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center'
      }
    }, '工作流节点');

    if (this.element) { // Null check for TypeScript
      this.element.appendChild(title);
    }
    document.body.appendChild(this.element);
  }

  /**
   * 创建节点项
   */
  createNodeItems() {
    const nodeTypes = [
      { type: NODE_TYPES.START, label: '开始', color: CONFIG.nodes.colors.start },
      { type: NODE_TYPES.END, label: '结束', color: CONFIG.nodes.colors.end },
      { type: NODE_TYPES.PROCESS, label: 'Grouping', color: CONFIG.nodes.colors.process },
      { type: NODE_TYPES.DECISION, label: '决策', color: CONFIG.nodes.colors.decision },
      { type: NODE_TYPES.SWITCH, label: 'Switch', color: CONFIG.nodes.colors.switch },
      { type: NODE_TYPES.CONTAINER, label: '容器', color: CONFIG.nodes.colors.container }
    ];

    nodeTypes.forEach(nodeType => {
      const item = this.createNodeItem(nodeType);
      if (this.element) { // Null check for TypeScript
        this.element.appendChild(item);
      }
    });
  }

  /**
   * 创建单个节点项
   * @param {{type: string, label: string, color: string}} nodeType
   * @returns {HTMLElement}
   */
  createNodeItem(nodeType) {
    const item = DOMUtils.createElement('div', {
      class: 'node-item',
      'data-node-type': nodeType.type,
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px',
        margin: '5px 0',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'grab',
        transition: 'all 0.2s',
        userSelect: 'none'
      }
    });

    // 节点图标
    const icon = DOMUtils.createElement('div', {
      style: {
        width: '20px',
        height: '20px',
        backgroundColor: nodeType.color,
        border: '2px solid ' + this.getDarkerColor(nodeType.color),
        borderRadius: nodeType.type === NODE_TYPES.START || nodeType.type === NODE_TYPES.END ? '50%' : '4px',
        marginRight: '10px',
        flexShrink: '0'
      }
    });

    // 节点标签
    const label = DOMUtils.createElement('span', {
      style: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#333'
      }
    }, nodeType.label);

    item.appendChild(icon);
    item.appendChild(label);

    // 悬停效果
    this.setupNodeItemHover(item);

    return item;
  }

  /**
   * 获取更深的颜色
   * @param {string} color
   * @returns {string}
   */
  getDarkerColor(color) {
    // 简单的颜色加深算法
    const colorMap = {
      '#4caf50': '#388e3c',
      '#f44336': '#b71c1c',
      '#2196f3': '#1565c0',
      '#ffeb3b': '#fbc02d',
      '#9c27b0': '#6a1b9a',
      '#FFFFFF': '#CCCCCC'
    };
    // ts(0f297f45)
    return colorMap[/** @type {keyof typeof colorMap} */ (color)] || color;
  }

  /**
   * 设置节点项悬停效果
   * @param {HTMLElement} item
   */
  setupNodeItemHover(item) {
    this.eventManager.addEventListener(item, 'mouseenter', () => {
      if (!this.isDragging) {
        item.style.backgroundColor = '#e3f2fd';
        item.style.borderColor = '#2196f3';
        item.style.transform = 'translateX(2px)';
      }
    });

    this.eventManager.addEventListener(item, 'mouseleave', () => {
      if (!this.isDragging) {
        item.style.backgroundColor = '#fff';
        item.style.borderColor = '#ddd';
        item.style.transform = 'translateX(0)';
      }
    });
  }

  /**
   * 设置事件
   */
  setupEvents() {
    if (!this.element) return; // Guard against null element

    // 拖拽开始
    this.eventManager.addEventListener(this.element, 'mousedown', (/** @type {MouseEvent} */ e) => {
      // ts(65c4a8d8), ts(b8e69a45)
      if (e.target instanceof Element) {
        const nodeItem = /** @type {HTMLElement} */ (e.target.closest('.node-item'));
        if (nodeItem) {
          this.startDrag(e, nodeItem);
        }
      }
    });

    // 全局拖拽移动 - 使用防抖处理
    const debouncedDragMove = debounce((/** @type {MouseEvent} */ e) => {
      if (this.isDragging) {
        this.handleDrag(e);
      }
    }, CONFIG.ui.mouseMoveDebounceDelay, false, true);

    this.eventManager.addEventListener(document, 'mousemove', debouncedDragMove);

    // 全局拖拽结束
    this.eventManager.addEventListener(document, 'mouseup', (/** @type {MouseEvent} */ e) => {
      if (this.isDragging) {
        this.endDrag(e);
      }
    });

    // 防止文本选择
    this.eventManager.addEventListener(this.element, 'selectstart', (/** @type {Event} */ e) => {
      e.preventDefault();
    });
  }

  /**
   * 开始拖拽
   * @param {MouseEvent} e
   * @param {HTMLElement} nodeItem
   */
  startDrag(e, nodeItem) {
    e.preventDefault();

    this.isDragging = true;
    const nodeTypeFromDataset = nodeItem.dataset.nodeType;

    // ts(9a832957)
    const nodeType = nodeTypeFromDataset || null;

    // 更新应用状态
    this.app.state.dragType = /** @type {any} */ (nodeType);
    this.app.state.draggedElement = nodeItem;

    // 创建拖拽预览
    this.createDragPreview(nodeItem, e);

    // 更新节点项样式
    nodeItem.style.opacity = '0.5';
    nodeItem.style.transform = 'scale(0.95)';

    console.log('开始拖拽节点:', nodeType);
  }

  /**
   * 创建拖拽预览
   * @param {HTMLElement} nodeItem
   * @param {MouseEvent} e
   */
  createDragPreview(nodeItem, e) {
    const previewNode = nodeItem.cloneNode(true);
    // ts(70453583), ts(3a034ed4) etc.
    if (!(previewNode instanceof HTMLElement)) {
      return; // Should not happen if nodeItem is HTMLElement
    }
    const preview = /** @type {HTMLElement} */ (previewNode);

    preview.id = 'drag-preview';
    preview.style.position = 'fixed';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '10000';
    preview.style.opacity = '0.8';
    preview.style.transform = 'scale(0.9)';
    preview.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';

    document.body.appendChild(preview);

    // 初始位置
    this.updateDragPreviewPosition(e);
  }

  /**
   * 处理拖拽移动
   * @param {MouseEvent} e
   */
  handleDrag(e) {
    this.updateDragPreviewPosition(e);

    // 检查是否在画布区域
    const paperContainer = document.getElementById('paper-container');
    if (paperContainer) {
      const rect = paperContainer.getBoundingClientRect();
      const isOverCanvas = e.clientX >= rect.left &&
                          e.clientX <= rect.right &&
                          e.clientY >= rect.top &&
                          e.clientY <= rect.bottom;

      // 更新预览样式
      const preview = document.getElementById('drag-preview');
      if (preview) {
        preview.style.borderColor = isOverCanvas ? '#4caf50' : '#f44336';
      }
    }
  }

  /**
   * 更新拖拽预览位置
   * @param {MouseEvent} e
   */
  updateDragPreviewPosition(e) {
    const preview = document.getElementById('drag-preview');
    if (preview) {
      preview.style.left = (e.clientX - 60) + 'px';
      preview.style.top = (e.clientY - 20) + 'px';
    }
  }

  /**
   * 结束拖拽
   * @param {MouseEvent} e
   */
  endDrag(e) {
    if (!this.isDragging) return;

    console.log('结束拖拽');

    try {
      // 检查是否在画布区域释放
      const paperContainer = document.getElementById('paper-container');
      if (paperContainer) {
        const rect = paperContainer.getBoundingClientRect();
        const isOverCanvas = e.clientX >= rect.left &&
                            e.clientX <= rect.right &&
                            e.clientY >= rect.top &&
                            e.clientY <= rect.bottom;

        if (isOverCanvas) {
          this.createNodeAtPosition(e, rect);
        }
      }
    } catch (error) {
      // ts(76aae0ee)
      if (error instanceof Error) {
        ErrorHandler.handle(error, '处理节点放置');
      } else {
        ErrorHandler.handle(new Error(String(error)), '处理节点放置');
      }
    } finally {
      // 恢复被拖拽的侧边栏节点项的样式
      if (this.app.state.draggedElement && this.app.state.draggedElement instanceof HTMLElement) {
        const originalItem = /** @type {HTMLElement} */ (this.app.state.draggedElement);
        originalItem.style.opacity = '1';
        originalItem.style.transform = 'translateX(0)'; // Reset to non-hovered transform
        originalItem.style.backgroundColor = '#fff';    // Reset to non-hovered background
        originalItem.style.borderColor = '#ddd';      // Reset to non-hovered border
      }

      // 清理拖拽预览
      const preview = document.getElementById('drag-preview');
      if (preview) {
        preview.remove();
      }

      // 重置状态
      this.isDragging = false;
      this.app.state.dragType = null;
      this.app.state.draggedElement = null;

      console.log('拖拽状态已重置');
    }
  }

  /**
   * 在指定位置创建节点
   * @param {MouseEvent} e
   * @param {DOMRect} canvasRect
   */
  createNodeAtPosition(e, canvasRect) {
    const nodeType = this.app.state.dragType;
    // ts(12741a46)
    if (!nodeType) {
      console.warn('No nodeType specified for drop operation');
      this.cleanupDragState(); // Ensure state is cleaned up
      return;
    }

    // Revert to using this.app.paper, ts(82881d77)
    const paper = this.app.paper;
    // if (!(paper instanceof SVGElement)) { // This check might be needed if paper type is broad
    //   console.error('Paper is not an SVGElement');
    //   return;
    // }

    // 转换坐标到SVG坐标系
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    const svgCoord = CoordinateUtils.screenToSvg(paper, x, y);

    try {
      // 创建节点
      const node = this.nodeManager.createNode(nodeType, svgCoord.x, svgCoord.y);

      if (node) {
        console.log('成功创建' + nodeType + '节点:', node.id);
        // ts(9abcfde8)
        // @ts-ignore
        this.app.eventManager.emit('nodeDropped', { node: node, event: e });

      }
    } catch (error) {
      // ts(f0e82c5b)
      if (error instanceof Error) {
        ErrorHandler.handle(error, '创建节点失败');
      } else {
        ErrorHandler.handle(new Error(String(error)), '创建节点失败');
      }
    }
  }

  /**
   * 清理拖拽状态
   */
  cleanupDragState() {
    // 移除拖拽预览
    const preview = document.getElementById('drag-preview');
    if (preview) {
      DOMUtils.safeRemove(preview);
    }

    // 重置拖拽状态
    this.isDragging = false;
    this.app.state.dragType = null;

    // 重置被拖拽元素样式
    if (this.app.state.draggedElement && this.app.state.draggedElement instanceof HTMLElement) {
      const originalItem = /** @type {HTMLElement} */ (this.app.state.draggedElement);
      originalItem.style.opacity = '1';
      originalItem.style.transform = 'translateX(0)';
      this.app.state.draggedElement = null;
    }
  }

  /**
   * 显示侧边栏
   */
  show() {
    if (this.element) {
      this.element.style.display = 'block';
    }
  }

  /**
   * 隐藏侧边栏
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * 切换侧边栏显示状态
   */
  toggle() {
    if (this.element) {
      const isVisible = this.element.style.display !== 'none';
      if (isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }
  }

  /**
   * 销毁侧边栏
   */
  destroy() {
    try {
      // 清理事件监听器
      this.eventManager.removeAllListeners();

      // 清理拖拽状态
      this.cleanupDragState();

      // 移除DOM元素
      if (this.element) {
        DOMUtils.safeRemove(this.element);
        this.element = null;
      }

      console.log('侧边栏已销毁');

    } catch (error) {
      if (error instanceof Error) {
        ErrorHandler.handle(error, '侧边栏销毁');
      } else {
        ErrorHandler.handle(new Error(String(error)), '侧边栏销毁');
      }
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Sidebar };
} else {
  window.Sidebar = Sidebar;
}
