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
      draggedElement: null,
      isDragging: false,
      draggedNode: null,
      hoveredContainer: null,
      originalContainer: null, // 记录拖拽前的原始容器

      // 容器拖拽信息
      containerDragInfo: null
    };

    // 组件实例
    this.components = {
      sidebar: null,
      minimap: null,
      zoomToolbar: null,
      propertyPanel: null
    };

    // 功能管理器
    this.commandHistory = null;
    this.clipboardManager = null;

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

      // 初始化功能管理器
      this.initManagers();

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
        elementMove: true,        // 允许拖拽元素 - 这是节点选择和拖拽的关键设置
        addLinkFromMagnet: true,  // 允许从磁铁创建连接线
        magnet: true,             // 启用磁铁交互
        stopDelegation: false,    // 允许事件委托
        linkMove: false,          // 禁用连接线移动
        labelMove: false,         // 禁用标签移动
        arrowheadMove: false,     // 禁用箭头移动
        vertexMove: false,        // 禁用顶点移动
        vertexAdd: false,         // 禁用顶点添加
        vertexRemove: false,      // 禁用顶点删除
        useLinkTools: false       // 禁用连接线工具
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

      // 启用磁铁捕获（减小吸附半径，提高精确度）
      snapLinks: { radius: 20 }, // 从75减小到20，使连接线只有在非常接近目标节点时才吸附
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

      // 嵌套设置 - 禁用自动嵌套功能，使用自定义嵌套逻辑
      embeddingMode: false,
      findParentBy: 'bbox',
      frontParentOnly: false,

      // 嵌套验证 - 控制哪些元素可以被嵌套
      /**
       * @param {joint.dia.ElementView} childView
       * @param {joint.dia.ElementView} parentView
       * @returns {boolean}
       */
      validateEmbedding: (childView, parentView) => {
        const child = childView.model;
        const parent = parentView.model;

        // 只有容器节点可以作为父节点
        if (!parent.isContainer) {
          return false;
        }

        // 开始和结束节点不能被嵌套
        if (this.isStartOrEndNode && this.isStartOrEndNode(child)) {
          return false;
        }

        // 容器节点不能被嵌套到其他容器中（避免嵌套容器）
        if (child.isContainer) {
          return false;
        }

        return true;
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
          console.log(`[WorkflowApp] Element ${cell.id} (type: ${cell.attributes.type}) added from stencil.`);

          // 确保新添加的节点可以正常交互
          setTimeout(() => {
            // 确保节点在前台显示
            cell.toFront();

            // 验证节点的交互性
            const elementView = this.paper.findViewByModel(cell);
            if (elementView) {
              console.log(`[WorkflowApp] Node ${cell.id} added successfully and is interactive`);
            }

            // 只有在有其他选中元素时才清除选择，避免影响新节点的交互
            if (this.state.selectedElement && this.state.selectedElement !== cell) {

              this.clearSelection();
            }
          }, 10); // 稍微增加延迟以确保JointJS完全处理完节点添加
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
      if (this.isWorkflowAppInitialized) {
        // JointJS's embeddingMode handles container movement automatically
        // We only need to ensure z-index visibility after movement
        if (element.isContainer && !opt.skipEmbeddedUpdate) {
          // Use setTimeout to ensure this runs after JointJS's native embedding logic
          setTimeout(() => {
            this.ensureEmbeddedNodesVisible(element);
          }, 10); // Slightly longer delay to ensure JointJS completes its operations
        }

        // 如果是选中的元素
        if (this.state.selectedElement === element) {
          // 如果是容器节点且有调整大小句柄，更新句柄位置
          if (element.isContainer && element.isResizable && this.state.resizeHandles.length > 0) {
            this.updateResizeHandles();
          }
        }
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

    // 节点拖拽开始事件
    /**
     * @param {joint.dia.ElementView} elementView
     * @param {joint.dia.Event} evt
     */
    this.paper.on('element:pointerdown', (elementView, evt) => {
      this.handleElementPointerDown(elementView, evt);
    });

    // 节点拖拽结束事件
    /**
     * @param {joint.dia.ElementView} elementView
     * @param {joint.dia.Event} evt
     */
    this.paper.on('element:pointerup', (elementView, evt) => {
      this.handleElementPointerUp(elementView, evt);
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

    // 连接线创建过程中的事件
    /**
     * @param {joint.dia.LinkView} linkView
     * @param {joint.dia.Event} evt
     */
    this.paper.on('link:pointermove', (linkView, evt) => {
      // 连接线拖动过程中的处理
      this.handleLinkPointerMove(linkView, evt);
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

    // 当元素移动时，更新图标位置和处理容器拖拽反馈
    /**
     * @param {joint.dia.ElementView} elementView
     * @param {joint.dia.Event} _evt
     * @param {number} _x
     * @param {number} _y
     */
    this.paper.on('element:pointermove', (elementView, _evt, _x, _y) => {
       // 如果使用JointJS工具，通常不需要手动更新位置
       // elementView.updateToolsVisibility();

       const element = elementView.model;

       // 如果正在移动的是选中的容器节点，更新调整大小句柄位置
       if (this.state.selectedElement === element &&
           element.isContainer &&
           element.isResizable &&
           this.state.resizeHandles.length > 0) {
         this.updateResizeHandles();
       }

       // 处理拖拽到容器的视觉反馈
       if (this.state.isDragging && !element.isContainer && !this.isStartOrEndNode(element)) {
         this.handleDragOverContainers(element);
       }
    });

     // 当画布缩放或平移时，更新工具位置（JointJS工具会自动处理）
    this.paper.on('scale translate', () => {
       // JointJS工具会自动处理位置更新
       // this.paper.getDefaultTools(); // 或根据需要更新特定工具

       // 更新调整大小句柄位置
       this.updateResizeHandles();
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
    }, CONFIG.ui.mouseMoveDebounceDelay);

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
    }, CONFIG.ui.mouseMoveDebounceDelay);

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

    console.log('[handleElementClick] 节点被点击:', element.id, '类型:', element.get('type'));
    console.log('[handleElementClick] 当前interactive配置:', this.paper.options.interactive);

    // 如果点击的是已选中的节点，则取消选择
    if (this.state.selectedElement === element) {
      console.log('[handleElementClick] 取消选择节点:', element.id);
      this.clearSelection();
      return;
    }

    // 取消之前的选择
    this.clearSelection();

    // 选择当前节点
    this.selectElement(element);

    // 显示节点操作图标
    this.showNodeIcons(/** @type {joint.dia.Element} */ (element));

    // 如果是容器节点，显示调整大小的句柄
    if (element.isContainer && element.isResizable) {
      this.createResizeHandles(elementView);
    }
  }

  /**
   * 处理节点双击
   * @param {joint.dia.ElementView} elementView
   * @param {joint.dia.Event} evt
   */
  handleElementDoubleClick(elementView, evt) {
    evt.stopPropagation();
    const element = elementView.model;



    // 直接打开属性面板
    if (this.components.propertyPanel && typeof this.components.propertyPanel.show === 'function') {
      this.components.propertyPanel.show(element);
    }
  }

  /**
   * 处理节点拖拽开始
   * @param {joint.dia.ElementView} elementView
   * @param {joint.dia.Event} evt
   */
  handleElementPointerDown(elementView, evt) {
    const element = elementView.model;

    // 只有非容器节点或者容器节点本身被拖拽时才标记拖拽状态
    // 这样可以避免容器内节点拖拽时误判
    if (!element.isContainer || evt.target === elementView.el) {
      this.state.isDragging = true;
      this.state.draggedNode = element;


      // 如果拖拽的是嵌套在容器中的节点，先将其从容器中移除
      // 这样可以防止拖拽时容器跟着移动
      if (!element.isContainer) {
        const parentContainer = element.getParentCell();
        if (parentContainer && parentContainer.isContainer) {
          parentContainer.unembed(element);
          // 记录原始容器，以便后续重新嵌套判断
          this.state.originalContainer = parentContainer;
        }
      }
    }
  }

  /**
   * 处理节点拖拽结束
   * @param {joint.dia.ElementView} elementView
   * @param {joint.dia.Event} evt
   */
  handleElementPointerUp(elementView, evt) {
    const element = elementView.model;

    // 处理容器嵌套逻辑 - 只有当确实在拖拽这个节点时才处理
    if (this.state.isDragging && this.state.draggedNode === element) {
      // 延迟处理嵌套逻辑，确保拖拽操作完全结束
      setTimeout(() => {
        this.handleContainerEmbedding(element);
      }, 10);
    }

    // 清除拖拽状态
    this.state.isDragging = false;
    this.state.draggedNode = null;
    this.state.originalContainer = null; // 清除原始容器记录
    this.clearContainerHighlight();

    console.log('结束拖拽节点:', element.id);
  }

  /**
   * 处理拖拽到容器的视觉反馈
   * @param {joint.dia.Element} draggedElement
   */
  handleDragOverContainers(draggedElement) {
    const containers = this.graph.getElements().filter(e => e.isContainer);
    let foundContainer = null;

    for (const container of containers) {
      if (this.isElementInContainer(draggedElement, container)) {
        foundContainer = container;
        break;
      }
    }

    // 更新容器高亮状态
    if (foundContainer !== this.state.hoveredContainer) {
      this.clearContainerHighlight();
      if (foundContainer) {
        this.highlightContainer(foundContainer);
        this.state.hoveredContainer = foundContainer;
      }
    }
  }

  /**
   * 高亮容器节点
   * @param {*} container
   */
  highlightContainer(container) {
    try {
      // 使用浅蓝色高亮，降低强度
      container.attr('body/stroke', '#87ceeb');
      container.attr('body/strokeWidth', 2);
      container.attr('body/filter', 'drop-shadow(0 0 6px rgba(135, 206, 235, 0.3))');

      // 添加CSS类以增强视觉效果
      const containerView = this.paper.findViewByModel(container);
      if (containerView && containerView.el) {
        containerView.el.classList.add('container-drag-highlight');
      }
    } catch (error) {
      console.warn('高亮容器时出错:', error);
    }
  }

  /**
   * 清除容器高亮
   */
  clearContainerHighlight() {
    if (this.state.hoveredContainer) {
      try {
        this.state.hoveredContainer.attr('body/stroke', '#CCCCCC');
        this.state.hoveredContainer.attr('body/strokeWidth', 1);
        this.state.hoveredContainer.attr('body/filter', 'none');

        // 移除CSS类
        const containerView = this.paper.findViewByModel(this.state.hoveredContainer);
        if (containerView && containerView.el) {
          containerView.el.classList.remove('container-drag-highlight');
        }

        this.state.hoveredContainer = null;
      } catch (error) {
        console.warn('清除容器高亮时出错:', error);
      }
    }
  }

  /**
   * 处理容器嵌套逻辑
   * @param {joint.dia.Element} element
   */
  handleContainerEmbedding(element) {
    // 防止递归嵌套错误的关键验证
    console.log(`[handleContainerEmbedding] 处理元素: ${element.id}, 类型: ${element.get('type')}, isContainer: ${element.isContainer}`);

    // 1. 容器节点不能被嵌套到其他容器中（防止递归嵌套）
    if (element.isContainer) {
      console.log(`[handleContainerEmbedding] 跳过容器节点 ${element.id} - 容器不能被嵌套`);
      return;
    }

    // 2. 开始和结束节点不能被嵌套
    if (this.isStartOrEndNode(element)) {
      console.log(`[handleContainerEmbedding] 跳过开始/结束节点 ${element.id}`);
      return;
    }

    const containers = this.graph.getElements().filter(e => e.isContainer);
    let wasEmbedded = false;

    // 检查是否需要嵌套到容器中
    for (const container of containers) {
      // 3. 防止元素嵌套到自身（额外的安全检查）
      if (container.id === element.id) {
        console.log(`[handleContainerEmbedding] 跳过自身嵌套: ${element.id}`);
        continue;
      }

      const isInContainer = this.isElementInContainer(element, container);
      console.log(`[handleContainerEmbedding] 检查元素 ${element.id} 是否在容器 ${container.id} 中: ${isInContainer}`);

      if (isInContainer) {
        // 如果元素不在这个容器中，则嵌套它
        const isAlreadyEmbedded = container.getEmbeddedCells().includes(element);
        console.log(`[handleContainerEmbedding] 元素是否已嵌套: ${isAlreadyEmbedded}`);

        if (!isAlreadyEmbedded) {
          try {
            // 先从其他容器中移除
            this.removeFromAllContainers(element);

            // 嵌套到新容器
            element.toFront();
            container.embed(element);
            this.adjustElementInContainer(element, container);

            setTimeout(() => {
              element.toFront();
            }, 50);


            wasEmbedded = true;
          } catch (error) {
            console.error(`[handleContainerEmbedding] 嵌套失败: ${error.message}`, error);
            // 如果嵌套失败，确保元素不会处于不一致状态
            this.removeFromAllContainers(element);
            element.toFront();
          }
        } else {
          // 元素已经在这个容器中，标记为已嵌套
          console.log(`[handleContainerEmbedding] 元素 ${element.id} 已经在容器 ${container.id} 中`);
          wasEmbedded = true;
        }
        break;
      }
    }

    // 如果没有嵌套到任何容器，检查是否需要从当前容器中移除
    if (!wasEmbedded) {
      this.removeFromAllContainers(element);
    }
  }

  /**
   * 从所有容器中移除元素
   * @param {joint.dia.Element} element
   */
  removeFromAllContainers(element) {
    // 防止递归嵌套错误的额外安全检查
    if (element.isContainer) {
      console.log(`[removeFromAllContainers] 跳过容器节点 ${element.id} - 容器不应被嵌套`);
      return;
    }

    const containers = this.graph.getElements().filter(e => e.isContainer);

    for (const container of containers) {
      if (container.getEmbeddedCells().includes(element)) {
        try {
          container.unembed(element);
          element.toFront();
          console.log(`[removeFromAllContainers] 成功移除: 节点 ${element.id} 从容器 ${container.id} 中移除`);
        } catch (error) {
          console.error(`[removeFromAllContainers] 移除失败: ${error.message}`, error);
        }
      }
    }
  }





  /**
   * 确保嵌套节点在容器上方显示
   * @param {joint.dia.Element} container
   */
  ensureEmbeddedNodesVisible(container) {
    const embeddedCells = container.getEmbeddedCells();

    if (embeddedCells.length === 0) {
      return;
    }

    // 使用 setTimeout 确保在 JointJS 内部处理完成后执行
    setTimeout(() => {
      // 重要：先将所有嵌套节点移到最前面，确保它们始终可见
      embeddedCells.forEach(cell => {
        if (cell.isElement && cell.isElement()) {
          cell.toFront();
        }
      });

      // 获取所有相关的连接线并确保它们也在前面
      const allLinks = this.graph.getLinks();
      const relatedLinks = allLinks.filter(link => {
        const sourceCell = link.getSourceCell();
        const targetCell = link.getTargetCell();

        // 检查连接线是否连接到嵌套节点或容器本身
        return embeddedCells.includes(sourceCell) ||
               embeddedCells.includes(targetCell) ||
               sourceCell === container ||
               targetCell === container;
      });

      // 将相关连接线移到最前面
      relatedLinks.forEach(link => {
        link.toFront();
      });

      console.log(`确保容器 ${container.id} 的 ${embeddedCells.length} 个嵌套节点和 ${relatedLinks.length} 个连接线可见`);
    }, 20); // Increased delay to ensure JointJS operations complete
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
   * 处理连接线拖动过程中的事件
   * @param {joint.dia.LinkView} linkView
   * @param {joint.dia.Event} evt
   */
  handleLinkPointerMove(linkView, evt) {
    // 获取连接线模型
    const link = linkView.model;

    // 确保连接线端点跟随鼠标指针
    // 只有当连接线的目标端点未连接到任何元素时才执行
    if (!link.get('target').id) {
      // 获取鼠标在画布中的位置
      const localPoint = this.paper.clientToLocalPoint({
        x: evt.clientX,
        y: evt.clientY
      });

      // 直接设置连接线的目标端点为鼠标位置
      // 这会覆盖JointJS的默认吸附行为，使连接线端点精确跟随鼠标
      link.set('target', localPoint);

      // 添加视觉反馈 - 当连接线正在创建时使用不同的样式
      link.attr({
        line: {
          stroke: '#4a90e2', // 使用蓝色表示正在创建的连接线
          strokeWidth: 2,
          strokeDasharray: '5 2', // 虚线样式
          targetMarker: {
            type: 'path',
            d: 'M 10 -5 0 0 10 5 z',
            fill: '#4a90e2'
          }
        }
      });

      // 检查鼠标是否接近任何可连接的目标节点
      const elements = this.graph.getElements();
      let isNearTarget = false;

      for (const element of elements) {
        // 跳过源节点自身
        if (element.id === link.get('source').id) continue;

        // 获取元素的边界框
        const bbox = element.getBBox();

        // 计算鼠标位置与元素边界的距离
        const distance = Math.min(
          Math.abs(localPoint.x - bbox.x),
          Math.abs(localPoint.x - (bbox.x + bbox.width)),
          Math.abs(localPoint.y - bbox.y),
          Math.abs(localPoint.y - (bbox.y + bbox.height))
        );

        // 如果距离小于20像素，认为鼠标接近目标节点
        if (distance < 20) {
          isNearTarget = true;
          break;
        }
      }

      // 根据是否接近目标节点更新连接线样式
      if (isNearTarget) {
        link.attr('line/stroke', '#4caf50'); // 绿色表示可以连接
        link.attr('line/targetMarker/fill', '#4caf50');
      }
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

    // 恢复连接线的正常样式
    link.attr({
      line: {
        stroke: '#333',
        strokeWidth: 2,
        strokeDasharray: 'none', // 移除虚线样式
        targetMarker: {
          type: 'path',
          d: 'M 10 -5 0 0 10 5 z',
          fill: '#333'
        }
      }
    });

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

    // 如果选中的是容器节点，确保嵌套节点可见
    if (element.isContainer) {
      this.ensureEmbeddedNodesVisible(element);
    }

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

    // 显示连接线删除图标
    this.showLinkDeleteIcon(link);
  }

  /**
   * 显示连接线删除图标
   * @param {joint.shapes.standard.Link} link
   */
  showLinkDeleteIcon(link) {
    console.log('[showLinkDeleteIcon] Called for link:', link.id);

    const linkView = this.paper.findViewByModel(link);
    if (!linkView) {
      console.error('[showLinkDeleteIcon] No linkView found for link:', link.id);
      return;
    }

    try {
      // 创建连接线删除工具
      const deleteTool = new joint.linkTools.Remove({
        focusOpacity: 0.5,
        distance: '50%', // 位于连接线中间位置
        markup: [
          {
            tagName: 'circle',
            selector: 'button',
            attributes: {
              'r': 10,
              'fill': 'rgba(0, 0, 0, 0.7)',
              'cursor': 'pointer',
              'class': 'link-delete-icon'
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
        ]
      });

      // 创建工具集合
      const toolsView = new joint.dia.ToolsView({
        tools: [deleteTool]
      });

      // 添加工具到连接线视图
      linkView.addTools(toolsView);
      toolsView.render().$el.css({ 'z-index': 10000 });

      console.log('[showLinkDeleteIcon] Delete icon added to link:', link.id);
    } catch (error) {
      console.error('[showLinkDeleteIcon] Error creating link delete tool:', error);
    }
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
      // 恢复连接线样式
      this.state.selectedLink.attr('line/stroke', '#333');
      this.state.selectedLink.attr('line/strokeWidth', 2);

      // 移除连接线工具
      const linkView = this.paper.findViewByModel(this.state.selectedLink);
      if (linkView) {
        linkView.removeTools();
      }

      this.state.selectedLink = null;
    }
    // No longer calling this.hideNodeIcons() here as tool removal is handled above.

    // 移除调整大小的句柄
    this.removeResizeHandles();
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
            action: (evt) => {
                evt.stopPropagation();

                // 使用优化后的NodeManager删除方法
                try {
                    const nodeManager = new NodeManager(this);
                    const deleteResult = nodeManager.deleteNode(element);
                    console.log('[deleteTool] 使用NodeManager删除节点:', element.id, '结果:', deleteResult);
                } catch (error) {
                    console.error('[deleteTool] NodeManager删除失败，使用备用方法:', error);
                    // 备用方法：直接删除
                    element.remove();
                }
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
                offset: { x: 0, y: 10 }, // 水平居中，距离顶部10px
                useModelGeometry: true, // 使用模型几何形状确保正确居中
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
                            'width': 30,
                            'height': 14,
                            'rx': 7,
                            'ry': 7,
                            'fill': 'rgba(0, 0, 0, 0.7)',
                            'cursor': 'pointer',
                            'class': 'node-property-icon',
                            'x': -15, // 确保矩形水平居中 (宽度的一半)
                            'y': 0
                        }
                    },
                    {
                        tagName: 'circle',
                        selector: 'dot1',
                        attributes: {
                            'cx': -6, // 相对于中心点的位置
                            'cy': 7,
                            'r': 2,
                            'fill': 'white',
                            'pointer-events': 'none'
                        }
                    },
                    {
                        tagName: 'circle',
                        selector: 'dot2',
                        attributes: {
                            'cx': 0, // 正中心
                            'cy': 7,
                            'r': 2,
                            'fill': 'white',
                            'pointer-events': 'none'
                        }
                    },
                    {
                        tagName: 'circle',
                        selector: 'dot3',
                        attributes: {
                            'cx': 6, // 相对于中心点的位置
                            'cy': 7,
                            'r': 2,
                            'fill': 'white',
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
      console.log(`[handleCellRemove] 节点被删除: ${cell.id}, 类型: ${cell.get('type')}`);

      // 清除相关状态
      if (this.state.selectedElement === cell) {
        this.state.selectedElement = null;
      }

      if (this.state.selectedLink === cell) {
        this.state.selectedLink = null;
      }

      if (this.state.currentEditingNode === cell) {
        this.state.currentEditingNode = null;
      }

      // 关闭属性面板（增强版本，包含多重检查）
      this.closePropertyPanelForDeletedNode(cell);

      // 如果删除的是容器节点，进行特殊清理
      if (cell.isContainer) {
        console.log(`[handleCellRemove] 清理容器节点相关状态: ${cell.id}`);

        // 清理容器调整大小相关状态
        if (this.state.resizingContainer === cell) {
          this.state.resizingContainer = null;
          this.state.resizeDirection = null;
          this.state.initialSize = null;
          this.state.initialPosition = null;
          this.state.initialMousePosition = null;
        }

        // 移除调整大小句柄
        this.removeResizeHandles();

        // 清理悬停状态
        if (this.state.hoveredElement === cell) {
          this.state.hoveredElement = null;
        }
      }

      // 清理UI元素
      this.cleanupCellUIElements(cell);

    } catch (error) {
      ErrorHandler.handle(error, '节点删除处理');
    }
  }

  /**
   * 关闭已删除节点的属性面板
   * @param {joint.shapes.standard.Element} cell
   */
  closePropertyPanelForDeletedNode(cell) {
    try {
      console.log(`[closePropertyPanelForDeletedNode] 检查已删除节点 ${cell.id} 的属性面板`);

      const propertyPanel = this.components.propertyPanel;
      if (!propertyPanel) {
        console.log('[closePropertyPanelForDeletedNode] 属性面板组件不存在');
        return;
      }

      // 检查属性面板是否可见
      if (!propertyPanel.isVisible) {
        console.log('[closePropertyPanelForDeletedNode] 属性面板未显示，无需关闭');
        return;
      }

      // 多重检查确保关闭正确的属性面板
      let shouldClose = false;

      // 检查1：直接对象引用比较
      if (propertyPanel.currentElement === cell) {
        console.log(`[closePropertyPanelForDeletedNode] 通过对象引用匹配到节点 ${cell.id}`);
        shouldClose = true;
      }

      // 检查2：ID比较（防止对象引用不一致）
      if (!shouldClose && propertyPanel.currentElement && propertyPanel.currentElement.id === cell.id) {
        console.log(`[closePropertyPanelForDeletedNode] 通过ID匹配到节点 ${cell.id}`);
        shouldClose = true;
      }

      // 检查3：应用状态比较
      if (!shouldClose && this.state.currentEditingNode === cell) {
        console.log(`[closePropertyPanelForDeletedNode] 通过应用状态匹配到节点 ${cell.id}`);
        shouldClose = true;
      }

      if (shouldClose) {
        console.log(`[closePropertyPanelForDeletedNode] 关闭节点 ${cell.id} 的属性面板`);
        propertyPanel.hide();

        // 确保应用状态也被清理
        if (this.state.currentEditingNode === cell) {
          this.state.currentEditingNode = null;
        }
      } else {
        console.log(`[closePropertyPanelForDeletedNode] 节点 ${cell.id} 的属性面板未打开或已关闭`);
      }

    } catch (error) {
      console.error('[closePropertyPanelForDeletedNode] 关闭属性面板时出错:', error);
      // 即使出错也要尝试强制关闭属性面板
      try {
        if (this.components.propertyPanel && this.components.propertyPanel.isVisible) {
          console.log('[closePropertyPanelForDeletedNode] 强制关闭属性面板');
          this.components.propertyPanel.hide();
        }
      } catch (e) {
        console.error('[closePropertyPanelForDeletedNode] 强制关闭属性面板也失败:', e);
      }
    }
  }

  /**
   * 清理节点相关的UI元素
   * @param {joint.shapes.standard.Element} cell
   */
  cleanupCellUIElements(cell) {
    try {
      // 清理与该节点相关的所有图标
      const nodeIcons = document.querySelectorAll(`[data-node-id="${cell.id}"]`);
      nodeIcons.forEach(icon => {
        try {
          if (icon.parentNode) {
            icon.parentNode.removeChild(icon);
          }
        } catch (e) {
          console.warn(`[cleanupCellUIElements] 清理节点图标失败:`, e);
        }
      });

      // 如果是当前悬停或选中的元素，清理通用图标
      if (this.state.hoveredElement === cell || this.state.selectedElement === cell) {
        const allIcons = document.querySelectorAll('.node-delete-icon, .node-property-icon');
        allIcons.forEach(icon => {
          try {
            if (icon.parentNode) {
              icon.parentNode.removeChild(icon);
            }
          } catch (e) {
            // 忽略清理过程中的错误
          }
        });
      }

    } catch (error) {
      console.warn(`[cleanupCellUIElements] 清理节点UI元素时出错:`, error);
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

    const isInside = center.x > bbox.x &&
           center.x < bbox.x + bbox.width &&
           center.y > bbox.y &&
           center.y < bbox.y + bbox.height;



    return isInside;
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
   * 创建调整大小的句柄
   * @param {joint.dia.ElementView} containerView
   */
  createResizeHandles(containerView) {
    // 移除旧的调整句柄
    this.removeResizeHandles();

    const container = containerView.model;
    if (!container.isResizable) return;

    const position = container.position();
    const size = container.size();

    console.log('[createResizeHandles] Creating handles for container:', container.id, 'at position:', position, 'size:', size);

    // 只创建左上角和右下角的调整大小句柄
    const directions = ['nw', 'se'];
    const handleSize = CONFIG.ui.resizeHandleSize || 12;

    directions.forEach(direction => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-handle-${direction}`;
      handle.style.position = 'fixed';
      handle.style.width = `${handleSize}px`;
      handle.style.height = `${handleSize}px`;
      handle.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      handle.style.border = '2px solid white';
      handle.style.cursor = direction === 'nw' ? 'nw-resize' : 'se-resize';
      handle.style.zIndex = '10001';
      handle.style.pointerEvents = 'auto';
      handle.style.transition = 'transform 0.2s ease';

      // Create triangular shape using CSS clip-path
      if (direction === 'nw') {
        // Top-left triangle pointing toward top-left (↖)
        handle.style.clipPath = 'polygon(0% 0%, 100% 0%, 0% 100%)';
      } else if (direction === 'se') {
        // Bottom-right triangle pointing toward bottom-right (↘)
        handle.style.clipPath = 'polygon(100% 0%, 100% 100%, 0% 100%)';
      }

      // 计算句柄位置 - 确保中心点精确对齐容器角点
      let handleX, handleY;
      if (direction === 'nw') {
        // 左上角：容器左上角位置
        handleX = position.x;
        handleY = position.y;
      } else {
        // 右下角：容器右下角位置
        handleX = position.x + size.width;
        handleY = position.y + size.height;
      }

      // 将SVG坐标转换为页面坐标
      const svgPoint = this.paper.svg.createSVGPoint();
      svgPoint.x = handleX;
      svgPoint.y = handleY;
      const screenPoint = svgPoint.matrixTransform(this.paper.svg.getScreenCTM());

      // 调整句柄位置，使其中心点精确对齐容器角点
      // 考虑边框：总视觉大小 = handleSize + 2px边框 * 2 = handleSize + 4px
      const borderWidth = 2;
      const totalVisualSize = handleSize + (borderWidth * 2);
      const finalLeft = screenPoint.x - totalVisualSize / 2;
      const finalTop = screenPoint.y - totalVisualSize / 2;

      handle.style.left = `${finalLeft}px`;
      handle.style.top = `${finalTop}px`;

      console.log(`[createResizeHandles] ${direction} handle positioned - Corner: (${screenPoint.x}, ${screenPoint.y}), Handle: (${finalLeft}, ${finalTop})`);

      // 添加悬停效果
      handle.onmouseenter = function() {
        this.style.transform = 'scale(1.2)';
        this._isMouseOver = true;
      };
      handle.onmouseleave = function() {
        this.style.transform = 'scale(1)';
        this._isMouseOver = false;
      };

      // 添加鼠标按下事件
      handle.addEventListener('mousedown', (evt) => {
        evt.stopPropagation();
        this.startResize(container, direction, evt);
      });

      // 将句柄添加到DOM
      document.body.appendChild(handle);
      this.state.resizeHandles.push(handle);
    });
  }

  /**
   * 移除调整大小的句柄
   */
  removeResizeHandles() {
    this.state.resizeHandles.forEach(handle => {
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    });
    this.state.resizeHandles = [];
  }

  /**
   * 开始调整大小
   * @param {joint.shapes.standard.Element} container
   * @param {string} direction
   * @param {MouseEvent} evt
   */
  startResize(container, direction, evt) {
    this.state.resizingContainer = container;
    this.state.resizeDirection = direction;
    this.state.initialSize = { width: container.size().width, height: container.size().height };
    this.state.initialPosition = { x: container.position().x, y: container.position().y };
    this.state.initialMousePosition = { x: evt.clientX, y: evt.clientY };

    // 添加全局鼠标事件
    this.eventManager.addEventListener(document, 'mousemove', this.handleResize.bind(this));
    this.eventManager.addEventListener(document, 'mouseup', this.stopResize.bind(this));

    // 防止文本选择
    document.body.style.userSelect = 'none';
  }

  /**
   * 处理调整大小
   * @param {MouseEvent} evt
   */
  handleResize(evt) {
    if (!this.state.resizingContainer) return;

    const dx = evt.clientX - this.state.initialMousePosition.x;
    const dy = evt.clientY - this.state.initialMousePosition.y;

    // 计算新的大小和位置
    let newWidth = this.state.initialSize.width;
    let newHeight = this.state.initialSize.height;
    let newX = this.state.initialPosition.x;
    let newY = this.state.initialPosition.y;

    // 根据调整方向更新大小和位置
    if (this.state.resizeDirection.includes('e')) {
      newWidth = Math.max(100, this.state.initialSize.width + dx);
    }
    if (this.state.resizeDirection.includes('w')) {
      const widthChange = Math.min(this.state.initialSize.width - 100, dx);
      newWidth = this.state.initialSize.width - widthChange;
      newX = this.state.initialPosition.x + widthChange;
    }
    if (this.state.resizeDirection.includes('s')) {
      newHeight = Math.max(80, this.state.initialSize.height + dy);
    }
    if (this.state.resizeDirection.includes('n')) {
      const heightChange = Math.min(this.state.initialSize.height - 80, dy);
      newHeight = this.state.initialSize.height - heightChange;
      newY = this.state.initialPosition.y + heightChange;
    }

    // 更新容器大小和位置
    this.state.resizingContainer.resize(newWidth, newHeight);
    this.state.resizingContainer.position(newX, newY);

    // 更新调整句柄位置
    this.updateResizeHandles();
  }

  /**
   * 停止调整大小
   */
  stopResize() {
    this.state.resizingContainer = null;
    this.state.resizeDirection = null;
    this.state.initialSize = null;
    this.state.initialPosition = null;
    this.state.initialMousePosition = null;

    // 移除全局事件监听器
    this.eventManager.removeEventListener(document, 'mousemove', this.handleResize.bind(this));
    this.eventManager.removeEventListener(document, 'mouseup', this.stopResize.bind(this));

    // 恢复文本选择
    document.body.style.userSelect = '';
  }

  /**
   * 更新调整句柄位置
   */
  updateResizeHandles() {
    // 检查是否有选中的容器节点和调整句柄
    if (!this.state.selectedElement ||
        !this.state.selectedElement.isContainer ||
        !this.state.selectedElement.isResizable ||
        this.state.resizeHandles.length === 0) {
      return;
    }

    const container = this.state.selectedElement;
    const position = container.position();
    const size = container.size();
    const handleSize = CONFIG.ui.resizeHandleSize || 12;

    this.state.resizeHandles.forEach((handle, index) => {
      const direction = index === 0 ? 'nw' : 'se';

      let handleX, handleY;
      if (direction === 'nw') {
        // 左上角：容器左上角位置
        handleX = position.x;
        handleY = position.y;
      } else {
        // 右下角：容器右下角位置
        handleX = position.x + size.width;
        handleY = position.y + size.height;
      }

      // 将SVG坐标转换为页面坐标
      const svgPoint = this.paper.svg.createSVGPoint();
      svgPoint.x = handleX;
      svgPoint.y = handleY;
      const screenPoint = svgPoint.matrixTransform(this.paper.svg.getScreenCTM());

      // 调整句柄位置，使其中心点精确对齐容器角点
      // 考虑边框：总视觉大小 = handleSize + 2px边框 * 2 = handleSize + 4px
      const borderWidth = 2;
      const totalVisualSize = handleSize + (borderWidth * 2);
      handle.style.left = `${screenPoint.x - totalVisualSize / 2}px`;
      handle.style.top = `${screenPoint.y - totalVisualSize / 2}px`;
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
        background: #ff6666 !important;
        transform: scale(1.05);
      }

      .node-property-icon circle {
        transition: all 0.2s ease;
      }

      .node-property-icon:hover circle {
        fill: white !important;
        transform: scale(1.2);
      }

      .node-delete-icon,
      .node-property-icon {
        transition: all 0.2s ease;
      }

      /* 调整大小句柄样式 */
      .resize-handle {
        position: fixed;
        background-color: rgba(0, 0, 0, 0.7);
        border: 2px solid white;
        z-index: 10001;
        pointer-events: auto;
        transition: transform 0.2s ease;
      }

      .resize-handle:hover {
        transform: scale(1.2);
        background-color: rgba(0, 0, 0, 0.9);
      }

      .resize-handle-nw {
        cursor: nw-resize;
      }

      .resize-handle-se {
        cursor: se-resize;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 初始化功能管理器
   */
  initManagers() {
    try {
      console.log('开始初始化功能管理器...');

      // 检查必要的类是否可用
      if (typeof CommandHistory === 'undefined') {
        console.error('CommandHistory 类未定义');
        return;
      }
      if (typeof ClipboardManager === 'undefined') {
        console.error('ClipboardManager 类未定义');
        return;
      }

      // 初始化命令历史管理器
      this.commandHistory = new CommandHistory(this);
      console.log('命令历史管理器已初始化:', this.commandHistory);

      // 初始化剪贴板管理器
      this.clipboardManager = new ClipboardManager(this);
      console.log('剪贴板管理器已初始化:', this.clipboardManager);

      console.log('功能管理器初始化完成');

      // 测试功能是否可用
      console.log('撤销/重做功能状态:', {
        canUndo: this.commandHistory.canUndo(),
        canRedo: this.commandHistory.canRedo()
      });
      console.log('剪贴板功能状态:', {
        isEmpty: this.clipboardManager.isEmpty()
      });

    } catch (error) {
      console.error('功能管理器初始化失败:', error);
      ErrorHandler.handle(error, '功能管理器初始化');
      throw error;
    }
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
