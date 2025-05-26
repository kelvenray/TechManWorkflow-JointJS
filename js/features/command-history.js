/**
 * 命令历史管理器
 * 实现撤销/重做功能的核心类
 */
class CommandHistory {
  constructor(app) {
    this.app = app;
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = CONFIG.history.maxSize;
    this.isExecuting = false; // 防止在执行命令时记录历史

    console.log('[CommandHistory] 命令历史管理器已初始化');
  }

  /**
   * 执行命令并添加到历史记录
   */
  executeCommand(command) {
    try {
      this.isExecuting = true;

      // 执行命令
      const result = command.execute();

      // 添加到撤销栈
      this.undoStack.push(command);

      // 清空重做栈
      this.redoStack = [];

      // 限制历史记录大小
      if (this.undoStack.length > this.maxSize) {
        this.undoStack.shift();
      }

      console.log(`[CommandHistory] 命令已执行: ${command.constructor.name}`);
      console.log(`[CommandHistory] 撤销栈大小: ${this.undoStack.length}, 重做栈大小: ${this.redoStack.length}`);

      return result;

    } catch (error) {
      console.error('[CommandHistory] 命令执行失败:', error);
      ErrorHandler.handle(error, '命令执行');
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 撤销操作
   */
  undo() {
    if (!this.canUndo()) {
      console.log('[CommandHistory] 没有可撤销的操作');
      return false;
    }

    try {
      this.isExecuting = true;

      const command = this.undoStack.pop();
      command.undo();
      this.redoStack.push(command);

      console.log(`[CommandHistory] 已撤销: ${command.constructor.name}`);
      console.log(`[CommandHistory] 撤销栈大小: ${this.undoStack.length}, 重做栈大小: ${this.redoStack.length}`);

      return true;

    } catch (error) {
      console.error('[CommandHistory] 撤销操作失败:', error);
      ErrorHandler.handle(error, '撤销操作');
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 重做操作
   */
  redo() {
    if (!this.canRedo()) {
      console.log('[CommandHistory] 没有可重做的操作');
      return false;
    }

    try {
      this.isExecuting = true;

      const command = this.redoStack.pop();
      command.execute();
      this.undoStack.push(command);

      console.log(`[CommandHistory] 已重做: ${command.constructor.name}`);
      console.log(`[CommandHistory] 撤销栈大小: ${this.undoStack.length}, 重做栈大小: ${this.redoStack.length}`);

      return true;

    } catch (error) {
      console.error('[CommandHistory] 重做操作失败:', error);
      ErrorHandler.handle(error, '重做操作');
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 检查是否可以撤销
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * 检查是否正在执行命令
   */
  isExecutingCommand() {
    return this.isExecuting;
  }

  /**
   * 清空历史记录
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    console.log('[CommandHistory] 历史记录已清空');
  }

  /**
   * 获取历史记录状态
   */
  getStatus() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      isExecuting: this.isExecuting
    };
  }

  /**
   * 获取最后执行的命令
   */
  getLastCommand() {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null;
  }

  /**
   * 获取下一个重做命令
   */
  getNextRedoCommand() {
    return this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1] : null;
  }
}

/**
 * 基础命令类
 * 所有具体命令都应该继承此类
 */
class BaseCommand {
  constructor(app, description = '') {
    this.app = app;
    this.description = description;
    this.timestamp = Date.now();
  }

  /**
   * 执行命令 - 子类必须实现
   */
  execute() {
    throw new Error('子类必须实现 execute 方法');
  }

  /**
   * 撤销命令 - 子类必须实现
   */
  undo() {
    throw new Error('子类必须实现 undo 方法');
  }

  /**
   * 获取命令描述
   */
  getDescription() {
    return this.description || this.constructor.name;
  }

  /**
   * 获取命令时间戳
   */
  getTimestamp() {
    return this.timestamp;
  }
}

// 导出类到全局作用域
if (typeof window !== 'undefined') {
  window.CommandHistory = CommandHistory;
  window.BaseCommand = BaseCommand;
} else if (typeof global !== 'undefined') {
  global.CommandHistory = CommandHistory;
  global.BaseCommand = BaseCommand;
}
