/**
 * 缩放工具栏组件
 * 提供画布缩放控制和小地图切换功能
 */

class ZoomToolbar {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.eventManager = new EventManager();
  }

  /**
   * 初始化缩放工具栏
   */
  init() {
    try {
      this.container = document.getElementById('zoom-toolbar');
      if (!this.container) {
        console.warn('缩放工具栏容器未找到');
        return;
      }

      this.setupEventListeners();
      this.updateDisplay();
      
      console.log('缩放工具栏初始化完成');
      
    } catch (error) {
      ErrorHandler.handle(error, '缩放工具栏初始化');
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 缩小按钮
    const zoomOutBtn = this.container.querySelector('#zoom-out');
    if (zoomOutBtn) {
      this.eventManager.addEventListener(zoomOutBtn, 'click', () => {
        this.zoomOut();
      });
    }

    // 放大按钮
    const zoomInBtn = this.container.querySelector('#zoom-in');
    if (zoomInBtn) {
      this.eventManager.addEventListener(zoomInBtn, 'click', () => {
        this.zoomIn();
      });
    }

    // 缩放百分比（重置缩放）
    const zoomPercentage = this.container.querySelector('#zoom-percentage');
    if (zoomPercentage) {
      this.eventManager.addEventListener(zoomPercentage, 'click', () => {
        this.resetZoom();
      });
    }

    // 小地图切换按钮
    const toggleMinimapBtn = this.container.querySelector('#toggle-minimap');
    if (toggleMinimapBtn) {
      this.eventManager.addEventListener(toggleMinimapBtn, 'click', () => {
        this.toggleMinimap();
      });
    }

    // 画布滚轮缩放
    if (this.app.paper && this.app.paper.el) {
      this.eventManager.addEventListener(this.app.paper.el, 'wheel', (e) => {
        this.handleWheelZoom(e);
      });
    }
  }

  /**
   * 缩小
   */
  zoomOut() {
    try {
      const currentScale = this.app.state.zoomLevel || 1;
      const newScale = Math.max(
        CONFIG.canvas.minScale || 0.1,
        currentScale - (CONFIG.canvas.scaleStep || 0.1)
      );
      
      if (newScale !== currentScale) {
        this.setZoom(newScale);
        console.log(`缩小到: ${Math.round(newScale * 100)}%`);
      }
      
    } catch (error) {
      ErrorHandler.handle(error, '缩小操作');
    }
  }

  /**
   * 放大
   */
  zoomIn() {
    try {
      const currentScale = this.app.state.zoomLevel || 1;
      const newScale = Math.min(
        CONFIG.canvas.maxScale || 3,
        currentScale + (CONFIG.canvas.scaleStep || 0.1)
      );
      
      if (newScale !== currentScale) {
        this.setZoom(newScale);
        console.log(`放大到: ${Math.round(newScale * 100)}%`);
      }
      
    } catch (error) {
      ErrorHandler.handle(error, '放大操作');
    }
  }

  /**
   * 重置缩放
   */
  resetZoom() {
    try {
      this.setZoom(1);
      console.log('缩放已重置到100%');
    } catch (error) {
      ErrorHandler.handle(error, '重置缩放');
    }
  }

  /**
   * 设置缩放级别
   */
  setZoom(scale) {
    try {
      if (!this.app.paper) {
        console.warn('画布未初始化');
        return;
      }

      // 设置画布缩放
      this.app.paper.scale(scale, scale);
      
      // 更新应用状态
      this.app.state.zoomLevel = scale;
      
      // 更新显示
      this.updateDisplay();
      
    } catch (error) {
      ErrorHandler.handle(error, '设置缩放');
    }
  }

  /**
   * 处理鼠标滚轮缩放
   */
  handleWheelZoom(e) {
    // 只有按住Ctrl/Cmd时才缩放
    if (!e.ctrlKey && !e.metaKey) return;
    
    e.preventDefault();
    
    try {
      const delta = e.deltaY > 0 ? -(CONFIG.canvas.scaleStep || 0.1) : (CONFIG.canvas.scaleStep || 0.1);
      const currentScale = this.app.state.zoomLevel || 1;
      const newScale = Math.max(
        CONFIG.canvas.minScale || 0.1,
        Math.min(CONFIG.canvas.maxScale || 3, currentScale + delta)
      );
      
      if (newScale !== currentScale) {
        this.setZoom(newScale);
      }
      
    } catch (error) {
      ErrorHandler.handle(error, '滚轮缩放');
    }
  }

  /**
   * 切换小地图
   */
  toggleMinimap() {
    try {
      const minimapContainer = document.getElementById('minimap-container');
      if (minimapContainer) {
        const isVisible = minimapContainer.style.display !== 'none';
        minimapContainer.style.display = isVisible ? 'none' : 'block';
        console.log(`小地图已${isVisible ? '隐藏' : '显示'}`);
      }
      
      // 如果有minimap组件实例，也调用其切换方法
      if (this.app.components.minimap && typeof this.app.components.minimap.toggle === 'function') {
        this.app.components.minimap.toggle();
      }
    } catch (error) {
      ErrorHandler.handle(error, '切换小地图');
    }
  }

  /**
   * 更新显示
   */
  updateDisplay() {
    try {
      const zoomPercentage = this.container?.querySelector('#zoom-percentage');
      if (zoomPercentage) {
        const percentage = Math.round((this.app.state.zoomLevel || 1) * 100);
        zoomPercentage.textContent = percentage + '%';
      }
      
      this.updateButtonStates();
      
    } catch (error) {
      ErrorHandler.handle(error, '更新缩放显示');
    }
  }

  /**
   * 更新按钮状态
   */
  updateButtonStates() {
    try {
      const currentScale = this.app.state.zoomLevel || 1;
      const minScale = CONFIG.canvas.minScale || 0.1;
      const maxScale = CONFIG.canvas.maxScale || 3;
      
      // 更新缩小按钮
      const zoomOutBtn = this.container?.querySelector('#zoom-out');
      if (zoomOutBtn) {
        if (currentScale <= minScale) {
          zoomOutBtn.style.opacity = '0.5';
          zoomOutBtn.style.cursor = 'not-allowed';
          zoomOutBtn.disabled = true;
        } else {
          zoomOutBtn.style.opacity = '1';
          zoomOutBtn.style.cursor = 'pointer';
          zoomOutBtn.disabled = false;
        }
      }
      
      // 更新放大按钮
      const zoomInBtn = this.container?.querySelector('#zoom-in');
      if (zoomInBtn) {
        if (currentScale >= maxScale) {
          zoomInBtn.style.opacity = '0.5';
          zoomInBtn.style.cursor = 'not-allowed';
          zoomInBtn.disabled = true;
        } else {
          zoomInBtn.style.opacity = '1';
          zoomInBtn.style.cursor = 'pointer';
          zoomInBtn.disabled = false;
        }
      }
      
    } catch (error) {
      ErrorHandler.handle(error, '更新按钮状态');
    }
  }

  /**
   * 显示工具栏
   */
  show() {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  /**
   * 隐藏工具栏
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * 销毁工具栏
   */
  destroy() {
    try {
      // 清理事件监听器
      this.eventManager.removeAllListeners();
      
      // 清理引用
      this.container = null;
      
      console.log('缩放工具栏已销毁');
      
    } catch (error) {
      ErrorHandler.handle(error, '缩放工具栏销毁');
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ZoomToolbar };
} else {
  window.ZoomToolbar = ZoomToolbar;
}
