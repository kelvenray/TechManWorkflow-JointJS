/**
 * 应用核心类
 * 管理整个应用的状态和组件
 */
class WorkflowApp {
  constructor() {
    this.graph = null;
    this.paper = null;
    this.eventManager = new EventManager();

    // 应用状态
    this.state = {
      selectedElement: null,
      hoveredElement: null,
      selectedLink: null,
      currentEditingNode: null,
      isPanningMode: false,
      isPanning: false,
      spaceKeyPressed: false, // 跟踪空格键是否被按下
      lastClientX: 0,
      lastClientY: 0,
      zoomLevel: 1,

      // 图标状态
      nodeDeleteIcon: null,
      nodePropertyIcon: null,
      hideIconTimeout: null,

      // 容器调整大小状态
      resizingContainer: null,
      resizeDirection: null,
      resizeHandles: [],
      initialSize: null,
      initialPosition: null,
      initialMousePosition: null,

      // 拖拽状态
      dragType: null,
      draggedElement: null
    };

    // 组件实例
    this.components = {
      sidebar: null,
      minimap: null,
      zoomToolbar: null,
      propertyPanel: null
    };

    this.isWorkflowAppInitialized = false; // Initialize property
  }

  /**
   * 初始化应用
   */
  async init() {
    try {
      // 检查JointJS是否加载
      if (typeof joint === 'undefined') {
        throw new Error('JointJS未加载成功，请检查CDN或网络！');
      }

      // 初始化图形和画布
      this.initGraph();
      this.initPaper();

      // 初始化样式
      this.initStyles();

      console.log('工作流应用初始化完成');

      this.isWorkflowAppInitialized = true; // Set to true after initialization
    } catch (error) {
      ErrorHandler.handle(error, '应用初始化');
      throw error;
    }
  }

  /**
   * 初始化图形
   */
  initGraph() {
    this.graph = new joint.dia.Graph();

    // 监听图形事件
    this.setupGraphEvents();
  }

  /**
   * 初始化画布
   */
  initPaper() {
    const paperContainer = document.getElementById('paper-container');
    if (!paperContainer) {
      throw new Error('找不到画布容器元素');
    }

    // 计算初始画布尺寸
    const initialWidth = window.innerWidth - CONFIG.canvas.sidebarWidth;
    const initialHeight = window.innerHeight;

    this.paper = new joint.dia.Paper({
      el: paperContainer,
      model: this.graph,
      width: initialWidth,
      height: initialHeight,
      gridSize: CONFIG.canvas.gridSize,
      drawGrid: true,
      background: { color: CONFIG.canvas.background },

      // 启用连接功能
      linkPinning: false,
      defaultConnectionPoint: { name: 'boundary' },
      defaultConnector: { name: 'rounded' },
      defaultRouter: { name: 'orthogonal' },

      // 默认连接线样式
      defaultLink: () => new joint.shapes.standard.Link({
        attrs: {
          line: {
            stroke: '#333',
            strokeWidth: 2,
            targetMarker: {
              type: 'path',
              d: 'M 10 -5 0 0 10 5 z',
              fill: '#333'
            }
          }
        }
      }),

      // 交互配置
      interactive: {
        linkMove: false,
        labelMove: false,
        arrowheadMove: false,
        vertexMove: false,
        vertexAdd: false,
        vertexRemove: false,
        useLinkTools: false
      },

      // 连接验证
      /**
       * @param {joint.dia.CellView} cellViewS
       * @param {SVGElement} _magnetS
       * @param {joint.dia.CellView} cellViewT
       * @param {SVGElement} _magnetT
       * @param {string} _end
       * @param {joint.dia.LinkView} _linkView
       * @returns {boolean}
       */
      validateConnection: (cellViewS, _magnetS, cellViewT, _magnetT, _end, _linkView) => {
        // 不能连接到自身
        return cellViewS !== cellViewT;
      },

      // 启用磁铁捕获
      snapLinks: { radius: 75 },
      markAvailable: true,

      // 高亮配置
      highlighting: {
        'default': {
          name: 'stroke',
          options: {
            padding: 6,
            attrs: {
              'stroke-width': 3,
              stroke: '#1976d2'
            }
          }
        }
      },

      async: true,
      frozen: false
    });

    // 设置画布事件
    this.setupPaperEvents();
  }

  /**
   * 设置图形事件
   */
  setupGraphEvents() {
    // 监听节点添加事件
    /**
     * @param {joint.dia.Cell} cell
     * @param {joint.dia.Graph} collection
     * @param {object} opt
     */
    this.graph.on('add', (cell, collection, opt) => {
      if (this.isWorkflowAppInitialized && cell.isElement()) {
        // Check if the element was added from the stencil
        if (opt && opt.stencil) {
          console.log(`[WorkflowApp] Element ${cell.id} (type: ${cell.attributes.type}) added from stencil. Scheduling clearSelection.`);
          // Use setTimeout to ensure this runs after all JointJS internal drop-related processing
          // and any potential automatic selection logic has finished.
          setTimeout(() => {
            if (this.state.selectedElement) {
              console.log(`[WorkflowApp] Clearing selection after stencil drop. Previously selected: ${this.state.selectedElement.id}`);
              this.clearSelection();
            } else {
              console.log(`[WorkflowApp] Stencil drop: ${cell.id} added. No element was selected post-drop. Good.`);
            }
          }, 0);
        }
      }
    });

    // 监听节点删除事件
    this.graph.on('remove', (cell) => {
      if (this.isWorkflowAppInitialized && cell.isElement() && this.state.selectedElement === cell) {
        this.clearSelection();
      }
    });

    // 监听位置变化事件
    /**
     * @param {joint.dia.Element} element
     * @param {joint.dia.Point} newPosition
     * @param {Object} opt
     */
    this.graph.on('change:position', (element, newPosition, opt) => {
      if (this.isWorkflowAppInitialized && opt.isCommand && this.state.selectedElement === element) {
        // this.updateIconPositions(elementView); // updateIconPositions was removed
      }
    });
  }

  /**
   * 设置画布事件
   */
  setupPaperEvents() {
    // 节点点击事件
    /**
     * @param {joint.dia.ElementView} elementView
     * @param {joint.dia.Event} evt
     */
    this.paper.on('element:pointerclick', (elementView, evt) => {
      this.handleElementClick(elementView, evt);
    });

    // 节点双击事件
    /**
     * @param {joint.dia.ElementView} elementView
     * @param {joint.dia.Event} evt
     */
    this.paper.on('element:pointerdblclick', (elementView, evt) => {
      this.handleElementDoubleClick(elementView, evt);
    });

    // 连接线点击事件
    /**
     * @param {joint.dia.LinkView} linkView
     * @param {joint.dia.Event} evt
     */
    this.paper.on('link:pointerclick', (linkView, evt) => {
      this.handleLinkClick(linkView, evt);
    });

    // 空白处点击事件
    /**
     * @param {joint.dia.Event} _evt
     */
    this.paper.on('blank:pointerclick', (_evt) => {
      this.handleBlankClick(_evt);
    });

    // 连接线创建完成事件
    /**
     * @param {joint.dia.LinkView} linkView
     * @param {joint.dia.Event} _evt
     */
    this.paper.on('link:connect', (linkView, _evt) => {
      this.handleLinkConnect(linkView, _evt);
    });

    // 连接线断开事件
    /**
     * @param {joint.dia.LinkView} linkView
     * @param {joint.dia.Event} _evt
     */
    this.paper.on('link:disconnect', (linkView, _evt) => {
      this.handleLinkDisconnected(linkView, _evt);
    });

    // 鼠标悬停事件
    /**
     * @param {joint.dia.ElementView} elementView
     * @param {joint.dia.Event} _evt
     */
    this.paper.on('element:mouseenter', (elementView, _evt) => {
      this.handleElementMouseEnter(elementView, _evt);
    });

    /**
     * @param {joint.dia.ElementView} elementView
     * @param {joint.dia.Event} evt
     */
    this.paper.on('element:mouseleave', (elementView, evt) => {
      this.handleElementMouseLeave(elementView, evt);
    });

    // 当元素移动时，更新图标位置（如果使用JointJS工具，这通常不需要，但保留以防万一）
    /**
     * @param {joint.dia.ElementView} _elementView
     * @param {joint.dia.Event} _evt
     * @param {number} _x
     * @param {number} _y
     */
    this.paper.on('element:pointermove', (_elementView, _evt, _x, _y) => {
       // 如果使用JointJS工具，通常不需要手动更新位置
       // elementView.updateToolsVisibility();
    });

     // 当画布缩放或平移时，更新工具位置（JointJS工具会自动处理）
    this.paper.on('scale translate', () => {
       // JointJS工具会自动处理位置更新
       // this.paper.getDefaultTools(); // 或根据需要更新特定工具
    });
    // 画布空白区域点击事件
    /**
     * @param {joint.dia.Event} evt
     * @param {number} x
     * @param {number} y
     */
    this.paper.on('blank:pointerdown', (evt, x, y) => {
      // 检查是否按住空格键
      if (evt.originalEvent && evt.originalEvent.code === 'Space') {
        evt.preventDefault();
        this.state.isPanning = true;
        this.state.lastClientX = evt.originalEvent.clientX;
        this.state.lastClientY = evt.originalEvent.clientY;
        document.body.style.cursor = 'grabbing';
      }
    });

    /**
     * @param {joint.dia.Event} evt
     */
    // 使用防抖处理画布平移的mousemove事件
    const debouncedPanMove = debounce((evt) => {
      if (this.state.isPanning && evt.originalEvent) {
        evt.preventDefault();
        const dx = evt.originalEvent.clientX - this.state.lastClientX;
        const dy = evt.originalEvent.clientY - this.state.lastClientY;

        // 获取当前的平移值
        const currentTranslate = this.paper.translate();

        // 应用新的平移
        this.paper.translate(
          currentTranslate.tx + dx,
          currentTranslate.ty + dy
        );

        this.state.lastClientX = evt.originalEvent.clientX;
        this.state.lastClientY = evt.originalEvent.clientY;
      }
    }, CONFIG.ui.mouseMoveDebounceDelay, false, true);

    this.paper.on('blank:pointermove', debouncedPanMove);

    /**
     * @param {joint.dia.Event} evt
     */
    this.paper.on('blank:pointerup', (evt) => {
      if (this.state.isPanning) {
        evt.preventDefault();
        this.state.isPanning = false;
        document.body.style.cursor = this.state.isPanningMode ? 'grab' : 'default';
      }
    });

    // 监听键盘事件来处理空格键
    /**
     * @param {KeyboardEvent} e
     */
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !this.state.isPanning) {
        e.preventDefault();
        document.body.style.cursor = 'grab';
        this.state.spaceKeyPressed = true;
      }
    };

    /**
     * @param {KeyboardEvent} e
     */
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        document.body.style.cursor = 'default';
        this.state.spaceKeyPressed = false;
      }
    };

    // 全局鼠标按下事件，用于处理空格键+鼠标左键的组合
    /**
     * @param {MouseEvent} e
     */
    const handleGlobalMouseDown = (e) => {
      // 检查是否按住空格键并且是鼠标左键
      if (this.state.spaceKeyPressed && e.button === 0) {
        e.preventDefault();
        // 阻止事件传播，防止其他元素处理此事件
        e.stopPropagation();

        this.state.isPanning = true;
        this.state.lastClientX = e.clientX;
        this.state.lastClientY = e.clientY;
        document.body.style.cursor = 'grabbing';
      }
    };

    // 全局鼠标移动事件，用于处理画布平移
    /**
     * @param {MouseEvent} e
     */
    const handleGlobalMouseMove = debounce((e) => {
      if (this.state.isPanning) {
        e.preventDefault();

        const dx = e.clientX - this.state.lastClientX;
        const dy = e.clientY - this.state.lastClientY;

        // 获取当前的平移值
        const currentTranslate = this.paper.translate();

        // 应用新的平移
        this.paper.translate(
          currentTranslate.tx + dx,
          currentTranslate.ty + dy
        );

        this.state.lastClientX = e.clientX;
        this.state.lastClientY = e.clientY;
      }
    }, CONFIG.ui.mouseMoveDebounceDelay, false, true);

    // 全局鼠标抬起事件
    /**
     * @param {MouseEvent} e
     */
    const handleGlobalMouseUp = (e) => {
      if (this.state.isPanning) {
        e.preventDefault();
        this.state.isPanning = false;
        document.body.style.cursor = this.state.spaceKeyPressed ? 'grab' : 'default';
      }
    };

    // 使用事件管理器添加键盘和鼠标事件监听
    this.eventManager.addEventListener(document, 'keydown', handleKeyDown);
    this.eventManager.addEventListener(document, 'keyup', handleKeyUp);
    this.eventManager.addEventListener(document, 'mousedown', handleGlobalMouseDown);
    this.eventManager.addEventListener(document, 'mousemove', handleGlobalMouseMove);
    this.eventManager.addEventListener(document, 'mouseup', handleGlobalMouseUp);
  }

  /**
   * 处理节点点击
   * @param {joint.dia.ElementView} elementView
   * @param {joint.dia.Event} evt
   */
  handleElementClick(elementView, evt) {
    evt.stopPropagation();
    const element = elementView.model;

    console.log('节点被点击:', element.id);

    // 如果点击的是已选中的节点，则取消选择
    if (this.state.selectedElement === element) {
      this.clearSelection();
      return;
    }

    // 取消之前的选择
    this.clearSelection();

    // 选择当前节点
    this.selectElement(element);

    // 显示节点操作图标
    this.showNodeIcons(/** @type {joint.dia.Element} */ (element));
  }

  /**
   * 处理节点双击
   * @param {joint.dia.ElementView} elementView
   * @param {joint.dia.Event} evt
   */
  handleElementDoubleClick(elementView, evt) {
    evt.stopPropagation();
    const element = elementView.model;

    console.log('节点被双击:', element.id);

    // 直接打开属性面板
    if (this.components.propertyPanel && typeof this.components.propertyPanel.show === 'function') {
      this.components.propertyPanel.show(element);
    }
  }

  /**
   * 处理鼠标进入节点
   * 修改为不在悬停时显示任何图标
   * @param {joint.dia.ElementView} elementView
   * @param {joint.dia.Event} _evt
   */
  handleElementMouseEnter(elementView, _evt) {
    const element = elementView.model;
    this.state.hoveredElement = element;
  }

  /**
   * 处理鼠标离开节点
   * @param {joint.dia.ElementView} elementView
   * @param {joint.dia.Event} evt
   */
  handleElementMouseLeave(elementView, evt) {
    const element = elementView.model;

    // 检查鼠标是否真的离开了节点（不是移动到子元素或图标上）
    const relatedTarget = evt.relatedTarget || evt.toElement;
    if (elementView.el.contains(relatedTarget)) {
        return; // 如果鼠标仍在节点内部，不做任何处理
    }

    // 检查鼠标是否移动到了删除或属性图标上
    // 注意：如果图标是JointJS工具，relatedTarget可能是SVG元素的一部分
    // 简单的检查可以通过类名或父元素来判断
    if (relatedTarget && (relatedTarget.classList && (relatedTarget.classList.contains('node-delete-icon') || relatedTarget.classList.contains('node-property-icon')))) {
         return; // 如果鼠标移动到了图标上，不做任何处理
    }

    // 如果离开的是当前悬停的节点
    if (this.state.hoveredElement === element) {
        this.state.hoveredElement = null;
    }
  }

  /**
   * 处理连接线点击
   * @param {joint.dia.LinkView} linkView
   * @param {joint.dia.Event} evt
   */
  handleLinkClick(linkView, evt) {
    evt.stopPropagation();
    const link = linkView.model;

    console.log('连接线被点击:', link.id);

    // 取消之前的选择
    this.clearSelection();

    // 选择连接线
    this.selectLink(link);
  }

  /**
   * 处理空白处点击
   * @param {joint.dia.Event} _evt
   */
  handleBlankClick(_evt) {
    console.log('空白处被点击');

    // 取消所有选择
    this.clearSelection();

    // 隐藏属性面板
    if (this.components.propertyPanel) {
      this.components.propertyPanel.hide();
    }
  }

  /**
   * 处理连接线创建
   * @param {joint.dia.LinkView} linkView
   * @param {joint.dia.Event} _evt
   */
  handleLinkConnect(linkView, _evt) {
    const link = linkView.model;
    console.log('连接线已创建:', link.id);

    // 检查源节点是否是Switch节点，添加标签
    this.handleSwitchNodeConnection(link);
  }

  /**
   * 处理连接线断开
   * @param {joint.dia.LinkView} linkView
   * @param {joint.dia.Event} _evt
   */
  handleLinkDisconnected(linkView, _evt) {
    const link = linkView.model;
    console.log('连接线已断开:', link.id);
  }

  /**
   * 选择元素
   * @param {joint.shapes.standard.Element} element
   */
  selectElement(element) {
    this.state.selectedElement = element;

    // Removed to hide the default selection box
    // const elementView = this.paper.findViewByModel(element);
    // if (elementView) {
    //   elementView.highlight();
    // }
  }

  /**
   * 选择连接线
   * @param {joint.shapes.standard.Link} link
   */
  selectLink(link) {
    this.state.selectedLink = link;

    // 高亮连接线
    link.attr('line/stroke', '#ff4081');
    link.attr('line/strokeWidth', 3);
  }

  /**
   * 清除选择
   */
  clearSelection() {
    // 清除元素选择
    if (this.state.selectedElement) {
      const elementView = this.paper.findViewByModel(this.state.selectedElement);
      if (elementView) {
        // Removed to hide the default selection box
        // elementView.unhighlight();
        elementView.removeTools();
      }
      this.state.selectedElement = null;
    }

    // 清除连接线选择
    if (this.state.selectedLink) {
      this.state.selectedLink.attr('line/stroke', '#333');
      this.state.selectedLink.attr('line/strokeWidth', 2);
      this.state.selectedLink = null;
    }
    // No longer calling this.hideNodeIcons() here as tool removal is handled above.
  }

  /**
   * 显示节点操作图标（选中状态）
   * 只在节点被点击选中时显示删除和属性图标
   * @param {joint.dia.Element} element
   */
  showNodeIcons(element) {
    console.log('[showNodeIcons] Called for element:', element.id, 'Type:', element.get('type'));
    console.log('[showNodeIcons] joint.elementTools:', joint.elementTools);

    const elementView = this.paper.findViewByModel(element);
    if (!elementView) {
        console.error('[showNodeIcons] No elementView found for element:', element.id);
        return;
    }

    const bbox = elementView.getBBox();
    const nodeType = element.get('type');

    let toolX = '100%'; // Default X for delete tool
    let toolY = '0%';   // Default Y for delete tool
    let toolOffsetX = 0; // Default offsetX for delete tool (center of icon at x,y)
    let toolOffsetY = 0; // Default offsetY for delete tool (center of icon at x,y)

    // Default to current positioning if no specific rule matches
    const defaultOffset = { x: -9, y: 9 }; // Current default: places center of 18x18 icon slightly offset from top-right corner

    if (nodeType === 'standard.Circle') {
        const R = bbox.width / 2;
        // Icon center at 45-degree point on circumference (top-right)
        // Angles in JS Math are radians; -PI/4 is 45deg clockwise from positive X-axis
        toolX = ((bbox.width / 2) + R * Math.cos(-Math.PI / 4)) / bbox.width * 100 + '%';
        toolY = ((bbox.height / 2) + R * Math.sin(-Math.PI / 4)) / bbox.height * 100 + '%';
        // offset remains 0,0 as x,y define the center
    } else if (nodeType === 'standard.Rectangle' || nodeType === 'app.RectangularModel') { // Assuming app.RectangularModel for custom rects
        let cornerRadius = parseFloat(element.attr('body/rx')) || parseFloat(element.attr('rect/rx')) || 0;

        if (cornerRadius > 0) { // Rounded Rectangle
            // Center of the top-right rounding arc's circle
            const arcCenterX = bbox.width - cornerRadius;
            const arcCenterY = cornerRadius;
            // Icon center on this arc at -45 degrees (top-right direction)
            toolX = (arcCenterX + cornerRadius * Math.cos(-Math.PI / 4)) / bbox.width * 100 + '%';
            toolY = (arcCenterY + cornerRadius * Math.sin(-Math.PI / 4)) / bbox.height * 100 + '%';
        } else { // Sharp Rectangle
            toolX = '100%';
            toolY = '0%';
        }
    } else if (nodeType === 'standard.Path' || nodeType === 'app.DiamondModel' || nodeType === 'basic.Path') { // Assuming for diamonds
        // Heuristic: Check if it's a typical diamond path definition (M origin L point L point L point Z)
        const pathData = element.attr('path/d') || element.attr('body/d');
        // This is a very rough check for a common diamond path like M 25 0 L 50 25 L 25 50 L 0 25 Z
        if (pathData && typeof pathData === 'string' && pathData.trim().split(' ').length > 7 && pathData.toUpperCase().startsWith('M')) {
            // Midpoint of the top-right edge for a diamond from (W/2,0) to (W,H/2)
            toolX = '75%';
            toolY = '25%';
        } else {
            toolX = '100%'; toolY = '0%'; toolOffsetX = defaultOffset.x; toolOffsetY = defaultOffset.y;
        }
    } else {
        // Fallback to current default if type is unknown or doesn't match specific rules
        toolX = '100%'; toolY = '0%'; toolOffsetX = defaultOffset.x; toolOffsetY = defaultOffset.y;
    }

    const activeTools = [];

    try {
        console.log(`[showNodeIcons] Attempting to create deleteTool for ${nodeType} at ${toolX},${toolY} offset ${toolOffsetX},${toolOffsetY}`);
        const deleteTool = new joint.elementTools.Remove({
            x: toolX,
            y: toolY,
            offset: { x: toolOffsetX, y: toolOffsetY },
            markup: [
                {
                    tagName: 'circle',
                    selector: 'button',
                    attributes: {
                        'r': 10,
                        'fill': 'rgba(0, 0, 0, 0.7)',
                        'cursor': 'pointer',
                        'class': 'node-delete-icon'
                    }
                },
                {
                    tagName: 'path',
                    selector: 'icon',
                    attributes: {
                        'd': 'M -4 -4 L 4 4 M -4 4 L 4 -4',
                        'stroke': '#fff',
                        'stroke-width': 2,
                        'pointer-events': 'none'
                    }
                }
            ],
            /** @param {joint.dia.Event} evt */
            action: function(evt) {
                evt.stopPropagation();
                this.model.remove();
            },
        });
        activeTools.push(deleteTool);
        console.log('[showNodeIcons] deleteTool created and pushed.');
    } catch (error) {
        console.error('[showNodeIcons] Error creating deleteTool:', error);
    }

    // Restore Property Tool
    if (!this.isStartOrEndNode(element)) {
        try {
            console.log('[showNodeIcons] Attempting to create propertyTool...');
            const propertyTool = new joint.elementTools.Button({
                x: '50%',
                y: 0,
                offset: { x: 0, y: 10 }, // Centered, 10px down from top edge
                /** @param {joint.dia.Event} evt */
                action: (evt) => {
                    evt.stopPropagation();
                    this.handleElementDoubleClick(elementView, evt);
                },
                markup: [
                    {
                        tagName: 'rect',
                        selector: 'button',
                        attributes: {
                            'width': 24,
                            'height': 16,
                            'rx': 4,
                            'ry': 4,
                            'fill': 'rgba(128, 128, 128, 0.6)',
                            'cursor': 'pointer',
                            'class': 'node-property-icon'
                        }
                    },
                     {
                        tagName: 'text',
                        selector: 'text',
                        attributes: {
                            'text': '...',
                            'fill': 'white',
                            'font-size': 12,
                            'font-weight': 'bold',
                            'text-anchor': 'middle',
                            'dominant-baseline': 'middle',
                            'pointer-events': 'none'
                        }
                    }
                ]
            });
            activeTools.push(propertyTool);
            console.log('[showNodeIcons] propertyTool created and pushed.');
        } catch (error) {
            console.error('[showNodeIcons] Error creating propertyTool:', error);
        }
    }

    if (activeTools.length > 0) {
        console.log('[showNodeIcons] Adding tools to elementView:', element.id, activeTools);
        const toolsView = new joint.dia.ToolsView({ tools: activeTools });
        elementView.addTools(toolsView);
        toolsView.render().$el.css({ 'z-index': 10000 });
        console.log('[showNodeIcons] Tools rendered for element:', element.id);
    } else {
        console.log('[showNodeIcons] No active tools to add for element:', element.id);
    }
  }

  /**
   * 处理节点添加
   * @param {joint.shapes.standard.Element} cell
   */
  handleCellAdd(cell) {
    if (!cell.isLink()) {
      console.log('节点已添加:', cell.id);
      // 检查是否放置在容器节点上
      this.checkContainerEmbedding(cell);
    }
  }

  /**
   * 处理节点删除
   * @param {joint.shapes.standard.Element} cell
   */
  handleCellRemove(cell) {
    try {
      console.log(`节点被删除: ${cell.id}, 类型: ${cell.get('type')}`);

      // 清除相关状态
      if (this.state.selectedElement === cell) {
        this.state.selectedElement = null;
      }

      if (this.state.selectedLink === cell) {
        this.state.selectedLink = null;
      }

      if (this.state.currentEditingNode === cell) {
        this.state.currentEditingNode = null;
        if (this.components.propertyPanel) {
          this.components.propertyPanel.hide();
        }
      }

      // 清理UI元素
      // this.hideNodeIcons();

    } catch (error) {
      ErrorHandler.handle(error, '节点删除处理');
    }
  }

  /**
   * 处理位置变化
   * @param {joint.shapes.standard.Element} cell
   */
  handlePositionChange(cell) {
    // 如果是当前选中的元素，更新图标位置
    if (this.state.selectedElement === cell) {
      const elementView = this.paper.findViewByModel(cell);
      if (elementView) {
        // const bbox = elementView.getBBox(); // bbox is no longer used
        // this.updateIconPositions(bbox);
      }
    }
  }

  /**
   * 检查容器嵌套
   * @param {joint.shapes.standard.Element} cell
   */
  checkContainerEmbedding(cell) {
    const containers = this.graph.getElements().filter(e => e.isContainer);

    for (const container of containers) {
      if (this.isElementInContainer(cell, container)) {
        // 检查节点类型，开始和结束节点不能被嵌套
        if (this.isStartOrEndNode(cell)) {
          cell.toFront();
          continue;
        }

        if (!cell.isContainer) {
          cell.toFront();
          container.embed(cell);
          this.adjustElementInContainer(cell, container);

          setTimeout(() => {
            cell.toFront();
          }, 50);
        }
      }
    }
  }

  /**
   * 检查元素是否在容器内
   * @param {joint.shapes.standard.Element} element
   * @param {joint.shapes.standard.Element} container
   * @returns {boolean}
   */
  isElementInContainer(element, container) {
    const bbox = container.getBBox();
    const elementBBox = element.getBBox();
    const center = elementBBox.center();

    return center.x > bbox.x &&
           center.x < bbox.x + bbox.width &&
           center.y > bbox.y &&
           center.y < bbox.y + bbox.height;
  }

  /**
   * 检查是否为开始或结束节点
   * @param {joint.shapes.standard.Element} element
   * @returns {boolean}
   */
  isStartOrEndNode(element) {
    const nodeType = element.get('type');
    const nodeLabel = element.attr('label/text');
    return nodeType === 'standard.Circle' &&
           (nodeLabel === '开始' || nodeLabel === '结束');
  }

  /**
   * 调整元素在容器内的位置
   * @param {joint.shapes.standard.Element} element
   * @param {joint.shapes.standard.Element} container
   */
  adjustElementInContainer(element, container) {
    const bbox = container.getBBox();
    const elementBBox = element.getBBox();

    const minX = bbox.x + 10;
    const maxX = bbox.x + bbox.width - elementBBox.width - 10;
    const minY = bbox.y + 30;
    const maxY = bbox.y + bbox.height - elementBBox.height - 10;

    element.position(
      Math.max(minX, Math.min(elementBBox.x, maxX)),
      Math.max(minY, Math.min(elementBBox.y, maxY))
    );
  }

  /**
   * 处理Switch节点连接
   * @param {joint.shapes.standard.Link} link
   */
  handleSwitchNodeConnection(link) {
    const sourceCell = link.getSourceCell();
    if (sourceCell && sourceCell.isSwitch) {
      const sourcePort = link.getSourcePort();
      if (sourcePort) {
        const caseIndexMatch = sourcePort.match(/case_(\d+)/);
        if (caseIndexMatch && caseIndexMatch[1]) {
          const caseIndex = parseInt(caseIndexMatch[1]);
          const cases = sourceCell.prop('properties').cases || [];

          if (cases[caseIndex]) {
            const caseName = cases[caseIndex].name;
            this.addLinkLabel(link, caseName);
          }
        }
      }
    }
  }

  /**
   * 为连接线添加标签
   * @param {joint.shapes.standard.Link} link
   * @param {string} text
   */
  addLinkLabel(link, text) {
    link.appendLabel({
      attrs: {
        text: {
          text: text,
          fill: '#333',
          fontSize: 12,
          fontWeight: 'bold',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          pointerEvents: 'none'
        },
        rect: {
          fill: 'white',
          stroke: '#ccc',
          strokeWidth: 1,
          rx: 3,
          ry: 3,
          refWidth: '100%',
          refHeight: '100%',
          refX: 0,
          refY: 0
        }
      },
      position: {
        distance: 0.5
      }
    });
  }

  /**
   * 初始化样式
   */
  initStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .node-delete-icon:hover {
        background: #ff6666 !important;
        transform: scale(1.1);
      }

      .node-property-icon:hover {
        background: rgba(95, 95, 95, 0.9) !important;
        transform: scale(1.05);
      }

      .node-delete-icon,
      .node-property-icon {
        transition: all 0.2s ease;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 销毁应用
   */
  destroy() {
    try {
      // 清理所有事件监听器
      this.eventManager.removeAllListeners();

      // 清理UI元素
      // this.hideNodeIcons();

      // 清理组件
      Object.values(this.components).forEach(component => {
        if (component && typeof component.destroy === 'function') {
          component.destroy();
        }
      });

      // 清理图形和画布
      if (this.paper) {
        this.paper.remove();
      }

      if (this.graph) {
        this.graph.clear();
      }

      console.log('工作流应用已销毁');

    } catch (error) {
      ErrorHandler.handle(error, '应用销毁');
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WorkflowApp };
} else {
  window.WorkflowApp = WorkflowApp;
}
