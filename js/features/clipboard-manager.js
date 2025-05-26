/**
 * 剪贴板管理器
 * 实现节点的复制和粘贴功能
 */
class ClipboardManager {
  constructor(app) {
    this.app = app;
    this.clipboard = [];
    this.maxCopyCount = CONFIG.clipboard.maxCopyCount;
    this.pasteOffset = CONFIG.clipboard.pasteOffset;
    this.pasteCount = 0; // 连续粘贴计数，用于递增偏移

    console.log('[ClipboardManager] 剪贴板管理器已初始化');
  }

  /**
   * 复制选中的节点
   */
  copy() {
    try {
      const selectedNodes = this.getSelectedNodes();

      if (selectedNodes.length === 0) {
        console.log('[ClipboardManager] 没有选中的节点可复制');
        return false;
      }

      // 检查是否包含不可复制的节点
      const invalidNodes = selectedNodes.filter(node => this.isNodeCopyable(node) === false);
      if (invalidNodes.length > 0) {
        console.warn('[ClipboardManager] 包含不可复制的节点（开始/结束节点）');
        // 过滤掉不可复制的节点
        const validNodes = selectedNodes.filter(node => this.isNodeCopyable(node));
        if (validNodes.length === 0) {
          console.log('[ClipboardManager] 没有可复制的节点');
          return false;
        }
        selectedNodes.splice(0, selectedNodes.length, ...validNodes);
      }

      // 检查复制数量限制
      if (selectedNodes.length > this.maxCopyCount) {
        console.warn(`[ClipboardManager] 复制节点数量超过限制 (${this.maxCopyCount})`);
        return false;
      }

      // 序列化节点数据
      this.clipboard = selectedNodes.map(node => this.serializeNode(node));
      this.pasteCount = 0; // 重置粘贴计数

      console.log(`[ClipboardManager] 已复制 ${this.clipboard.length} 个节点`);
      return true;

    } catch (error) {
      console.error('[ClipboardManager] 复制失败:', error);
      ErrorHandler.handle(error, '复制节点');
      return false;
    }
  }

  /**
   * 粘贴节点
   */
  paste() {
    try {
      if (this.clipboard.length === 0) {
        console.log('[ClipboardManager] 剪贴板为空，无法粘贴');
        return false;
      }

      // 计算粘贴偏移量（连续粘贴时递增偏移）
      const offsetX = this.pasteOffset.x + (this.pasteCount * this.pasteOffset.x);
      const offsetY = this.pasteOffset.y + (this.pasteCount * this.pasteOffset.y);

      const pastedNodes = [];
      const nodeIdMapping = new Map(); // 旧ID到新ID的映射

      // 创建批量命令
      const commands = [];

      // 第一步：创建所有节点
      for (const nodeData of this.clipboard) {
        const newNode = this.recreateNode(nodeData, offsetX, offsetY);
        if (newNode) {
          pastedNodes.push(newNode);
          nodeIdMapping.set(nodeData.id, newNode.id);

          // 添加创建命令到批量操作（如果命令系统可用）
          if (typeof CreateNodeCommand !== 'undefined') {
            const createCommand = new CreateNodeCommand(
              this.app,
              this.getNodeTypeFromData(nodeData),
              newNode.position().x,
              newNode.position().y,
              { skipHistory: true } // 跳过单独的历史记录
            );
            createCommand.nodeId = newNode.id;
            createCommand.nodeData = this.serializeNode(newNode);
            commands.push(createCommand);
          }
        }
      }

      // 第二步：处理容器嵌入关系
      this.restoreEmbeddingRelationships(nodeIdMapping);

      // 执行批量命令
      if (commands.length > 0 &&
          this.app.commandHistory &&
          typeof BatchCommand !== 'undefined') {
        const batchCommand = new BatchCommand(this.app, commands, `粘贴 ${commands.length} 个节点`);
        this.app.commandHistory.executeCommand(batchCommand);
      }

      this.pasteCount++;
      console.log(`[ClipboardManager] 已粘贴 ${pastedNodes.length} 个节点`);

      // 选中粘贴的节点（如果只有一个）
      if (pastedNodes.length === 1) {
        this.app.state.selectedElement = pastedNodes[0];
      }

      return pastedNodes;

    } catch (error) {
      console.error('[ClipboardManager] 粘贴失败:', error);
      ErrorHandler.handle(error, '粘贴节点');
      return false;
    }
  }

  /**
   * 检查节点是否可复制
   */
  isNodeCopyable(node) {
    if (!node || !node.isElement()) return false;

    // 检查是否是开始或结束节点
    const nodeType = node.get('type');
    const label = node.attr('label/text');

    if (nodeType === 'standard.Circle') {
      if (label === '开始' || label === '结束') {
        return false; // 开始和结束节点不可复制
      }
    }

    return true;
  }

  /**
   * 获取当前选中的节点
   */
  getSelectedNodes() {
    const selectedNodes = [];

    // 获取当前选中的元素
    if (this.app.state.selectedElement && this.app.state.selectedElement.isElement()) {
      selectedNodes.push(this.app.state.selectedElement);
    }

    // 获取悬停的元素（如果没有选中元素）
    if (selectedNodes.length === 0 &&
        this.app.state.hoveredElement &&
        this.app.state.hoveredElement.isElement()) {
      selectedNodes.push(this.app.state.hoveredElement);
    }

    return selectedNodes;
  }

  /**
   * 序列化节点数据
   */
  serializeNode(node) {
    const nodeData = {
      id: node.id,
      type: node.get('type'),
      position: node.position(),
      size: node.size(),
      attributes: JSON.parse(JSON.stringify(node.attributes)),
      properties: node.prop('properties'),
      isContainer: !!node.isContainer,
      isSwitch: !!node.isSwitch,
      ports: node.getPorts(),
      embeddedCells: []
    };

    // 如果是容器节点，记录嵌入的节点
    if (node.isContainer) {
      const embeddedCells = node.getEmbeddedCells();
      nodeData.embeddedCells = embeddedCells
        .filter(cell => cell.isElement())
        .map(cell => cell.id);
    }

    return nodeData;
  }

  /**
   * 重新创建节点
   */
  recreateNode(nodeData, offsetX, offsetY) {
    try {
      const nodeManager = new NodeManager(this.app);
      const newPosition = {
        x: nodeData.position.x + offsetX,
        y: nodeData.position.y + offsetY
      };

      let newNode;

      // 根据节点类型创建新节点
      switch (nodeData.type) {
        case 'standard.Rectangle':
          const label = nodeData.attributes.label ? nodeData.attributes.label.text : '';
          if (label === 'Group Setting') {
            newNode = nodeManager.createGroupSettingNode(newPosition.x, newPosition.y);
          } else if (nodeData.isContainer) {
            newNode = nodeManager.createContainerNode(newPosition.x, newPosition.y);
          } else {
            newNode = nodeManager.createProcessNode(newPosition.x, newPosition.y);
          }
          break;

        case 'standard.Polygon':
          if (nodeData.isSwitch) {
            newNode = nodeManager.createSwitchNode(newPosition.x, newPosition.y);
          } else {
            newNode = nodeManager.createDecisionNode(newPosition.x, newPosition.y);
          }
          break;

        default:
          console.warn(`[ClipboardManager] 不支持复制的节点类型: ${nodeData.type}`);
          return null;
      }

      if (newNode) {
        // 恢复节点属性
        if (nodeData.properties) {
          newNode.prop('properties', JSON.parse(JSON.stringify(nodeData.properties)));
        }

        // 恢复节点大小
        newNode.resize(nodeData.size.width, nodeData.size.height);

        // 恢复特殊属性
        if (nodeData.isContainer) {
          newNode.isContainer = true;
          newNode.isResizable = true;
        }
        if (nodeData.isSwitch) {
          newNode.isSwitch = true;
          // 更新Switch节点的端口
          if (nodeData.properties && nodeData.properties.cases) {
            nodeManager.updateSwitchPorts(newNode, nodeData.properties.cases);
          }
        }

        console.log(`[ClipboardManager] 节点已重新创建: ${newNode.id} (原ID: ${nodeData.id})`);
      }

      return newNode;

    } catch (error) {
      console.error('[ClipboardManager] 重新创建节点失败:', error);
      return null;
    }
  }

  /**
   * 恢复嵌入关系
   */
  restoreEmbeddingRelationships(nodeIdMapping) {
    try {
      for (const nodeData of this.clipboard) {
        if (nodeData.isContainer && nodeData.embeddedCells.length > 0) {
          const newContainerId = nodeIdMapping.get(nodeData.id);
          const newContainer = this.app.graph.getCell(newContainerId);

          if (newContainer) {
            nodeData.embeddedCells.forEach(oldEmbeddedId => {
              const newEmbeddedId = nodeIdMapping.get(oldEmbeddedId);
              const newEmbeddedNode = this.app.graph.getCell(newEmbeddedId);

              if (newEmbeddedNode) {
                newContainer.embed(newEmbeddedNode);
                console.log(`[ClipboardManager] 恢复嵌入关系: ${newEmbeddedId} -> ${newContainerId}`);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('[ClipboardManager] 恢复嵌入关系失败:', error);
    }
  }

  /**
   * 从节点数据获取节点类型
   */
  getNodeTypeFromData(nodeData) {
    if (nodeData.type === 'standard.Rectangle') {
      const label = nodeData.attributes.label ? nodeData.attributes.label.text : '';
      if (label === 'Group Setting') return NODE_TYPES.GROUP_SETTING;
      if (nodeData.isContainer) return NODE_TYPES.CONTAINER;
      return NODE_TYPES.PROCESS;
    } else if (nodeData.type === 'standard.Polygon') {
      return nodeData.isSwitch ? NODE_TYPES.SWITCH : NODE_TYPES.DECISION;
    }
    return NODE_TYPES.PROCESS;
  }

  /**
   * 清空剪贴板
   */
  clear() {
    this.clipboard = [];
    this.pasteCount = 0;
    console.log('[ClipboardManager] 剪贴板已清空');
  }

  /**
   * 检查剪贴板是否为空
   */
  isEmpty() {
    return this.clipboard.length === 0;
  }

  /**
   * 获取剪贴板状态
   */
  getStatus() {
    return {
      isEmpty: this.isEmpty(),
      nodeCount: this.clipboard.length,
      pasteCount: this.pasteCount
    };
  }
}

// 导出类到全局作用域
if (typeof window !== 'undefined') {
  window.ClipboardManager = ClipboardManager;
} else if (typeof global !== 'undefined') {
  global.ClipboardManager = ClipboardManager;
}
