/**
 * 小地图组件
 * 提供工作流的缩略图预览和快速导航功能
 */

class Minimap {
  /**
   * @param {WorkflowApp} app
   */
  constructor(app) {
    this.app = app;
    /** @type {HTMLElement | null} */
    this.container = null;
    /** @type {joint.dia.Paper | null} */
    this.paper = null;
    /** @type {joint.dia.Graph | null} */
    this.graph = null;
    /** @type {HTMLElement | null} */
    this.viewportRect = null;
    this.isVisible = true;
    this.scale = 0.1; // 小地图缩放比例
    this.eventManager = new EventManager();
  }

  /**
   * 初始化小地图
   */
  init() {
    try {
      this.container = document.getElementById('minimap-container');
      if (!this.container) {
        console.warn('小地图容器未找到');
        return;
      }

      this.setupMinimap();
      this.bindEvents();
      this.updateMinimap();

      console.log('小地图初始化完成');

    } catch (/** @type {unknown} */ error) { // ts(e11b4bfc)
      if (error instanceof Error) {
        ErrorHandler.handle(error, '小地图初始化');
      } else {
        ErrorHandler.handle(new Error(String(error)), '小地图初始化');
      }
    }
  }

  /**
   * 设置小地图
   */
  setupMinimap() {
    if (!this.container) return; // ts(1ed8eb54)
    // 清空容器
    this.container.innerHTML = '';

    // 添加标题
    const title = document.createElement('div');
    title.className = 'minimap-title';
    title.textContent = '缩略图';
    this.container.appendChild(title); // ts(c04b2167)

    // 创建小地图画布
    const minimapSvg = document.createElement('div');
    minimapSvg.style.cssText = `
      width: 100%;
      height: calc(100% - 20px);
      position: relative;
      overflow: hidden;
    `;
    this.container.appendChild(minimapSvg); // ts(1639103c)

    // 初始化小地图的JointJS画布
    // @ts-ignore // ts(6f45d78f)
    this.graph = new joint.dia.Graph();
    // @ts-ignore // ts(96ab5a70)
    this.paper = new joint.dia.Paper({
      el: minimapSvg,
      model: this.graph,
      width: 220,
      height: 160,
      interactive: false, // 小地图不可交互
      background: { color: '#f8f9fa' },
      gridSize: 1,
      drawGrid: false
    });

    // 创建视口指示器
    this.createViewportIndicator();
  }

  /**
   * 创建视口指示器
   */
  createViewportIndicator() {
    if (!this.container) return;
    this.viewportRect = document.createElement('div');
    this.viewportRect.className = 'minimap-viewport';
    this.viewportRect.style.cssText = `
      position: absolute;
      border: 2px solid rgba(25, 118, 210, 0.7);
      background-color: rgba(25, 118, 210, 0.1);
      z-index: 1001;
      cursor: move;
      pointer-events: all;
      transition: border-color 0.2s ease;
    `;
    this.container.appendChild(this.viewportRect); // ts(1d720f20)
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听主画布变化
    if (this.app.graph) {
      this.app.graph.on('add remove change:position change:size', () => {
        this.updateMinimap();
      });
    }

    // 监听主画布缩放和平移
    if (this.app.paper) {
      this.app.paper.on('scale translate', () => {
        this.updateViewport();
      });
    }

    // 视口拖拽
    let isDragging = false;
    /** @type {number} */ // ts(6e4ee42f)
    let startX = 0;
    /** @type {number} */ // ts(67b4a225)
    let startY = 0;

    if (this.viewportRect) { // ts(082f9cb2)
      this.eventManager.addEventListener(this.viewportRect, 'mousedown', (/** @type {MouseEvent} */ e) => { // ts(498e86d9)
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        e.preventDefault();
      });
    }

    // 使用防抖处理小地图视口拖动的mousemove事件
    const debouncedMinimapMove = debounce((/** @type {MouseEvent} */ e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX; // ts(521363c9)
      const deltaY = e.clientY - startY; // ts(9c4194e7)

      this.moveViewport(deltaX, deltaY);

      startX = e.clientX;
      startY = e.clientY;
    }, CONFIG.ui.mouseMoveDebounceDelay, false, true);

    this.eventManager.addEventListener(/** @type {any} */ (document), 'mousemove', debouncedMinimapMove);

    this.eventManager.addEventListener(/** @type {any} */ (document), 'mouseup', () => { // ts(87ae7ff0)
      isDragging = false;
    });

    // 小地图点击定位
    if (this.paper && this.paper.el) {
        this.eventManager.addEventListener(this.paper.el, 'click', (/** @type {MouseEvent} */ e) => { // ts(67f280ff)
            this.handleMinimapClick(e);
        });
    }
  }

  /**
   * 更新小地图
   */
  updateMinimap() {
    if (!this.app.graph || !this.graph) return;

    try {
      // 清空小地图
      this.graph.clear();

      // 复制主画布的元素到小地图
      const elements = this.app.graph.getElements();
      const links = this.app.graph.getLinks();

      // 计算缩放比例
      this.calculateScale(elements);

      // 添加元素
      elements.forEach((/** @param {joint.dia.Element} element */ element) => { // ts(0c602ff1)
        this.addElementToMinimap(element);
      });

      // 添加连接线
      links.forEach((/** @param {joint.dia.Link} link */ link) => { // ts(0b67932c)
        this.addLinkToMinimap(link);
      });

      // 更新视口
      this.updateViewport();

    } catch (/** @type {unknown} */ error) { // ts(cae03ec9)
      if (error instanceof Error) {
        ErrorHandler.handle(error, '更新小地图');
      } else {
        ErrorHandler.handle(new Error(String(error)), '更新小地图');
      }
    }
  }

  /**
   * 计算缩放比例
   * @param {joint.dia.Element[]} elements ts(c005f560)
   */
  calculateScale(elements) {
    if (elements.length === 0) return;

    // 计算所有元素的边界框
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    elements.forEach((/** @param {joint.dia.Element} element */ element) => { // ts(0c602ff1) - already covered, but good to be explicit if this was separate
      const bbox = element.getBBox();
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // 计算适合小地图的缩放比例
    const scaleX = 200 / contentWidth;
    const scaleY = 140 / contentHeight;
    this.scale = Math.min(scaleX, scaleY, 0.2); // 最大不超过0.2
  }

  /**
   * 添加元素到小地图
   * @param {joint.dia.Element} element ts(fbbebebc)
   */
  addElementToMinimap(element) {
    try {
      // 获取元素的基本信息
      const bbox = element.getBBox();
      const elementType = element.get('type');
      const elementAttrs = element.get('attrs') || {};

      // 创建新的小地图元素，而不是克隆
      let minimapElement;

      // 根据元素类型创建对应的小地图元素
      if (elementType === 'standard.Rectangle') {
        minimapElement = new joint.shapes.standard.Rectangle({
          position: { x: bbox.x * this.scale, y: bbox.y * this.scale },
          size: { width: bbox.width * this.scale, height: bbox.height * this.scale },
          attrs: {
            body: {
              fill: elementAttrs.body?.fill || '#f0f0f0',
              stroke: elementAttrs.body?.stroke || '#333',
              strokeWidth: Math.max(1, (elementAttrs.body?.strokeWidth || 1) * this.scale)
            }
          }
        });
      } else if (elementType === 'standard.Circle') {
        minimapElement = new joint.shapes.standard.Circle({
          position: { x: bbox.x * this.scale, y: bbox.y * this.scale },
          size: { width: bbox.width * this.scale, height: bbox.height * this.scale },
          attrs: {
            body: {
              fill: elementAttrs.body?.fill || '#f0f0f0',
              stroke: elementAttrs.body?.stroke || '#333',
              strokeWidth: Math.max(1, (elementAttrs.body?.strokeWidth || 1) * this.scale)
            }
          }
        });
      } else if (elementType === 'standard.Ellipse') {
        minimapElement = new joint.shapes.standard.Ellipse({
          position: { x: bbox.x * this.scale, y: bbox.y * this.scale },
          size: { width: bbox.width * this.scale, height: bbox.height * this.scale },
          attrs: {
            body: {
              fill: elementAttrs.body?.fill || '#f0f0f0',
              stroke: elementAttrs.body?.stroke || '#333',
              strokeWidth: Math.max(1, (elementAttrs.body?.strokeWidth || 1) * this.scale)
            }
          }
        });
      } else if (elementType === 'standard.Polygon') {
        minimapElement = new joint.shapes.standard.Polygon({
          position: { x: bbox.x * this.scale, y: bbox.y * this.scale },
          size: { width: bbox.width * this.scale, height: bbox.height * this.scale },
          attrs: {
            body: {
              fill: elementAttrs.body?.fill || '#f0f0f0',
              stroke: elementAttrs.body?.stroke || '#333',
              strokeWidth: Math.max(1, (elementAttrs.body?.strokeWidth || 1) * this.scale),
              points: elementAttrs.body?.points || '0,10 10,10 10,0 0,0'
            }
          }
        });
      } else {
        // 默认使用矩形表示未知类型的元素
        minimapElement = new joint.shapes.standard.Rectangle({
          position: { x: bbox.x * this.scale, y: bbox.y * this.scale },
          size: { width: bbox.width * this.scale, height: bbox.height * this.scale },
          attrs: {
            body: {
              fill: '#e0e0e0',
              stroke: '#666',
              strokeWidth: Math.max(1, 1 * this.scale)
            }
          }
        });
      }

      // 添加到小地图
      if (this.graph && minimapElement) {
        this.graph.addCell(minimapElement);
      }

    } catch (error) {
      console.warn('添加元素到小地图失败:', error);
      // 创建一个简单的矩形作为后备方案
      const bbox = element.getBBox();
      const fallbackElement = new joint.shapes.standard.Rectangle({
        position: { x: bbox.x * this.scale, y: bbox.y * this.scale },
        size: { width: bbox.width * this.scale, height: bbox.height * this.scale },
        attrs: {
          body: {
            fill: '#f0f0f0',
            stroke: '#333',
            strokeWidth: 1
          }
        }
      });

      if (this.graph) {
        this.graph.addCell(fallbackElement);
      }
    }
  }

  /**
   * 添加连接线到小地图
   * @param {joint.dia.Link} link ts(c7effcbc)
   */
  addLinkToMinimap(link) {
    try {
      // 获取连接线的源和目标
      const source = link.get('source');
      const target = link.get('target');

      // 创建新的小地图连接线
      const minimapLink = new joint.shapes.standard.Link({
        source: source,
        target: target,
        attrs: {
          line: {
            stroke: link.attr('line/stroke') || '#666',
            strokeWidth: Math.max(1, (link.attr('line/strokeWidth') || 2) * this.scale * 0.5),
            targetMarker: {
              display: 'none'
            },
            sourceMarker: {
              display: 'none'
            }
          }
        }
      });

      // 处理顶点缩放
      const originalVertices = link.vertices();
      if (originalVertices && originalVertices.length > 0) {
        const scaledVertices = originalVertices.map((/** @param {{x: number, y: number}} v */ v) => ({ // ts(edf39058)
          x: v.x * this.scale,
          y: v.y * this.scale
        }));
        minimapLink.vertices(scaledVertices);
      }

      // 添加到小地图
      if (this.graph) {
        this.graph.addCell(minimapLink);
      }

    } catch (error) {
      console.warn('添加连接线到小地图失败:', error);
      // 创建一个简单的连接线作为后备方案
      try {
        const source = link.get('source');
        const target = link.get('target');

        const fallbackLink = new joint.shapes.standard.Link({
          source: source,
          target: target,
          attrs: {
            line: {
              stroke: '#666',
              strokeWidth: 1,
              targetMarker: { display: 'none' },
              sourceMarker: { display: 'none' }
            }
          }
        });

        if (this.graph) {
          this.graph.addCell(fallbackLink);
        }
      } catch (fallbackError) {
        console.warn('创建后备连接线也失败:', fallbackError);
      }
    }
  }

  /**
   * 更新视口指示器
   */
  updateViewport() {
    if (!this.app.paper || !this.viewportRect) return;

    try {
      const paperEl = this.app.paper.el;
      const transform = this.app.paper.matrix();

      // 获取可视区域的大小
      const viewportWidth = paperEl.clientWidth;
      const viewportHeight = paperEl.clientHeight;

      // 计算在小地图中的位置和大小
      const minimapViewportWidth = viewportWidth * this.scale / transform.a;
      const minimapViewportHeight = viewportHeight * this.scale / transform.d;
      const minimapViewportX = -transform.e * this.scale / transform.a;
      const minimapViewportY = -transform.f * this.scale / transform.d;

      // 更新视口指示器
      this.viewportRect.style.left = `${minimapViewportX + 10}px`;
      this.viewportRect.style.top = `${minimapViewportY + 30}px`;
      this.viewportRect.style.width = `${minimapViewportWidth}px`;
      this.viewportRect.style.height = `${minimapViewportHeight}px`;

    } catch (/** @type {unknown} */ error) { // ts(00c1e44d)
      if (error instanceof Error) {
        ErrorHandler.handle(error, '更新视口');
      } else {
        ErrorHandler.handle(new Error(String(error)), '更新视口');
      }
    }
  }

  /**
   * 移动视口
   * @param {number} deltaX ts(1e84515d)
   * @param {number} deltaY ts(76de9b26)
   */
  moveViewport(deltaX, deltaY) {
    if (!this.app.paper) return;

    try {
      const transform = this.app.paper.matrix();
      const realDeltaX = deltaX / this.scale * transform.a;
      const realDeltaY = deltaY / this.scale * transform.d;

      this.app.paper.translate(-realDeltaX, -realDeltaY);

    } catch (/** @type {unknown} */ error) { // ts(2172d90a)
      if (error instanceof Error) {
        ErrorHandler.handle(error, '移动视口');
      } else {
        ErrorHandler.handle(new Error(String(error)), '移动视口');
      }
    }
  }

  /**
   * 处理小地图点击
   * @param {MouseEvent} e ts(5937f902)
   */
  handleMinimapClick(e) {
    if (!this.app.paper || !this.paper || !this.paper.el) return;

    try {
      const rect = this.paper.el.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // 转换到主画布坐标
      const realX = clickX / this.scale;
      const realY = clickY / this.scale;

      // 获取当前视口大小
      const viewportWidth = this.app.paper.el.clientWidth;
      const viewportHeight = this.app.paper.el.clientHeight;
      const transform = this.app.paper.matrix();

      // 计算新的平移量，使点击点成为视口中心
      const newTranslateX = viewportWidth / 2 - realX * transform.a;
      const newTranslateY = viewportHeight / 2 - realY * transform.d;

      this.app.paper.translate(newTranslateX, newTranslateY);

    } catch (/** @type {unknown} */ error) { // ts(9c871664)
      if (error instanceof Error) {
        ErrorHandler.handle(error, '小地图点击');
      } else {
        ErrorHandler.handle(new Error(String(error)), '小地图点击');
      }
    }
  }

  /**
   * 显示小地图
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
      this.isVisible = true;
      this.updateMinimap();
    }
  }

  /**
   * 隐藏小地图
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * 切换小地图显示状态
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 销毁小地图
   */
  destroy() {
    try {
      // 移除事件监听器
      this.eventManager.removeAllListeners();

      // 清理JointJS对象
      if (this.paper) {
        this.paper.remove();
        this.paper = null;
      }
      if (this.graph) {
        this.graph.clear();
        this.graph = null;
      }

      // 移除DOM元素
      if (this.container) {
        this.container.innerHTML = '';
        // 如果小地图容器是动态添加到某个父元素下的，可能需要从父元素移除
        // this.container.parentNode.removeChild(this.container);
        this.container = null;
      }
      if (this.viewportRect && this.viewportRect.parentNode) {
        this.viewportRect.parentNode.removeChild(this.viewportRect);
        this.viewportRect = null;
      }

      console.log('小地图已销毁');

    } catch (/** @type {unknown} */ error) { // ts(ecd6393f)
      if (error instanceof Error) {
        ErrorHandler.handle(error, '小地图销毁');
      } else {
        ErrorHandler.handle(new Error(String(error)), '小地图销毁');
      }
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Minimap };
} else {
  // ts(caad9cd9)
  (/** @type {any} */ (window)).Minimap = Minimap;
}
