/**
 * 属性面板组件
 * 提供节点属性编辑功能
 */

class PropertyPanel {
  constructor(app) {
    this.app = app;
    this.panel = null;
    this.currentElement = null;
    this.isVisible = false;
    this.eventManager = new EventManager();

    // 拖拽状态
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.panelStartX = 0;
    this.panelStartY = 0;

    // 验证定时器
    this.validationTimer = null;
  }

  /**
   * 初始化属性面板
   */
  init() {
    try {
      this.createPanel();
      this.bindEvents();

      console.log('属性面板初始化完成');

    } catch (error) {
      ErrorHandler.handle(error, '属性面板初始化');
    }
  }

  /**
   * 创建属性面板
   */
  createPanel() {
    // 移除旧面板
    const existingPanel = document.getElementById('property-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    this.panel = document.createElement('div');
    this.panel.id = 'property-panel';
    this.panel.className = 'property-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      padding: 20px;
      z-index: 20000;
      min-width: 450px;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      display: none;
      cursor: move;
    `;

    // Add CSS styles for tabbed interface
    this.addTabStyles();

    document.body.appendChild(this.panel);
  }

  /**
   * 添加选项卡样式
   */
  addTabStyles() {
    // Check if styles already exist
    if (document.getElementById('property-panel-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'property-panel-styles';
    style.textContent = `
      .property-panel h3 {
        margin-top: 0;
        margin-bottom: 0;
        color: #333;
        font-size: 18px;
        position: relative;
      }

      .panel-header {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 15px;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
      }

      .panel-header h3 {
        margin-bottom: 0;
        flex: 1;
      }

      .panel-close-icon {
        width: 24px;
        height: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        color: #aaa;
        font-size: 20px;
        font-weight: normal;
        transition: color 0.2s ease;
        border-radius: 50%;
        margin-left: 10px;
      }

      .panel-close-icon:hover {
        color: #666;
        background-color: #f5f5f5;
      }

      .property-panel .form-group {
        margin-bottom: 15px;
      }

      .property-panel label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #555;
      }

      .property-panel input[type="text"],
      .property-panel input[type="number"],
      .property-panel select,
      .property-panel textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
        font-size: 14px;
      }

      .property-panel textarea {
        min-height: 80px;
        resize: vertical;
      }

      .property-panel .button-group {
        display: flex;
        justify-content: flex-end;
        margin-top: 20px;
      }

      .property-panel button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 10px;
      }

      .property-panel .save-btn {
        background-color: #2196f3;
        color: white;
      }

      .property-panel .save-btn:hover {
        background-color: #1976d2;
      }

      .property-panel .cancel-btn {
        background-color: #f5f5f5;
        color: #333;
      }

      .property-panel .cancel-btn:hover {
        background-color: #e0e0e0;
      }

      /* 选项卡样式 */
      .tabs-container {
        display: flex;
        border-bottom: 1px solid #ddd;
        margin-bottom: 20px;
        margin-top: 5px;
      }

      .tab {
        padding: 10px 15px;
        cursor: pointer;
        font-weight: 500;
        color: #666;
        position: relative;
        transition: all 0.2s ease;
        border-bottom: 2px solid transparent;
      }

      .tab:hover {
        color: #333;
        background-color: #f8f9fa;
      }

      .tab.active {
        color: #2196f3;
        border-bottom-color: #2196f3;
        background-color: #f8f9fa;
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

      /* Group Setting 特殊样式 - 垂直选项卡布局 */
      .group-setting-categories {
        display: flex;
        height: 400px;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
      }

      /* 左侧垂直选项卡容器 */
      .category-tabs-container {
        display: flex;
        flex-direction: column;
        width: 150px;
        background-color: #f8f9fa;
        border-right: 1px solid #ddd;
      }

      .category-header {
        padding: 12px 10px;
        color: white;
        font-weight: bold;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        position: relative;
      }

      .category-header:last-child {
        border-bottom: none;
      }

      /* 蓝色主题 - 未选中状态 */
      .master-data-header,
      .loading-seq-header,
      .left-over-header,
      .categorial-header {
        background-color: #90caf9; /* 浅蓝色 */
        color: #1565c0; /* 深蓝色文字 */
      }

      /* 悬停效果 */
      .category-header:hover {
        background-color: #64b5f6; /* 中等蓝色 */
        color: white;
        transform: translateX(2px);
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
      }

      /* 选中状态 */
      .category-header.active {
        background-color: #1976d2; /* 高饱和度蓝色 */
        color: white;
        transform: translateX(4px);
        box-shadow: 4px 0 8px rgba(0, 0, 0, 0.15);
      }

      /* 右侧内容区域 */
      .category-content-container {
        flex: 1;
        position: relative;
        background-color: white;
      }

      .category-content {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 20px;
        overflow-y: auto;
        display: none;
      }

      .category-content.active {
        display: block;
      }

      /* 旧的样式保持兼容性 */
      .category-section {
        display: none; /* 隐藏旧的水平布局 */
      }

      .input-with-icon {
        position: relative;
        display: flex;
        align-items: center;
      }

      .input-with-icon input {
        flex: 1;
        padding-right: 30px;
      }

      .fx-icon {
        position: absolute;
        right: 8px;
        color: #666;
        font-style: italic;
        font-weight: bold;
        pointer-events: none;
      }

      .loading-seq-field {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        padding: 5px;
        background-color: #f8f9fa;
        border-radius: 4px;
      }

      .field-number {
        margin-right: 10px;
        font-weight: bold;
        min-width: 20px;
      }

      .field-name {
        flex: 1;
        margin-right: 10px;
      }

      .field-order {
        font-weight: bold;
        color: #666;
      }

      .add-field-btn {
        width: 30px;
        height: 30px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 10px;
      }

      .add-field-btn:hover {
        background-color: #f0f0f0;
      }

      /* 拖拽相关样式 */
      .property-panel input,
      .property-panel textarea,
      .property-panel select,
      .property-panel button,
      .property-panel .panel-close-icon,
      .property-panel .tab,
      .property-panel .category-header {
        cursor: default !important;
      }

      .property-panel input:hover,
      .property-panel textarea:hover,
      .property-panel select:hover {
        cursor: text !important;
      }

      .property-panel button:hover,
      .property-panel .panel-close-icon:hover,
      .property-panel .tab:hover,
      .property-panel .category-header:hover {
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 阻止面板内点击事件冒泡
    this.eventManager.addEventListener(this.panel, 'click', (e) => {
      e.stopPropagation();
    });

    // ESC键关闭面板
    this.eventManager.addEventListener(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // 拖拽功能
    this.setupDragFunctionality();
  }

  /**
   * 设置拖拽功能
   */
  setupDragFunctionality() {
    // 鼠标按下事件
    this.eventManager.addEventListener(this.panel, 'mousedown', (e) => {
      // 检查是否点击在可拖拽区域（非交互元素）
      if (this.isDraggableArea(e.target)) {
        this.startDrag(e);
      }
    });

    // 使用节流处理鼠标移动事件以获得平滑的拖拽体验
    const throttledDragMove = throttle((e) => {
      if (this.isDragging) {
        requestAnimationFrame(() => {
          this.handleDrag(e);
        });
      }
    }, CONFIG.ui.dragThrottleDelay || 5);

    this.eventManager.addEventListener(document, 'mousemove', throttledDragMove);

    // 鼠标抬起事件
    this.eventManager.addEventListener(document, 'mouseup', () => {
      if (this.isDragging) {
        this.endDrag();
      }
    });
  }

  /**
   * 检查是否为可拖拽区域
   */
  isDraggableArea(target) {
    // 排除交互元素
    const interactiveElements = [
      'input', 'textarea', 'select', 'button', 'a'
    ];

    const tagName = target.tagName.toLowerCase();

    // 如果是交互元素，不允许拖拽
    if (interactiveElements.includes(tagName)) {
      return false;
    }

    // 如果是关闭按钮或其他特殊类，不允许拖拽
    if (target.classList.contains('panel-close-icon') ||
        target.classList.contains('save-btn') ||
        target.classList.contains('cancel-btn') ||
        target.classList.contains('add-case-btn') ||
        target.classList.contains('remove-case-btn') ||
        target.classList.contains('tab') ||
        target.classList.contains('category-header')) {
      return false;
    }

    // 检查父元素是否为交互元素
    let parent = target.parentElement;
    while (parent && parent !== this.panel) {
      if (interactiveElements.includes(parent.tagName.toLowerCase()) ||
          parent.classList.contains('panel-close-icon') ||
          parent.classList.contains('save-btn') ||
          parent.classList.contains('cancel-btn') ||
          parent.classList.contains('add-case-btn') ||
          parent.classList.contains('remove-case-btn') ||
          parent.classList.contains('tab') ||
          parent.classList.contains('category-header')) {
        return false;
      }
      parent = parent.parentElement;
    }

    return true;
  }

  /**
   * 开始拖拽
   */
  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;

    // 记录拖拽开始位置
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    // 获取面板当前位置
    const rect = this.panel.getBoundingClientRect();
    this.panelStartX = rect.left;
    this.panelStartY = rect.top;

    // 改变光标样式
    document.body.style.cursor = 'grabbing';
    this.panel.style.cursor = 'grabbing';

    console.log('开始拖拽属性面板');
  }

  /**
   * 处理拖拽移动
   */
  handleDrag(e) {
    if (!this.isDragging) return;

    // 计算移动距离
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;

    // 计算新位置
    const newX = this.panelStartX + deltaX;
    const newY = this.panelStartY + deltaY;

    // 确保面板不会移出视窗
    const maxX = window.innerWidth - this.panel.offsetWidth;
    const maxY = window.innerHeight - this.panel.offsetHeight;

    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

    // 更新面板位置
    this.panel.style.left = constrainedX + 'px';
    this.panel.style.top = constrainedY + 'px';
    this.panel.style.transform = 'none'; // 移除居中变换
  }

  /**
   * 结束拖拽
   */
  endDrag() {
    this.isDragging = false;

    // 恢复光标样式
    document.body.style.cursor = '';
    this.panel.style.cursor = 'move';

    console.log('结束拖拽属性面板');
  }

  /**
   * 显示属性面板
   */
  show(element) {
    if (!element) return;

    this.currentElement = element;
    this.isVisible = true;

    // 生成面板内容
    this.generatePanelContent(element);

    // 重置面板位置到居中并显示
    this.resetPanelPosition();
    this.panel.style.display = 'block';

    // 设置定期验证，确保元素仍然有效
    this.startValidationTimer();

    console.log('属性面板已显示，编辑元素:', element.id);
  }

  /**
   * 重置面板位置到屏幕中央
   */
  resetPanelPosition() {
    // 重置所有定位相关的样式
    this.panel.style.left = '';
    this.panel.style.top = '';
    this.panel.style.transform = 'translate(-50%, -50%)';

    // 确保面板使用固定定位并居中
    this.panel.style.position = 'fixed';
    this.panel.style.left = '50%';
    this.panel.style.top = '50%';

    // 确保面板在视窗内可见
    // 使用 requestAnimationFrame 确保 DOM 更新后再检查位置
    requestAnimationFrame(() => {
      this.ensurePanelInViewport();
    });

    console.log('属性面板位置已重置到屏幕中央');
  }

  /**
   * 确保面板在视窗内可见
   */
  ensurePanelInViewport() {
    if (!this.panel || this.panel.style.display === 'none') return;

    const rect = this.panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 检查面板是否超出视窗边界
    let needsAdjustment = false;
    let newLeft = '50%';
    let newTop = '50%';
    let newTransform = 'translate(-50%, -50%)';

    // 如果面板超出视窗，调整到安全位置
    if (rect.left < 0 || rect.right > viewportWidth || rect.top < 0 || rect.bottom > viewportHeight) {
      needsAdjustment = true;

      // 计算安全的居中位置
      const panelWidth = this.panel.offsetWidth;
      const panelHeight = this.panel.offsetHeight;

      // 确保面板完全在视窗内
      const safeLeft = Math.max(20, Math.min(viewportWidth - panelWidth - 20, (viewportWidth - panelWidth) / 2));
      const safeTop = Math.max(20, Math.min(viewportHeight - panelHeight - 20, (viewportHeight - panelHeight) / 2));

      newLeft = safeLeft + 'px';
      newTop = safeTop + 'px';
      newTransform = 'none';
    }

    if (needsAdjustment) {
      this.panel.style.left = newLeft;
      this.panel.style.top = newTop;
      this.panel.style.transform = newTransform;
      console.log('属性面板位置已调整到视窗内安全位置');
    }
  }

  /**
   * 隐藏属性面板
   */
  hide() {
    this.isVisible = false;
    this.currentElement = null;
    this.isDragging = false;

    // 停止验证定时器
    this.stopValidationTimer();

    // 隐藏面板并重置位置
    this.panel.style.display = 'none';
    this.resetPanelPosition();

    console.log('属性面板已隐藏');
  }

  /**
   * 生成面板内容
   */
  generatePanelContent(element) {
    const type = element.get('type');
    const nodeLabel = element.attr('label/text') || element.attr('text/text') || '';

    // 获取节点已有的属性数据
    const properties = element.prop('properties') || {};

    let panelTitle = '';
    let commonContent = '';
    let propertiesContent = '';
    let useTabs = true; // 默认使用选项卡

    // 为不同类型的节点生成内容
    if (type === 'standard.Circle' && (nodeLabel === '开始' || nodeLabel === '结束')) {
      // 开始/结束节点属性 - 不使用选项卡
      useTabs = false;
      panelTitle = nodeLabel === '开始' ? '开始节点属性' : '结束节点属性';
      commonContent = `
        <div class="form-group">
          <label for="node-name">节点名称</label>
          <input type="text" id="node-name" value="${properties.name || nodeLabel}" />
        </div>
        <div class="form-group">
          <label for="node-description">描述</label>
          <textarea id="node-description">${properties.description || ''}</textarea>
        </div>
      `;
    } else if (type === 'standard.Rectangle' && nodeLabel === 'Group Setting') {
      // Group Setting节点属性
      panelTitle = 'Group Setting节点属性';

      // 通用选项卡内容
      commonContent = `
        <div class="form-group">
          <label for="node-name">节点名称</label>
          <input type="text" id="node-name" value="${properties.name || 'Group Setting'}" />
        </div>
        <div class="form-group">
          <label for="node-description">描述</label>
          <textarea id="node-description">${properties.description || ''}</textarea>
        </div>
      `;

      // 属性选项卡内容 - 4个分类（垂直布局）
      propertiesContent = `
        <div class="group-setting-categories">
          <!-- 左侧垂直选项卡 -->
          <div class="category-tabs-container">
            <div class="category-header master-data-header active" data-category="master-data">
              <span>Master Data</span>
            </div>
            <div class="category-header loading-seq-header" data-category="loading-seq">
              <span>Loading Seq</span>
            </div>
            <div class="category-header left-over-header" data-category="left-over">
              <span>Left Over</span>
            </div>
            <div class="category-header categorial-header" data-category="categorial">
              <span>Categorial</span>
            </div>
          </div>

          <!-- 右侧内容区域 -->
          <div class="category-content-container">
            <!-- Master Data Content -->
            <div class="category-content master-data-content active">
              <div class="form-group">
                <label for="source-field-name">Source Field Name</label>
                <div class="input-with-icon">
                  <input type="text" id="source-field-name" value="${properties.sourceFieldName || ''}" />
                  <span class="fx-icon">fx</span>
                </div>
              </div>
              <div class="form-group">
                <label for="destination-field-name">Destination Field Name</label>
                <div class="input-with-icon">
                  <input type="text" id="destination-field-name" value="${properties.destinationFieldName || ''}" />
                  <span class="fx-icon">fx</span>
                </div>
              </div>
            </div>

            <!-- Loading Seq Content -->
            <div class="category-content loading-seq-content">
              <div id="loading-seq-fields">
                ${this.generateLoadingSeqFields(properties.loadingSeqFields || [])}
              </div>
              <button type="button" id="add-loading-seq-field" class="add-field-btn">+</button>
            </div>

            <!-- Left Over Content -->
            <div class="category-content left-over-content">
              <div class="form-group">
                <label for="left-over-way-out">Left Over way out</label>
                <select id="left-over-way-out">
                  <option value="Light Load" ${properties.leftOverWayOut === 'Light Load' ? 'selected' : ''}>Light Load</option>
                  <option value="Next Round" ${properties.leftOverWayOut === 'Next Round' ? 'selected' : ''}>Next Round</option>
                </select>
              </div>
              <div class="form-group">
                <label for="loop-data-type">Loop Data Type</label>
                <select id="loop-data-type">
                  <option value="OnlyLeftover" ${properties.loopDataType === 'OnlyLeftover' ? 'selected' : ''}>OnlyLeftover</option>
                  <option value="All" ${properties.loopDataType === 'All' ? 'selected' : ''}>All</option>
                </select>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="is-not-keep-cntr" ${properties.isNotKeepCNTR ? 'checked' : ''} />
                  IsNotKeepCNTR
                </label>
              </div>
            </div>

            <!-- Categorial Content -->
            <div class="category-content categorial-content">
              <div class="form-group">
                <label>
                  <input type="checkbox" id="enabled" ${properties.enabled ? 'checked' : ''} />
                  Enabled
                </label>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (type === 'standard.Rectangle' && !element.isContainer && !element.isSwitch) {
      // Grouping节点属性
      panelTitle = 'Grouping节点属性';

      // 通用选项卡内容
      commonContent = `
        <div class="form-group">
          <label for="node-name">节点名称</label>
          <input type="text" id="node-name" value="${properties.name || 'Grouping'}" />
        </div>
        <div class="form-group">
          <label for="node-description">描述</label>
          <textarea id="node-description">${properties.description || ''}</textarea>
        </div>
      `;

      // 属性选项卡内容
      propertiesContent = `
        <div class="form-group">
          <label for="node-field">Field</label>
          <input type="text" id="node-field" value="${properties.field || ''}" />
        </div>
        <div class="form-group">
          <label for="node-field-value">Field Value</label>
          <input type="text" id="node-field-value" value="${properties.fieldValue || ''}" />
        </div>
        <div class="form-group">
          <label for="node-wrapper-fields">Wrapper Fields</label>
          <input type="text" id="node-wrapper-fields" value="${properties.wrapperFields || ''}" />
        </div>
        <div class="form-group">
          <label for="node-category-value">Category Value</label>
          <input type="text" id="node-category-value" value="${properties.categoryValue || ''}" />
        </div>
      `;
    } else if (type === 'workflow.Decision') {
      // 决策节点属性
      panelTitle = '决策节点属性';

      // 通用选项卡内容
      commonContent = `
        <div class="form-group">
          <label for="node-name">节点名称</label>
          <input type="text" id="node-name" value="${properties.name || '决策'}" />
        </div>
        <div class="form-group">
          <label for="node-description">描述</label>
          <textarea id="node-description">${properties.description || ''}</textarea>
        </div>
      `;

      // 属性选项卡内容
      propertiesContent = `
        <div class="form-group">
          <label for="node-condition">决策条件</label>
          <textarea id="node-condition">${properties.condition || ''}</textarea>
        </div>
      `;
    } else if (element.isContainer) {
      // 容器节点属性
      panelTitle = '容器节点属性';

      // 通用选项卡内容
      commonContent = `
        <div class="form-group">
          <label for="node-name">节点名称</label>
          <input type="text" id="node-name" value="${properties.name || '容器'}" />
        </div>
        <div class="form-group">
          <label for="node-description">描述</label>
          <textarea id="node-description">${properties.description || ''}</textarea>
        </div>
      `;

      // 属性选项卡内容
      propertiesContent = `
        <div class="form-group">
          <label for="container-title">容器标题</label>
          <input type="text" id="container-title" value="${element.attr('headerText/text') || ''}" />
        </div>
      `;
    } else if (element.isSwitch) {
      // Switch 节点属性
      panelTitle = 'Switch 节点属性';

      // 获取 cases 数据
      const cases = properties.cases || [
        { name: 'Case 1', expression: '' },
        { name: 'Case 2', expression: '' }
      ];

      // 通用选项卡内容
      commonContent = `
        <div class="form-group">
          <label for="node-name">节点名称</label>
          <input type="text" id="node-name" value="${properties.name || 'Switch'}" />
        </div>
        <div class="form-group">
          <label for="node-description">描述</label>
          <textarea id="node-description">${properties.description || '评估多个条件并根据结果继续执行'}</textarea>
        </div>
      `;

      // 属性选项卡内容 - Cases
      propertiesContent = `
        <h4 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Cases</h4>
        <div id="cases-container" style="max-height: 300px; overflow-y: auto; padding-right: 5px;">
      `;

      // 生成 cases 表单
      cases.forEach((caseItem, index) => {
        // 检查是否为 Default case
        const isDefault = caseItem.isDefault === true;

        propertiesContent += `
          <div class="case-item" data-index="${index}" style="border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin-bottom: 10px; background-color: #f9f9f9;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong>Case ${index + 1}${isDefault ? ' (Default)' : ''}</strong>
              ${!isDefault ? `<button type="button" class="remove-case-btn" data-index="${index}" style="background: #ff4444; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 12px;">删除</button>` : ''}
            </div>
            <div class="form-group">
              <label for="case-name-${index}">Case Name</label>
              <input type="text" id="case-name-${index}" value="${caseItem.name}" ${isDefault ? 'disabled' : ''} style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px; ${isDefault ? 'background-color: #f5f5f5; color: #666;' : ''}" />
            </div>
            ${!isDefault ? `
            <div class="form-group">
              <label for="case-expression-${index}">Expression</label>
              <textarea id="case-expression-${index}" rows="2" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px; resize: vertical;">${caseItem.expression || ''}</textarea>
            </div>
            ` : ''}
          </div>
        `;
      });

      propertiesContent += `
        </div>
        <button type="button" id="add-case-btn" style="background: #2196f3; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; margin-top: 10px;">添加 Case</button>
      `;
    } else {
      // 通用节点属性
      panelTitle = '节点属性';

      // 通用选项卡内容
      commonContent = `
        <div class="form-group">
          <label for="node-name">节点名称</label>
          <input type="text" id="node-name" value="${properties.name || nodeLabel}" />
        </div>
        <div class="form-group">
          <label for="node-description">描述</label>
          <textarea id="node-description">${properties.description || ''}</textarea>
        </div>
      `;

      // 属性选项卡内容
      propertiesContent = `
        <div class="form-group">
          <label for="node-label">标签文本</label>
          <input type="text" id="node-label" value="${nodeLabel}" />
        </div>
      `;
    }

    // 构建面板内容
    let panelContent = '';

    if (useTabs) {
      // 使用选项卡的面板内容
      panelContent = `
        <div class="tabs-container">
          <div class="tab active" data-tab="common">Common</div>
          <div class="tab" data-tab="properties">Properties</div>
        </div>
        <div class="tab-content active" id="tab-common">
          ${commonContent}
        </div>
        <div class="tab-content" id="tab-properties">
          ${propertiesContent}
        </div>
        <div class="button-group">
          <button class="cancel-btn" id="property-cancel">取消</button>
          <button class="save-btn" id="property-save">保存</button>
        </div>
      `;
    } else {
      // 不使用选项卡的面板内容（开始/结束节点）
      panelContent = `
        ${commonContent}
        <div class="button-group">
          <button class="cancel-btn" id="property-cancel">取消</button>
          <button class="save-btn" id="property-save">保存</button>
        </div>
      `;
    }

    // 设置面板内容
    this.panel.innerHTML = `
      <div class="panel-header">
        <h3>${panelTitle}</h3>
        <div class="panel-close-icon">&times;</div>
      </div>
      ${panelContent}
    `;

    // 添加选项卡切换功能
    if (useTabs) {
      this.setupTabSwitching();
    }

    // 添加Group Setting分类切换功能
    if (type === 'standard.Rectangle' && nodeLabel === 'Group Setting') {
      this.setupGroupSettingCategories();
    }

    this.bindPanelEvents();
  }

  /**
   * 设置选项卡切换功能
   */
  setupTabSwitching() {
    const tabs = this.panel.querySelectorAll('.tab');
    const tabContents = this.panel.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      this.eventManager.addEventListener(tab, 'click', () => {
        // 移除所有选项卡的活动状态
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // 添加当前选项卡的活动状态
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        const targetContent = this.panel.querySelector(`#tab-${tabId}`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  /**
   * 生成Loading Seq字段
   */
  generateLoadingSeqFields(fields) {
    if (!fields || fields.length === 0) {
      return `
        <div class="loading-seq-field">
          <span class="field-number">1.</span>
          <span class="field-name">Field1</span>
          <span class="field-order">Asc</span>
        </div>
        <div class="loading-seq-field">
          <span class="field-number">2.</span>
          <span class="field-name">Field2</span>
          <span class="field-order">Desc</span>
        </div>
        <div class="loading-seq-field">
          <span class="field-number">3.</span>
          <span class="field-name">Field3</span>
          <span class="field-order">Desc</span>
        </div>
      `;
    }

    return fields.map((field, index) => `
      <div class="loading-seq-field">
        <span class="field-number">${index + 1}.</span>
        <span class="field-name">${field.field}</span>
        <span class="field-order">${field.order}</span>
      </div>
    `).join('');
  }

  /**
   * 设置Group Setting分类切换功能
   */
  setupGroupSettingCategories() {
    const categoryHeaders = this.panel.querySelectorAll('.category-header');
    const categoryContents = this.panel.querySelectorAll('.category-content');

    categoryHeaders.forEach(header => {
      this.eventManager.addEventListener(header, 'click', () => {
        // 移除所有分类头部的活动状态
        categoryHeaders.forEach(h => h.classList.remove('active'));
        // 移除所有分类内容的活动状态
        categoryContents.forEach(content => content.classList.remove('active'));

        // 添加当前分类头部的活动状态
        header.classList.add('active');

        // 添加当前分类内容的活动状态
        const category = header.getAttribute('data-category');
        const targetContent = this.panel.querySelector(`.${category}-content`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  /**
   * 获取节点类型名称
   */
  getNodeTypeName(type) {
    const typeNames = {
      'standard.Circle': '圆形节点',
      'standard.Rectangle': '矩形节点',
      'workflow.Decision': '判断节点',
      'workflow.Container': '容器节点',
      'workflow.Switch': 'Switch节点'
    };
    return typeNames[type] || '未知类型';
  }

  /**
   * 绑定面板事件
   */
  bindPanelEvents() {
    // 关闭按钮 (新的样式)
    const closeBtn = this.panel.querySelector('.panel-close-icon');
    if (closeBtn) {
      this.eventManager.addEventListener(closeBtn, 'click', () => {
        this.hide();
      });
    }

    // 保存按钮
    const saveBtn = this.panel.querySelector('#property-save');
    if (saveBtn) {
      this.eventManager.addEventListener(saveBtn, 'click', () => {
        this.applyChanges();
      });
    }

    // 取消按钮
    const cancelBtn = this.panel.querySelector('#property-cancel');
    if (cancelBtn) {
      this.eventManager.addEventListener(cancelBtn, 'click', () => {
        this.hide();
      });
    }

    // Switch节点的添加Case按钮
    const addCaseBtn = this.panel.querySelector('#add-case-btn');
    if (addCaseBtn) {
      this.eventManager.addEventListener(addCaseBtn, 'click', () => {
        this.addSwitchCase();
      });
    }

    // Switch节点的删除Case按钮
    const removeCaseBtns = this.panel.querySelectorAll('.remove-case-btn');
    removeCaseBtns.forEach(btn => {
      this.eventManager.addEventListener(btn, 'click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this.removeSwitchCase(index);
      });
    });
  }

  /**
   * 添加Switch Case
   */
  addSwitchCase() {
    if (!this.currentElement || !this.currentElement.isSwitch) return;

    const properties = this.currentElement.prop('properties') || {};
    const cases = properties.cases || [];

    // 添加新的case
    const newCase = {
      name: `Case ${cases.length + 1}`,
      expression: '',
      isDefault: false
    };

    cases.push(newCase);
    properties.cases = cases;
    this.currentElement.prop('properties', properties);

    // 重新生成面板内容
    this.generatePanelContent(this.currentElement);
  }

  /**
   * 删除Switch Case
   */
  removeSwitchCase(index) {
    if (!this.currentElement || !this.currentElement.isSwitch) return;

    const properties = this.currentElement.prop('properties') || {};
    const cases = properties.cases || [];

    // 不能删除Default case
    if (cases[index] && cases[index].isDefault) {
      return;
    }

    // 删除指定的case
    cases.splice(index, 1);
    properties.cases = cases;
    this.currentElement.prop('properties', properties);

    // 重新生成面板内容
    this.generatePanelContent(this.currentElement);
  }

  /**
   * 应用更改
   */
  applyChanges() {
    if (!this.currentElement) return;

    try {
      const type = this.currentElement.get('type');
      const nodeLabel = this.currentElement.attr('label/text') || this.currentElement.attr('text/text') || '';

      // 获取或创建properties对象
      let properties = this.currentElement.prop('properties') || {};

      // 通用属性更改
      const nameInput = this.panel.querySelector('#node-name');
      if (nameInput) {
        properties.name = nameInput.value.trim();
      }

      const descriptionInput = this.panel.querySelector('#node-description');
      if (descriptionInput) {
        properties.description = descriptionInput.value.trim();
      }

      // 标签文本更改（用于通用节点）
      const labelInput = this.panel.querySelector('#node-label');
      if (labelInput) {
        const newLabel = labelInput.value.trim();
        if (type === 'standard.Circle' || type === 'standard.Rectangle') {
          this.currentElement.attr('label/text', newLabel);
        } else {
          this.currentElement.attr('text/text', newLabel);
        }
      }

      // 特定类型属性更改
      if (type === 'workflow.Decision') {
        const conditionInput = this.panel.querySelector('#node-condition');
        if (conditionInput) {
          properties.condition = conditionInput.value.trim();
        }
      } else if (this.currentElement.isContainer) {
        const titleInput = this.panel.querySelector('#container-title');
        if (titleInput) {
          this.currentElement.attr('headerText/text', titleInput.value.trim());
        }
      } else if (this.currentElement.isSwitch) {
        // 处理Switch节点的Cases
        const cases = [];
        const caseItems = this.panel.querySelectorAll('.case-item');

        caseItems.forEach((item, index) => {
          const nameInput = item.querySelector(`#case-name-${index}`);
          const expressionInput = item.querySelector(`#case-expression-${index}`);

          const caseData = {
            name: nameInput ? nameInput.value.trim() : `Case ${index + 1}`,
            expression: expressionInput ? expressionInput.value.trim() : '',
            isDefault: nameInput ? nameInput.disabled : false
          };

          cases.push(caseData);
        });

        properties.cases = cases;
      } else if (type === 'standard.Rectangle' && nodeLabel === 'Group Setting') {
        // Group Setting节点特定属性
        const sourceFieldNameInput = this.panel.querySelector('#source-field-name');
        if (sourceFieldNameInput) {
          properties.sourceFieldName = sourceFieldNameInput.value.trim();
        }

        const destinationFieldNameInput = this.panel.querySelector('#destination-field-name');
        if (destinationFieldNameInput) {
          properties.destinationFieldName = destinationFieldNameInput.value.trim();
        }

        const leftOverWayOutSelect = this.panel.querySelector('#left-over-way-out');
        if (leftOverWayOutSelect) {
          properties.leftOverWayOut = leftOverWayOutSelect.value;
        }

        const loopDataTypeSelect = this.panel.querySelector('#loop-data-type');
        if (loopDataTypeSelect) {
          properties.loopDataType = loopDataTypeSelect.value;
        }

        const isNotKeepCNTRCheckbox = this.panel.querySelector('#is-not-keep-cntr');
        if (isNotKeepCNTRCheckbox) {
          properties.isNotKeepCNTR = isNotKeepCNTRCheckbox.checked;
        }

        const enabledCheckbox = this.panel.querySelector('#enabled');
        if (enabledCheckbox) {
          properties.enabled = enabledCheckbox.checked;
        }
      } else if (type === 'standard.Rectangle' && !this.currentElement.isContainer && !this.currentElement.isSwitch) {
        // Grouping节点特定属性
        const fieldInput = this.panel.querySelector('#node-field');
        if (fieldInput) {
          properties.field = fieldInput.value.trim();
        }

        const fieldValueInput = this.panel.querySelector('#node-field-value');
        if (fieldValueInput) {
          properties.fieldValue = fieldValueInput.value.trim();
        }

        const wrapperFieldsInput = this.panel.querySelector('#node-wrapper-fields');
        if (wrapperFieldsInput) {
          properties.wrapperFields = wrapperFieldsInput.value.trim();
        }

        const categoryValueInput = this.panel.querySelector('#node-category-value');
        if (categoryValueInput) {
          properties.categoryValue = categoryValueInput.value.trim();
        }
      }

      // 保存properties到元素
      this.currentElement.prop('properties', properties);

      console.log('属性更改已应用');
      this.hide();

    } catch (error) {
      ErrorHandler.handle(error, '应用属性更改');
    }
  }

  /**
   * 获取当前编辑的元素
   */
  getCurrentElement() {
    return this.currentElement;
  }

  /**
   * 检查面板是否可见
   */
  isShown() {
    return this.isVisible;
  }

  /**
   * 检查当前元素是否仍然存在于图中
   */
  isCurrentElementValid() {
    if (!this.currentElement || !this.isVisible) {
      return false;
    }

    try {
      // 检查元素是否仍在图中
      const elementInGraph = this.app.graph.getCell(this.currentElement.id);
      return elementInGraph !== undefined;
    } catch (error) {
      console.warn('[PropertyPanel] 检查当前元素有效性时出错:', error);
      return false;
    }
  }

  /**
   * 如果当前元素无效则自动关闭面板
   */
  validateAndCloseIfInvalid() {
    if (this.isVisible && !this.isCurrentElementValid()) {
      console.log('[PropertyPanel] 当前元素已无效，自动关闭属性面板');
      this.hide();
      return true;
    }
    return false;
  }

  /**
   * 开始验证定时器
   */
  startValidationTimer() {
    // 清除现有定时器
    this.stopValidationTimer();

    // 设置新的定时器，每2秒检查一次
    this.validationTimer = setInterval(() => {
      this.validateAndCloseIfInvalid();
    }, 2000);
  }

  /**
   * 停止验证定时器
   */
  stopValidationTimer() {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
    }
  }

  /**
   * 销毁属性面板
   */
  destroy() {
    try {
      // 停止验证定时器
      this.stopValidationTimer();

      // 清理事件监听器
      this.eventManager.removeAllListeners();

      // 清理DOM元素
      if (this.panel) {
        this.panel.remove();
        this.panel = null;
      }

      // 重置状态
      this.currentElement = null;
      this.isVisible = false;

      console.log('属性面板已销毁');

    } catch (error) {
      ErrorHandler.handle(error, '属性面板销毁');
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PropertyPanel };
} else {
  window.PropertyPanel = PropertyPanel;
}
