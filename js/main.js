/**
 * 工作流设计器主入口文件
 * 整合所有模块并初始化应用
 */

// 全局应用实例
let workflowApp = null;

/**
 * 应用入口函数
 */
async function initWorkflowApp() {
  try {
    console.log('开始初始化工作流应用...');

    // 检查依赖
    checkDependencies();

    // 创建应用实例
    workflowApp = new WorkflowApp();

    // 初始化应用
    await workflowApp.init();

    // 初始化组件
    await initComponents();

    // 初始化事件处理
    initEventHandlers();

    // 应用启动完成
    console.log('工作流应用启动完成！');

  } catch (error) {
    ErrorHandler.handle(error, '应用初始化');
    console.error('应用启动失败:', error);
  }
}

/**
 * 检查必要的依赖
 */
function checkDependencies() {
  const dependencies = [
    { name: 'JointJS', check: () => typeof joint !== 'undefined' },
    { name: 'CONFIG', check: () => typeof CONFIG !== 'undefined' },
    { name: 'ErrorHandler', check: () => typeof ErrorHandler !== 'undefined' },
    { name: 'EventManager', check: () => typeof EventManager !== 'undefined' },
    { name: 'WorkflowApp', check: () => typeof WorkflowApp !== 'undefined' },
    { name: 'NodeManager', check: () => typeof NodeManager !== 'undefined' },
    { name: 'Sidebar', check: () => typeof Sidebar !== 'undefined' }
  ];

  const missing = dependencies.filter(dep => !dep.check());
  
  if (missing.length > 0) {
    const missingNames = missing.map(dep => dep.name).join(', ');
    throw new Error(`缺少必要的依赖: ${missingNames}`);
  }

  console.log('依赖检查通过');
}

/**
 * 初始化组件
 */
async function initComponents() {
  try {
    // 初始化侧边栏
    const sidebar = new Sidebar(workflowApp);
    sidebar.init();
    workflowApp.components.sidebar = sidebar;

    // 初始化小地图
    const minimap = new Minimap(workflowApp);
    minimap.init();
    workflowApp.components.minimap = minimap;

    // 初始化缩放工具栏
    const zoomToolbar = new ZoomToolbar(workflowApp);
    zoomToolbar.init();
    workflowApp.components.zoomToolbar = zoomToolbar;

    // 初始化属性面板
    const propertyPanel = new PropertyPanel(workflowApp);
    propertyPanel.init();
    workflowApp.components.propertyPanel = propertyPanel;

    console.log('组件初始化完成');

  } catch (error) {
    ErrorHandler.handle(error, '组件初始化');
  }
}

/**
 * 初始化事件处理
 */
function initEventHandlers() {
  try {
    // 窗口大小调整事件
    const resizeHandler = debounce(() => {
      if (workflowApp && workflowApp.paper) {
        const newWidth = window.innerWidth - CONFIG.canvas.sidebarWidth;
        const newHeight = window.innerHeight;
        workflowApp.paper.setDimensions(newWidth, newHeight);
      }
    }, CONFIG.ui.debounceDelay);

    window.addEventListener('resize', resizeHandler);

    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // 防止页面滚动
    document.addEventListener('wheel', (e) => {
      if (e.target.closest('#paper-container')) {
        e.preventDefault();
      }
    }, { passive: false });

    // 右键菜单禁用（可选）
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('#paper-container')) {
        e.preventDefault();
      }
    });

    console.log('事件处理器初始化完成');

  } catch (error) {
    ErrorHandler.handle(error, '事件处理器初始化');
  }
}

/**
 * 处理键盘快捷键
 */
function handleKeyboardShortcuts(e) {
  if (!workflowApp) return;

  // 构建快捷键字符串
  const key = [];
  if (e.ctrlKey || e.metaKey) key.push('Ctrl');
  if (e.shiftKey) key.push('Shift');
  if (e.altKey) key.push('Alt');
  
  // 特殊键处理
  let keyName = e.key;
  if (keyName === ' ') keyName = 'Space';
  if (keyName === '+') keyName = '+';
  if (keyName === '=') keyName = '=';
  if (keyName === '-') keyName = '-';
  
  key.push(keyName);
  const shortcut = key.join('+');

  console.log('按键:', shortcut);

  // 查找对应的操作
  const action = SHORTCUTS[shortcut];
  if (action) {
    e.preventDefault();
    executeShortcutAction(action);
  }
}

/**
 * 执行快捷键动作
 */
function executeShortcutAction(action) {
  if (!workflowApp) return;

  try {
    switch (action) {
      case 'save':
        saveWorkflow();
        break;
      case 'undo':
        // TODO: 实现撤销功能
        console.log('撤销操作');
        break;
      case 'redo':
        // TODO: 实现重做功能
        console.log('重做操作');
        break;
      case 'selectAll':
        selectAllElements();
        break;
      case 'deleteSelected':
        deleteSelectedElements();
        break;
      case 'clearSelection':
        workflowApp.clearSelection();
        break;
      case 'zoomIn':
        zoomCanvas(0.1);
        break;
      case 'zoomOut':
        zoomCanvas(-0.1);
        break;
      case 'resetZoom':
        resetZoom();
        break;
      case 'toggleMinimap':
        // TODO: 实现缩略图切换
        console.log('切换缩略图');
        break;
      case 'panMode':
        togglePanMode();
        break;
      default:
        console.log('未知的快捷键操作:', action);
    }
  } catch (error) {
    ErrorHandler.handle(error, `快捷键操作: ${action}`);
  }
}

/**
 * 保存工作流
 */
function saveWorkflow() {
  try {
    const data = workflowApp.graph.toJSON();
    const jsonString = JSON.stringify(data, null, 2);
    
    // 创建下载链接
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('工作流已保存');
    
  } catch (error) {
    ErrorHandler.handle(error, '工作流保存');
  }
}

/**
 * 选择所有元素
 */
function selectAllElements() {
  try {
    const elements = workflowApp.graph.getElements();
    console.log(`选择了 ${elements.length} 个元素`);
    // TODO: 实现多选功能
  } catch (error) {
    ErrorHandler.handle(error, '全选元素');
  }
}

/**
 * 删除选中的元素
 */
function deleteSelectedElements() {
  try {
    // 删除选中的连接线
    if (workflowApp.state.selectedLink) {
      workflowApp.state.selectedLink.remove();
      workflowApp.state.selectedLink = null;
      console.log('删除选中的连接线');
    }

    // 删除悬停的元素
    if (workflowApp.state.hoveredElement && !workflowApp.state.hoveredElement.isLink()) {
      const nodeManager = new NodeManager(workflowApp);
      nodeManager.deleteNode(workflowApp.state.hoveredElement);
      workflowApp.state.hoveredElement = null;
      console.log('删除悬停的节点');
    }

  } catch (error) {
    ErrorHandler.handle(error, '删除选中元素');
  }
}

/**
 * 缩放画布
 */
function zoomCanvas(delta) {
  try {
    const currentScale = workflowApp.state.zoomLevel;
    const newScale = Math.max(
      CONFIG.canvas.minScale,
      Math.min(CONFIG.canvas.maxScale, currentScale + delta)
    );
    
    if (newScale !== currentScale) {
      workflowApp.paper.scale(newScale);
      workflowApp.state.zoomLevel = newScale;
      console.log(`缩放级别: ${(newScale * 100).toFixed(0)}%`);
    }
    
  } catch (error) {
    ErrorHandler.handle(error, '画布缩放');
  }
}

/**
 * 重置缩放
 */
function resetZoom() {
  try {
    workflowApp.paper.scale(1);
    workflowApp.state.zoomLevel = 1;
    console.log('缩放已重置');
  } catch (error) {
    ErrorHandler.handle(error, '重置缩放');
  }
}

/**
 * 切换平移模式
 */
function togglePanMode() {
  try {
    workflowApp.state.isPanningMode = !workflowApp.state.isPanningMode;
    document.body.style.cursor = workflowApp.state.isPanningMode ? 'grab' : 'default';
    console.log('平移模式:', workflowApp.state.isPanningMode ? '开启' : '关闭');
  } catch (error) {
    ErrorHandler.handle(error, '切换平移模式');
  }
}

/**
 * 加载工作流文件
 */
function loadWorkflow(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        workflowApp.graph.fromJSON(data);
        console.log('工作流加载成功');
        resolve(data);
      } catch (error) {
        ErrorHandler.handle(error, '工作流加载');
        reject(error);
      }
    };
    reader.onerror = () => {
      const error = new Error('文件读取失败');
      ErrorHandler.handle(error, '文件读取');
      reject(error);
    };
    reader.readAsText(file);
  });
}

/**
 * 验证工作流
 */
function validateWorkflow() {
  try {
    const result = ValidationUtils.validateWorkflow(workflowApp.graph);
    
    console.log('工作流验证结果:', result);
    
    if (result.errors.length > 0) {
      console.error('工作流验证错误:', result.errors);
    }
    
    if (result.warnings.length > 0) {
      console.warn('工作流验证警告:', result.warnings);
    }
    
    return result;
    
  } catch (error) {
    ErrorHandler.handle(error, '工作流验证');
    return { isValid: false, errors: [error.message], warnings: [] };
  }
}

/**
 * 获取工作流统计信息
 */
function getWorkflowStats() {
  try {
    const elements = workflowApp.graph.getElements();
    const links = workflowApp.graph.getLinks();
    
    const stats = {
      totalNodes: elements.length,
      totalLinks: links.length,
      nodeTypes: {},
      isolatedNodes: 0,
      startNodes: 0,
      endNodes: 0
    };

    elements.forEach(element => {
      const type = element.get('type');
      const label = element.attr('label/text');
      
      stats.nodeTypes[type] = (stats.nodeTypes[type] || 0) + 1;
      
      if (type === 'standard.Circle') {
        if (label === '开始') stats.startNodes++;
        if (label === '结束') stats.endNodes++;
      }
      
      const connectedLinks = workflowApp.graph.getConnectedLinks(element);
      if (connectedLinks.length === 0) {
        stats.isolatedNodes++;
      }
    });

    return stats;
    
  } catch (error) {
    ErrorHandler.handle(error, '获取工作流统计');
    return null;
  }
}

/**
 * 清空工作流
 */
function clearWorkflow() {
  try {
    if (confirm('确定要清空当前工作流吗？此操作不可撤销。')) {
      workflowApp.graph.clear();
      workflowApp.clearSelection();
      console.log('工作流已清空');
    }
  } catch (error) {
    ErrorHandler.handle(error, '清空工作流');
  }
}

/**
 * 导出工作流为图片
 */
function exportWorkflowImage() {
  try {
    // 这里可以实现将SVG导出为PNG/JPG等格式
    console.log('导出工作流图片功能待实现');
  } catch (error) {
    ErrorHandler.handle(error, '导出工作流图片');
  }
}

// 暴露全局API
window.WorkflowAPI = {
  saveWorkflow,
  loadWorkflow,
  validateWorkflow,
  getWorkflowStats,
  clearWorkflow,
  exportWorkflowImage,
  zoomCanvas,
  resetZoom,
  togglePanMode
};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initWorkflowApp);

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  if (workflowApp) {
    workflowApp.destroy();
  }
});
