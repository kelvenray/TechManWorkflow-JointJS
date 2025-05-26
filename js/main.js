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

    // 验证撤销/重做和复制/粘贴功能
    setTimeout(() => {
      console.log('🔍 验证撤销/重做和复制/粘贴功能...');
      checkUndoRedoCopyPasteStatus();

      // 测试键盘快捷键绑定
      console.log('🎹 键盘快捷键配置:', SHORTCUTS);

      // 提示用户如何测试
      console.log('📝 测试说明:');
      console.log('1. 从侧边栏拖拽节点到画布');
      console.log('2. 点击选中节点');
      console.log('3. 按 Ctrl+C 复制节点');
      console.log('4. 按 Ctrl+V 粘贴节点');
      console.log('5. 按 Ctrl+Z 撤销操作');
      console.log('6. 按 Ctrl+Y 重做操作');
      console.log('7. 或在控制台运行: WorkflowAPI.checkUndoRedoCopyPasteStatus()');

      // 应用初始化完成，添加内置测试功能
      setupBuiltInTesting();
    }, 1000);

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
    { name: 'Sidebar', check: () => typeof Sidebar !== 'undefined' },
    { name: 'CommandHistory', check: () => typeof CommandHistory !== 'undefined' },
    { name: 'ClipboardManager', check: () => typeof ClipboardManager !== 'undefined' },
    { name: 'BaseCommand', check: () => typeof BaseCommand !== 'undefined' }
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

    // 初始化撤销/重做工具栏
    const undoRedoToolbar = new UndoRedoToolbar(workflowApp);
    undoRedoToolbar.init();
    workflowApp.components.undoRedoToolbar = undoRedoToolbar;

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

  // 将字母键转换为大写以匹配SHORTCUTS配置
  if (keyName.length === 1 && keyName.match(/[a-z]/i)) {
    keyName = keyName.toUpperCase();
  }

  key.push(keyName);
  const shortcut = key.join('+');

  console.log('按键:', shortcut);

  // 查找对应的操作
  const action = SHORTCUTS[shortcut];
  if (action) {
    e.preventDefault();
    executeShortcutAction(action);
    console.log('执行快捷键操作:', action);
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
        undoOperation();
        break;
      case 'redo':
        redoOperation();
        break;
      case 'copy':
        copySelectedNodes();
        break;
      case 'paste':
        pasteNodes();
        break;
      case 'selectAll':
        selectAllElements();
        break;
      case 'deleteSelected':
        deleteSelectedElements();
        break;
      case 'clearSelection':
        workflowApp.clearSelection();
        workflowApp.clearMultiSelection();
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

    if (elements.length === 0) {
      console.log('画布上没有节点可选择');
      return;
    }

    // 清除现有选择
    workflowApp.clearSelection();

    // 启用多选模式选择所有节点
    workflowApp.enableMultiSelection(elements);

    console.log(`[MultiSelection] 全选了 ${elements.length} 个节点`);
  } catch (error) {
    ErrorHandler.handle(error, '全选元素');
  }
}

/**
 * 删除选中的元素
 */
function deleteSelectedElements() {
  try {
    // 优先处理多选删除
    if (workflowApp.state.multiSelection.enabled &&
        workflowApp.state.multiSelection.selectedElements.length > 0) {
      deleteMultiSelectedElements();
      return;
    }

    // 删除选中的连接线
    if (workflowApp.state.selectedLink) {
      // 使用命令历史系统删除连接线
      if (workflowApp.commandHistory && typeof DeleteLinkCommand !== 'undefined') {
        const deleteLinkCommand = new DeleteLinkCommand(workflowApp, workflowApp.state.selectedLink);
        workflowApp.commandHistory.executeCommand(deleteLinkCommand);
      } else {
        // 备用方案：直接删除
        workflowApp.state.selectedLink.remove();
      }
      workflowApp.state.selectedLink = null;
      console.log('删除选中的连接线');
    }

    // 删除选中的单个节点
    if (workflowApp.state.selectedElement && !workflowApp.state.selectedElement.isLink()) {
      const nodeManager = new NodeManager(workflowApp);
      nodeManager.deleteNode(workflowApp.state.selectedElement);
      workflowApp.state.selectedElement = null;
      console.log('删除选中的节点');
    }
    // 删除悬停的元素（作为备选）
    else if (workflowApp.state.hoveredElement && !workflowApp.state.hoveredElement.isLink()) {
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
 * 删除多选的元素
 */
function deleteMultiSelectedElements() {
  try {
    const elementsToDelete = [...workflowApp.state.multiSelection.selectedElements];
    console.log(`[MultiSelection] 批量删除 ${elementsToDelete.length} 个节点`);

    // 创建批量删除命令
    const nodeManager = new NodeManager(workflowApp);

    // 使用专门的多节点删除命令而不是批量命令
    if (elementsToDelete.length > 0 &&
        workflowApp.commandHistory &&
        typeof MultiNodeDeleteCommand !== 'undefined') {
      const multiDeleteCommand = new MultiNodeDeleteCommand(workflowApp, elementsToDelete);
      workflowApp.commandHistory.executeCommand(multiDeleteCommand);
    } else if (elementsToDelete.length > 0 &&
               workflowApp.commandHistory &&
               typeof BatchCommand !== 'undefined') {
      // 备用方案：使用批量命令，但确保所有节点状态在删除前都被正确捕获
      const commands = [];

      // 预先捕获所有节点的状态，避免在删除过程中状态丢失
      elementsToDelete.forEach(element => {
        if (typeof DeleteNodeCommand !== 'undefined') {
          const deleteCommand = new DeleteNodeCommand(workflowApp, element);
          commands.push(deleteCommand);
        }
      });

      if (commands.length > 0) {
        const batchCommand = new BatchCommand(workflowApp, commands, `删除 ${commands.length} 个节点`);
        workflowApp.commandHistory.executeCommand(batchCommand);
      }
    } else {
      // 如果命令系统不可用，直接删除
      elementsToDelete.forEach(element => {
        try {
          nodeManager.deleteNodeDirect(element);
        } catch (error) {
          console.error('删除节点失败:', element.id, error);
        }
      });
    }

    // 清除多选状态
    workflowApp.clearMultiSelection();

    console.log(`[MultiSelection] 批量删除完成`);

  } catch (error) {
    console.error('[MultiSelection] 批量删除失败:', error);
    ErrorHandler.handle(error, '批量删除节点');
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

/**
 * 撤销操作
 */
function undoOperation() {
  try {
    if (workflowApp && workflowApp.commandHistory) {
      const success = workflowApp.commandHistory.undo();
      if (success) {
        console.log('撤销操作成功');
      } else {
        console.log('没有可撤销的操作');
      }
    }
  } catch (error) {
    ErrorHandler.handle(error, '撤销操作');
  }
}

/**
 * 重做操作
 */
function redoOperation() {
  try {
    if (workflowApp && workflowApp.commandHistory) {
      const success = workflowApp.commandHistory.redo();
      if (success) {
        console.log('重做操作成功');
      } else {
        console.log('没有可重做的操作');
      }
    }
  } catch (error) {
    ErrorHandler.handle(error, '重做操作');
  }
}

/**
 * 复制选中的节点
 */
function copySelectedNodes() {
  try {
    if (workflowApp && workflowApp.clipboardManager) {
      const success = workflowApp.clipboardManager.copy();
      if (success) {
        console.log('节点复制成功');
      } else {
        console.log('没有可复制的节点');
      }
    }
  } catch (error) {
    ErrorHandler.handle(error, '复制节点');
  }
}

/**
 * 粘贴节点
 */
function pasteNodes() {
  try {
    if (workflowApp && workflowApp.clipboardManager) {
      const pastedNodes = workflowApp.clipboardManager.paste();
      if (pastedNodes && pastedNodes.length > 0) {
        console.log(`粘贴了 ${pastedNodes.length} 个节点`);
      } else {
        console.log('剪贴板为空或粘贴失败');
      }
    }
  } catch (error) {
    ErrorHandler.handle(error, '粘贴节点');
  }
}

/**
 * 检查撤销/重做和复制/粘贴功能状态
 */
function checkUndoRedoCopyPasteStatus() {
  if (!workflowApp) {
    console.log('❌ 应用未初始化');
    return null;
  }

  console.log('🔍 检查撤销/重做和复制/粘贴功能状态:');

  const status = {
    commandHistoryAvailable: false,
    commandHistory: null,
    clipboardAvailable: false,
    clipboard: null,
    currentState: {},
    commandClasses: {}
  };

  // 检查命令历史
  if (workflowApp.commandHistory) {
    const historyStatus = workflowApp.commandHistory.getStatus();
    status.commandHistoryAvailable = true;
    status.commandHistory = {
      canUndo: historyStatus.canUndo,
      canRedo: historyStatus.canRedo,
      undoCount: historyStatus.undoCount,
      redoCount: historyStatus.redoCount,
      isExecuting: historyStatus.isExecuting
    };
    console.log('✅ 命令历史管理器:', status.commandHistory);
  } else {
    console.log('❌ 命令历史管理器未初始化');
  }

  // 检查剪贴板
  if (workflowApp.clipboardManager) {
    const clipboardStatus = workflowApp.clipboardManager.getStatus();
    status.clipboardAvailable = true;
    status.clipboard = {
      isEmpty: clipboardStatus.isEmpty,
      nodeCount: clipboardStatus.nodeCount,
      pasteCount: clipboardStatus.pasteCount
    };
    console.log('✅ 剪贴板管理器:', status.clipboard);
  } else {
    console.log('❌ 剪贴板管理器未初始化');
  }

  // 检查选中状态
  status.currentState = {
    selectedElement: workflowApp.state.selectedElement ? workflowApp.state.selectedElement.id : '无',
    hoveredElement: workflowApp.state.hoveredElement ? workflowApp.state.hoveredElement.id : '无',
    multiSelectionEnabled: workflowApp.state.multiSelection.enabled,
    multiSelectionCount: workflowApp.state.multiSelection.selectedElements.length
  };
  console.log('📋 当前状态:', status.currentState);

  // 检查命令类是否可用
  status.commandClasses = {
    CreateNodeCommand: typeof CreateNodeCommand !== 'undefined',
    DeleteNodeCommand: typeof DeleteNodeCommand !== 'undefined',
    MultiNodeDeleteCommand: typeof MultiNodeDeleteCommand !== 'undefined',
    BatchCommand: typeof BatchCommand !== 'undefined',
    BaseCommand: typeof BaseCommand !== 'undefined'
  };
  console.log('🔧 命令类可用性:', status.commandClasses);

  return status;
}

/**
 * 设置内置测试功能
 */
function setupBuiltInTesting() {
  console.log('🧪 设置内置测试功能...');

  // 添加测试快捷键
  console.log('📋 可用的测试命令:');
  console.log('- WorkflowAPI.testBatchDeleteUndo() - 测试批量删除撤销功能');
  console.log('- WorkflowAPI.createTestNodes() - 创建测试节点');
  console.log('- WorkflowAPI.clearCanvas() - 清空画布');
  console.log('- WorkflowAPI.checkUndoRedoCopyPasteStatus() - 检查状态');
  console.log('');
  console.log('🎯 快速测试步骤:');
  console.log('1. 运行 WorkflowAPI.testBatchDeleteUndo() 进行自动化测试');
  console.log('2. 或手动测试：拖拽多个节点 → 框选或Ctrl+点击选择 → 按Delete键 → 按Ctrl+Z撤销');

  console.log('✅ 内置测试功能已准备就绪');
}

/**
 * 测试批量删除撤销功能
 */
function testBatchDeleteUndo() {
  return new Promise((resolve, reject) => {
    try {
      console.log('🧪 [BatchDeleteTest] 开始测试批量删除撤销功能');

      // 检查应用状态
      if (!workflowApp || !workflowApp.graph) {
        throw new Error('应用未初始化');
      }

      // 清空画布
      workflowApp.graph.clear();
      workflowApp.clearSelection();
      workflowApp.clearMultiSelection();

      // 创建测试节点
      const testNodes = createTestNodes();
      if (testNodes.length === 0) {
        throw new Error('创建测试节点失败');
      }

      console.log(`🧪 [BatchDeleteTest] 创建了 ${testNodes.length} 个测试节点`);

      // 等待一小段时间确保节点创建完成
      setTimeout(() => {
        try {
          // 选择所有测试节点
          selectTestNodes(testNodes);
          console.log(`🧪 [BatchDeleteTest] 已选择 ${testNodes.length} 个节点`);

          // 等待选择完成后删除
          setTimeout(() => {
            try {
              // 删除选中的节点
              deleteSelectedElements();
              console.log('🧪 [BatchDeleteTest] 已删除选中的节点');

              // 等待删除完成后测试撤销
              setTimeout(() => {
                try {
                  // 测试撤销
                  undoOperation();
                  console.log('🧪 [BatchDeleteTest] 已执行撤销操作');

                  // 检查撤销结果
                  setTimeout(() => {
                    const result = verifyUndoResult(testNodes);
                    console.log(`🧪 [BatchDeleteTest] ${result.message}`);

                    if (result.success) {
                      console.log('✅ 批量删除撤销测试通过！');
                      resolve(result);
                    } else {
                      console.error('❌ 批量删除撤销测试失败！');
                      reject(new Error(result.message));
                    }
                  }, 500);

                } catch (error) {
                  reject(new Error(`撤销操作失败: ${error.message}`));
                }
              }, 500);

            } catch (error) {
              reject(new Error(`删除操作失败: ${error.message}`));
            }
          }, 500);

        } catch (error) {
          reject(new Error(`选择节点失败: ${error.message}`));
        }
      }, 500);

    } catch (error) {
      console.error('🧪 [BatchDeleteTest] 测试失败:', error);
      reject(error);
    }
  });
}

/**
 * 创建测试节点
 */
function createTestNodes() {
  const testNodes = [];
  const nodeManager = new NodeManager(workflowApp);

  try {
    // 创建3个不同类型的测试节点
    const node1 = nodeManager.createProcessNode(200, 200);
    const node2 = nodeManager.createProcessNode(350, 200);
    const node3 = nodeManager.createProcessNode(500, 200);

    if (node1) testNodes.push(node1);
    if (node2) testNodes.push(node2);
    if (node3) testNodes.push(node3);

    console.log(`[AutoTest] 创建了 ${testNodes.length} 个测试节点`);
  } catch (error) {
    console.error('[AutoTest] 创建测试节点失败:', error);
  }

  return testNodes;
}

/**
 * 选择测试节点
 */
function selectTestNodes(testNodes) {
  try {
    // 清除现有选择
    workflowApp.clearSelection();
    workflowApp.clearMultiSelection();

    // 启用多选模式
    workflowApp.state.multiSelection.enabled = true;

    // 选择所有测试节点
    testNodes.forEach(node => {
      workflowApp.addToMultiSelection(node);
    });

    console.log(`[AutoTest] 已选择 ${testNodes.length} 个测试节点`);
  } catch (error) {
    console.error('[AutoTest] 选择测试节点失败:', error);
    throw error;
  }
}

/**
 * 验证撤销结果
 */
function verifyUndoResult(originalNodes) {
  try {
    let restoredCount = 0;

    originalNodes.forEach(originalNode => {
      const restoredNode = workflowApp.graph.getCell(originalNode.id);
      if (restoredNode) {
        restoredCount++;
      }
    });

    const success = restoredCount === originalNodes.length;
    const message = success
      ? `✅ 撤销测试成功！已恢复 ${restoredCount}/${originalNodes.length} 个节点`
      : `❌ 撤销测试失败！仅恢复 ${restoredCount}/${originalNodes.length} 个节点`;

    console.log(`[AutoTest] ${message}`);

    return { success, message };
  } catch (error) {
    console.error('[AutoTest] 验证撤销结果失败:', error);
    return {
      success: false,
      message: `验证撤销结果失败: ${error.message}`
    };
  }
}

/**
 * 清空画布
 */
function clearCanvas() {
  try {
    workflowApp.graph.clear();
    workflowApp.clearSelection();
    workflowApp.clearMultiSelection();

    // 清空命令历史
    if (workflowApp.commandHistory) {
      workflowApp.commandHistory.clear();
    }

    console.log('✅ 画布已清空');
    return true;
  } catch (error) {
    console.error('❌ 清空画布失败:', error);
    return false;
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
  togglePanMode,
  undoOperation,
  redoOperation,
  copySelectedNodes,
  pasteNodes,
  checkUndoRedoCopyPasteStatus,
  // 内置测试功能
  testBatchDeleteUndo,
  createTestNodes,
  clearCanvas,
  // 工具栏状态检查
  getUndoRedoToolbarStatus: () => {
    return workflowApp && workflowApp.components.undoRedoToolbar
      ? workflowApp.components.undoRedoToolbar.getStatus()
      : null;
  }
};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initWorkflowApp);

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  if (workflowApp) {
    workflowApp.destroy();
  }
});
