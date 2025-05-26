/**
 * 撤销/重做工具栏组件
 * 提供可视化的撤销和重做按钮，并管理其状态
 */
class UndoRedoToolbar {
  constructor(app) {
    this.app = app;
    this.undoBtn = null;
    this.redoBtn = null;
    this.container = null;
    
    console.log('[UndoRedoToolbar] 撤销/重做工具栏已初始化');
  }

  /**
   * 初始化工具栏
   */
  init() {
    try {
      this.container = document.getElementById('undo-redo-toolbar');
      this.undoBtn = document.getElementById('undo-btn');
      this.redoBtn = document.getElementById('redo-btn');

      if (!this.container || !this.undoBtn || !this.redoBtn) {
        console.error('[UndoRedoToolbar] 工具栏元素未找到');
        return;
      }

      this.bindEvents();
      this.updateButtonStates();

      console.log('[UndoRedoToolbar] 工具栏初始化完成');

    } catch (error) {
      console.error('[UndoRedoToolbar] 初始化失败:', error);
      ErrorHandler.handle(error, '撤销/重做工具栏初始化');
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    try {
      // 撤销按钮点击事件
      this.undoBtn.addEventListener('click', () => {
        this.handleUndo();
      });

      // 重做按钮点击事件
      this.redoBtn.addEventListener('click', () => {
        this.handleRedo();
      });

      // 监听命令历史变化以更新按钮状态
      if (this.app.commandHistory) {
        // 创建一个定时器来定期检查状态变化
        this.statusCheckInterval = setInterval(() => {
          this.updateButtonStates();
        }, 100); // 每100ms检查一次状态
      }

      console.log('[UndoRedoToolbar] 事件绑定完成');

    } catch (error) {
      console.error('[UndoRedoToolbar] 事件绑定失败:', error);
      ErrorHandler.handle(error, '撤销/重做工具栏事件绑定');
    }
  }

  /**
   * 处理撤销操作
   */
  handleUndo() {
    try {
      if (this.app && this.app.commandHistory) {
        const success = this.app.commandHistory.undo();
        if (success) {
          console.log('[UndoRedoToolbar] 撤销操作成功');
        } else {
          console.log('[UndoRedoToolbar] 没有可撤销的操作');
        }
        this.updateButtonStates();
      }
    } catch (error) {
      console.error('[UndoRedoToolbar] 撤销操作失败:', error);
      ErrorHandler.handle(error, '撤销操作');
    }
  }

  /**
   * 处理重做操作
   */
  handleRedo() {
    try {
      if (this.app && this.app.commandHistory) {
        const success = this.app.commandHistory.redo();
        if (success) {
          console.log('[UndoRedoToolbar] 重做操作成功');
        } else {
          console.log('[UndoRedoToolbar] 没有可重做的操作');
        }
        this.updateButtonStates();
      }
    } catch (error) {
      console.error('[UndoRedoToolbar] 重做操作失败:', error);
      ErrorHandler.handle(error, '重做操作');
    }
  }

  /**
   * 更新按钮状态
   */
  updateButtonStates() {
    try {
      if (!this.app || !this.app.commandHistory) {
        this.undoBtn.disabled = true;
        this.redoBtn.disabled = true;
        return;
      }

      const canUndo = this.app.commandHistory.canUndo();
      const canRedo = this.app.commandHistory.canRedo();

      this.undoBtn.disabled = !canUndo;
      this.redoBtn.disabled = !canRedo;

      // 更新按钮样式以反映状态
      this.undoBtn.style.opacity = canUndo ? '1' : '0.5';
      this.redoBtn.style.opacity = canRedo ? '1' : '0.5';

    } catch (error) {
      console.error('[UndoRedoToolbar] 更新按钮状态失败:', error);
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
   * 切换工具栏显示状态
   */
  toggle() {
    if (this.container) {
      const isVisible = this.container.style.display !== 'none';
      if (isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }
  }

  /**
   * 销毁工具栏
   */
  destroy() {
    try {
      // 清除定时器
      if (this.statusCheckInterval) {
        clearInterval(this.statusCheckInterval);
        this.statusCheckInterval = null;
      }

      // 移除事件监听器
      if (this.undoBtn) {
        this.undoBtn.removeEventListener('click', this.handleUndo);
      }
      if (this.redoBtn) {
        this.redoBtn.removeEventListener('click', this.handleRedo);
      }

      // 清除引用
      this.undoBtn = null;
      this.redoBtn = null;
      this.container = null;
      this.app = null;

      console.log('[UndoRedoToolbar] 工具栏已销毁');

    } catch (error) {
      console.error('[UndoRedoToolbar] 销毁失败:', error);
      ErrorHandler.handle(error, '撤销/重做工具栏销毁');
    }
  }

  /**
   * 获取工具栏状态
   */
  getStatus() {
    return {
      isVisible: this.container ? this.container.style.display !== 'none' : false,
      canUndo: this.app && this.app.commandHistory ? this.app.commandHistory.canUndo() : false,
      canRedo: this.app && this.app.commandHistory ? this.app.commandHistory.canRedo() : false,
      undoCount: this.app && this.app.commandHistory ? this.app.commandHistory.getStatus().undoCount : 0,
      redoCount: this.app && this.app.commandHistory ? this.app.commandHistory.getStatus().redoCount : 0
    };
  }
}

// 导出类到全局作用域
if (typeof window !== 'undefined') {
  window.UndoRedoToolbar = UndoRedoToolbar;
} else if (typeof global !== 'undefined') {
  global.UndoRedoToolbar = UndoRedoToolbar;
}
